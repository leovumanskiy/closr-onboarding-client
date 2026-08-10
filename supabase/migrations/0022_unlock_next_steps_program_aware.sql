-- Make unlock_next_steps() program-aware.
--
-- WHY THIS IS REQUIRED, not optional:
-- The previous definition found the next module with `order_index = current + 1`
-- against the GLOBAL modules table. Once modules are split across programs, a DWY
-- client finishing DWY module 2 would try to unlock whatever module happens to sit
-- at global index 3 — possibly a DFY module, possibly nothing — and would be stuck
-- with no available step.
--
-- Changes:
--   1. Resolve the client's program, falling back to the default program when
--      clients.program_id is null, so nobody can end up with no journey.
--   2. Walk modules through module_programs for that program only, ordered by the
--      program's own order_index.
--   3. Pick "next" with `> order_index … limit 1` instead of `= order_index + 1`.
--      Also fixes a latent bug: a gap in the ordering (from a deleted or reordered
--      module) currently strands a client permanently.
--
-- With a single program present this is behaviourally identical to the old
-- function. Rollback: 0022_unlock_next_steps_program_aware_rollback.sql.

begin;

create or replace function public.unlock_next_steps(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_program_id      uuid;
  v_current         record;
  v_next_module_id  uuid;
  v_next_step       steps%rowtype;
  v_completed_step  steps%rowtype;
  v_all_done        boolean;
begin
  -- Which program's module list governs this client?
  select coalesce(c.program_id, (select p.id from programs p where p.is_default limit 1))
    into v_program_id
  from clients c
  where c.id = p_client_id;

  if v_program_id is null then
    return;
  end if;

  -- Every module in this client's program that has at least one completed step.
  for v_current in
    select distinct m.id as module_id, mp.order_index
    from modules m
    join module_programs mp
      on mp.module_id = m.id and mp.program_id = v_program_id
    join steps s on s.module_id = m.id
    join client_progress cp on cp.step_id = s.id
    where cp.client_id = p_client_id
      and cp.status = 'completed'
    order by mp.order_index
  loop
    select bool_and(cp.status = 'completed') into v_all_done
    from steps s
    join client_progress cp on cp.step_id = s.id and cp.client_id = p_client_id
    where s.module_id = v_current.module_id;

    if v_all_done then
      -- Next module within THIS program.
      select mp.module_id into v_next_module_id
      from module_programs mp
      where mp.program_id = v_program_id
        and mp.order_index > v_current.order_index
      order by mp.order_index
      limit 1;

      if v_next_module_id is not null then
        select * into v_next_step
        from steps
        where module_id = v_next_module_id
        order by order_index
        limit 1;

        if found then
          -- Only unlock if currently locked (idempotent).
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';

          update clients
          set current_module_id = v_next_module_id
          where id = p_client_id
            and (current_module_id = v_current.module_id or current_module_id is null);
        end if;
      end if;
    else
      -- Within module: unlock the next step after each completed one.
      for v_completed_step in
        select s.*
        from steps s
        join client_progress cp on cp.step_id = s.id
        where s.module_id = v_current.module_id
          and cp.client_id = p_client_id
          and cp.status = 'completed'
        order by s.order_index
      loop
        select * into v_next_step
        from steps
        where module_id = v_current.module_id
          and order_index > v_completed_step.order_index
        order by order_index
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

-- CREATE OR REPLACE preserves the existing ACL, but re-assert 0012's revocations
-- explicitly so this migration is correct even if replayed on a fresh database.
-- The function is only ever called through the service-role client
-- (lib/journey/engine.ts, lib/journey/actions.ts, lib/admin/actions.ts).
revoke execute on function public.unlock_next_steps(uuid) from public;
revoke execute on function public.unlock_next_steps(uuid) from anon;
revoke execute on function public.unlock_next_steps(uuid) from authenticated;

commit;
