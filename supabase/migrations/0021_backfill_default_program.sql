-- Backfill every existing module and client onto a default `core` program.
--
-- This is what keeps production behaviour identical: after 0020 + 0021 there is
-- exactly one program containing all 9 modules in their current order, and all
-- 26 clients are on it, so getJourneyState() returns exactly what it returns today.
--
-- Idempotent — safe to re-run. Only writes the new column and the new join table;
-- no existing column value is modified.

begin;

insert into public.programs (slug, name, description, is_default)
values (
  'core',
  'Core Onboarding',
  'Legacy single-track onboarding. Every module and client that existed before programs were introduced.',
  true
)
on conflict (slug) do nothing;

-- Every module joins `core`, preserving its current global position.
insert into public.module_programs (module_id, program_id, order_index)
select m.id, p.id, m.order_index
from public.modules m
cross join public.programs p
where p.slug = 'core'
on conflict (module_id, program_id) do nothing;

-- Every client without a program lands on `core`.
update public.clients c
set program_id = p.id
from public.programs p
where p.slug = 'core'
  and c.program_id is null;

commit;

-- Post-run sanity check (expect: modules_linked = total modules,
-- clients_unassigned = 0):
--
--   select
--     (select count(*) from public.modules)                                as modules_total,
--     (select count(*) from public.module_programs mp
--        join public.programs p on p.id = mp.program_id
--       where p.slug = 'core')                                             as modules_linked,
--     (select count(*) from public.clients where program_id is null)       as clients_unassigned;
