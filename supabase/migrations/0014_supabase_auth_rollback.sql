-- ─── 0014_supabase_auth_rollback.sql ─────────────────────────────────────────
-- Reverses 0014_supabase_auth.sql. Safe to run repeatedly.

begin;

-- Storage policies
drop policy if exists "storage_clients_select_own" on storage.objects;
drop policy if exists "storage_clients_insert_own" on storage.objects;
drop policy if exists "storage_clients_update_own" on storage.objects;
drop policy if exists "storage_clients_delete_own" on storage.objects;
drop policy if exists "storage_admin_all"          on storage.objects;

-- Public policies
drop policy if exists "clients_select_own"  on public.clients;
drop policy if exists "clients_update_own"  on public.clients;
drop policy if exists "clients_admin_all"   on public.clients;
drop policy if exists "modules_read_auth"   on public.modules;
drop policy if exists "modules_admin_all"   on public.modules;
drop policy if exists "steps_read_auth"     on public.steps;
drop policy if exists "steps_admin_all"     on public.steps;
drop policy if exists "progress_select_own" on public.client_progress;
drop policy if exists "progress_update_own" on public.client_progress;
drop policy if exists "progress_admin_all"  on public.client_progress;
drop policy if exists "bookings_select_own" on public.client_bookings;
drop policy if exists "bookings_insert_own" on public.client_bookings;
drop policy if exists "bookings_admin_all"  on public.client_bookings;
drop policy if exists "eod_select_own"      on public.client_eod_reports;
drop policy if exists "eod_insert_own"      on public.client_eod_reports;
drop policy if exists "eod_admin_all"       on public.client_eod_reports;
drop policy if exists "notif_select_own"    on public.notifications;
drop policy if exists "notif_update_own"    on public.notifications;
drop policy if exists "notif_admin_select"  on public.notifications;
drop policy if exists "reminder_admin_read" on public.reminder_log;
drop policy if exists "audit_admin_read"    on public.audit_log;

-- Functions
drop function if exists public.current_client_id();
drop function if exists public.is_admin();

-- Column
drop index if exists public.clients_user_id_idx;
alter table public.clients drop column if exists user_id;

commit;
