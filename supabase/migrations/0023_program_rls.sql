-- RLS for programs, and program-scoping of module/step reads.
--
-- `modules_read_auth` and `steps_read_auth` (0014) are `using (true)`: today any
-- authenticated client can enumerate every module and step over PostgREST
-- regardless of what the UI renders. Once programs exist that is exactly the
-- leak the feature is meant to close, so the predicate moves to the database
-- rather than living only in the React layer.
--
-- Admins keep full visibility via private.is_admin(); all admin content editing
-- goes through the service-role client anyway, which bypasses RLS entirely.
--
-- The coalesce() to the default program is the safety net: a client whose
-- program_id is somehow null sees the legacy `core` journey rather than a blank
-- portal. It mirrors the same fallback in unlock_next_steps() (0022).
--
-- Run AFTER 0021, otherwise the backfill hasn't happened and every client's
-- module list evaluates to empty.

begin;

-- ─── programs ─────────────────────────────────────────────────────────────────

alter table public.programs enable row level security;

-- Clients read program rows so the portal can show which program they're on.
-- Programs carry no sensitive data — name, slug, description.
drop policy if exists "programs_read_auth" on public.programs;
create policy "programs_read_auth" on public.programs
  for select to authenticated using (true);

drop policy if exists "programs_admin_all" on public.programs;
create policy "programs_admin_all" on public.programs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ─── module_programs ──────────────────────────────────────────────────────────

alter table public.module_programs enable row level security;

-- A client may only see join rows for their own program. getJourneyState()
-- embeds this table, so it must be readable — but only for their own program,
-- or the row itself would reveal which modules exist in other programs.
drop policy if exists "module_programs_read_own" on public.module_programs;
create policy "module_programs_read_own" on public.module_programs
  for select to authenticated using (
    program_id = coalesce(
      (select c.program_id from public.clients c where c.id = private.current_client_id()),
      (select p.id from public.programs p where p.is_default limit 1)
    )
  );

drop policy if exists "module_programs_admin_all" on public.module_programs;
create policy "module_programs_admin_all" on public.module_programs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ─── modules / steps: replace the `using (true)` reads ────────────────────────

drop policy if exists "modules_read_auth" on public.modules;
create policy "modules_read_auth" on public.modules
  for select to authenticated using (
    private.is_admin() or exists (
      select 1
      from public.module_programs mp
      where mp.module_id = modules.id
        and mp.program_id = coalesce(
          (select c.program_id from public.clients c where c.id = private.current_client_id()),
          (select p.id from public.programs p where p.is_default limit 1)
        )
    )
  );

drop policy if exists "steps_read_auth" on public.steps;
create policy "steps_read_auth" on public.steps
  for select to authenticated using (
    private.is_admin() or exists (
      select 1
      from public.module_programs mp
      where mp.module_id = steps.module_id
        and mp.program_id = coalesce(
          (select c.program_id from public.clients c where c.id = private.current_client_id()),
          (select p.id from public.programs p where p.is_default limit 1)
        )
    )
  );

-- ─── grants ───────────────────────────────────────────────────────────────────
-- RLS is inert without table-level grants — see 0015. Read-only for clients;
-- every write goes through the service-role client in lib/admin/*.

grant select on public.programs        to authenticated;
grant select on public.module_programs to authenticated;

commit;

-- Post-run check — as an ordinary client JWT, these must return only that
-- client's program's rows; as service-role, everything:
--
--   select count(*) from public.modules;
--   select count(*) from public.module_programs;
