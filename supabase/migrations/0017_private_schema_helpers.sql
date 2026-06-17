-- Move RLS helper functions from `public` (PostgREST-exposed) into a new
-- `private` schema so they can't be called via /rest/v1/rpc/. Each function
-- only returns info about the caller, so this isn't closing a data leak —
-- it's defense in depth + silences the security advisor WARN and keeps
-- internal plumbing out of the project's public API surface.

begin;

create schema if not exists private;
revoke all   on schema private from public;
grant  usage on schema private to authenticated, service_role;

alter function public.is_admin()           set schema private;
alter function public.current_client_id()  set schema private;

revoke execute on function private.is_admin()          from public, anon;
revoke execute on function private.current_client_id() from public, anon;
grant  execute on function private.is_admin()          to authenticated;
grant  execute on function private.current_client_id() to authenticated;

-- Recreate every policy that referenced the unqualified names so they
-- resolve under the new schema.

drop policy if exists "clients_admin_all" on public.clients;
create policy "clients_admin_all" on public.clients
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "modules_admin_all" on public.modules;
create policy "modules_admin_all" on public.modules
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "steps_admin_all" on public.steps;
create policy "steps_admin_all" on public.steps
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "progress_select_own" on public.client_progress;
create policy "progress_select_own" on public.client_progress
  for select to authenticated using (client_id = private.current_client_id());

drop policy if exists "progress_admin_all" on public.client_progress;
create policy "progress_admin_all" on public.client_progress
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "bookings_select_own" on public.client_bookings;
create policy "bookings_select_own" on public.client_bookings
  for select to authenticated using (client_id = private.current_client_id());

drop policy if exists "bookings_admin_all" on public.client_bookings;
create policy "bookings_admin_all" on public.client_bookings
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "eod_select_own" on public.client_eod_reports;
create policy "eod_select_own" on public.client_eod_reports
  for select to authenticated using (client_id = private.current_client_id());

drop policy if exists "eod_admin_all" on public.client_eod_reports;
create policy "eod_admin_all" on public.client_eod_reports
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select to authenticated using (user_id = private.current_client_id());

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update to authenticated using (user_id = private.current_client_id())
                              with check (user_id = private.current_client_id());

drop policy if exists "notif_admin_select" on public.notifications;
create policy "notif_admin_select" on public.notifications
  for select to authenticated using (private.is_admin());

drop policy if exists "reminder_admin_read" on public.reminder_log;
create policy "reminder_admin_read" on public.reminder_log
  for select to authenticated using (private.is_admin());

drop policy if exists "audit_admin_read" on public.audit_log;
create policy "audit_admin_read" on public.audit_log
  for select to authenticated using (private.is_admin());

commit;
