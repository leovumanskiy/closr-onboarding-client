-- ─── 0014_supabase_auth.sql ──────────────────────────────────────────────────
-- Phase 1: link clients to auth.users (nullable), add RLS policies.
-- App still uses service_role which bypasses RLS, so this is non-breaking.

begin;

-- ─── A. Link clients ↔ auth.users ────────────────────────────────────────────
alter table public.clients
  add column if not exists user_id uuid unique
  references auth.users(id) on delete set null;

create index if not exists clients_user_id_idx on public.clients(user_id);

-- ─── B. Helper functions ─────────────────────────────────────────────────────
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.clients where user_id = auth.uid() limit 1),
    false
  );
$$;

revoke execute on function public.current_client_id() from public, anon;
revoke execute on function public.is_admin()         from public, anon;
grant  execute on function public.current_client_id() to authenticated;
grant  execute on function public.is_admin()         to authenticated;

-- ─── C. Email hygiene (before any Phase 2 import) ────────────────────────────
update public.clients set email = lower(trim(email)) where email <> lower(trim(email));

-- ─── D. RLS policies ─────────────────────────────────────────────────────────
-- RLS is already enabled on all 10 tables. service_role bypasses RLS implicitly.

-- clients
create policy "clients_select_own"   on public.clients
  for select to authenticated using (user_id = auth.uid());
create policy "clients_update_own"   on public.clients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clients_admin_all"    on public.clients
  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- modules (reference data)
create policy "modules_read_auth"    on public.modules
  for select to authenticated using (true);
create policy "modules_admin_all"    on public.modules
  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- steps (reference data)
create policy "steps_read_auth"      on public.steps
  for select to authenticated using (true);
create policy "steps_admin_all"      on public.steps
  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- client_progress
create policy "progress_select_own"  on public.client_progress
  for select to authenticated using (client_id = public.current_client_id());
create policy "progress_update_own"  on public.client_progress
  for update to authenticated using (client_id = public.current_client_id())
                                with check (client_id = public.current_client_id());
create policy "progress_admin_all"   on public.client_progress
  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- client_bookings
create policy "bookings_select_own"  on public.client_bookings
  for select to authenticated using (client_id = public.current_client_id());
create policy "bookings_insert_own"  on public.client_bookings
  for insert to authenticated with check (client_id = public.current_client_id());
create policy "bookings_admin_all"   on public.client_bookings
  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- client_eod_reports
create policy "eod_select_own"       on public.client_eod_reports
  for select to authenticated using (client_id = public.current_client_id());
create policy "eod_insert_own"       on public.client_eod_reports
  for insert to authenticated with check (client_id = public.current_client_id());
create policy "eod_admin_all"        on public.client_eod_reports
  for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- notifications (notifications.user_id FK references public.clients.id)
create policy "notif_select_own"     on public.notifications
  for select to authenticated using (user_id = public.current_client_id());
create policy "notif_update_own"     on public.notifications
  for update to authenticated using (user_id = public.current_client_id())
                                with check (user_id = public.current_client_id());
create policy "notif_admin_select"   on public.notifications
  for select to authenticated using (public.is_admin());

-- reminder_log (admin read only; inserts via service_role)
create policy "reminder_admin_read"  on public.reminder_log
  for select to authenticated using (public.is_admin());

-- audit_log (admin read only; inserts via service_role)
create policy "audit_admin_read"     on public.audit_log
  for select to authenticated using (public.is_admin());

-- login_attempts: no policies. service_role only (pre-auth throttle).

-- ─── E. Storage policies on client-assets ────────────────────────────────────
-- Paths are stored as {clients.id}/{...}. Extract the first folder segment.

create policy "storage_clients_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy "storage_clients_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy "storage_clients_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  ) with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy "storage_clients_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.current_client_id()::text
  );

create policy "storage_admin_all" on storage.objects
  for all to authenticated
  using      (bucket_id = 'client-assets' and public.is_admin())
  with check (bucket_id = 'client-assets' and public.is_admin());

commit;
