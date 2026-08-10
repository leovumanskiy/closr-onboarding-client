-- Rollback for 0022. Restores the pre-programs definition of unlock_next_steps()
-- verbatim from 0001_init.sql, with 0012's search_path pin and revocations
-- re-applied.
--
-- Safe to run while the programs tables still exist — this function simply stops
-- consulting them and reverts to global module ordering. Only run this if the
-- app has also been rolled back to a build whose getJourneyState() is unfiltered,
-- otherwise clients on a non-default program will be advanced against the global
-- module order.

begin;

create or replace function public.unlock_next_steps(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_completed_step  steps%rowtype;
  v_next_step       steps%rowtype;
  v_current_module  modules%rowtype;
  v_next_module     modules%rowtype;
  v_all_done        boolean;
  v_progress_row    client_progress%rowtype;
begin
  -- Find all steps in modules where client has completed all steps
  -- For each module, check if all steps are completed
  for v_current_module in
    select distinct m.*
    from modules m
    join steps s on s.module_id = m.id
    join client_progress cp on cp.step_id = s.id
    where cp.client_id = p_client_id and cp.status = 'completed'
  loop
    -- Check if all steps in this module are completed
    select bool_and(cp.status = 'completed') into v_all_done
    from steps s
    join client_progress cp on cp.step_id = s.id and cp.client_id = p_client_id
    where s.module_id = v_current_module.id;

    if v_all_done then
      -- Find next module
      select * into v_next_module
      from modules
      where order_index = v_current_module.order_index + 1
      limit 1;

      if found then
        -- Unlock first step of next module
        select * into v_next_step
        from steps
        where module_id = v_next_module.id
        order by order_index
        limit 1;

        if found then
          -- Only unlock if currently locked (idempotent)
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';

          -- Update client current_module_id
          update clients
          set current_module_id = v_next_module.id
          where id = p_client_id
            and (current_module_id = v_current_module.id or current_module_id is null);
        end if;
      end if;
    else
      -- Within module: unlock next step after each completed one
      for v_completed_step in
        select s.*
        from steps s
        join client_progress cp on cp.step_id = s.id
        where s.module_id = v_current_module.id
          and cp.client_id = p_client_id
          and cp.status = 'completed'
        order by s.order_index
      loop
        select * into v_next_step
        from steps
        where module_id = v_current_module.id
          and order_index = v_completed_step.order_index + 1
        limit 1;

        if found then
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.unlock_next_steps(uuid) from public;
revoke execute on function public.unlock_next_steps(uuid) from anon;
revoke execute on function public.unlock_next_steps(uuid) from authenticated;

commit;
