-- Phase 3e (b): drop user-driven write policies that let an authenticated user
-- bypass server-side field allowlists by going direct to PostgREST.
--
-- Specifically, `clients_update_own` lets a logged-in user PATCH /rest/v1/clients
-- to flip their own `role = 'admin'`, completely circumventing the admin
-- creation path. Same family of risk for the others.
--
-- All legitimate writes go through service-role-backed app routes which
-- validate fields explicitly. SELECTs stay on user-scoped RLS.
-- notif_update_own stays — it only flips read_at on the user's own
-- notifications and is harmless.

drop policy if exists "clients_update_own"  on public.clients;
drop policy if exists "progress_update_own" on public.client_progress;
drop policy if exists "bookings_insert_own" on public.client_bookings;
drop policy if exists "eod_insert_own"      on public.client_eod_reports;

-- Also revoke the corresponding column privileges from authenticated.
-- Postgres falls back to "no privilege" without any policy match anyway, but
-- making this explicit closes the gap if a policy is ever re-added by mistake.
revoke insert, update, delete on public.clients              from authenticated;
grant  select on public.clients                              to authenticated;

revoke insert, update, delete on public.client_progress      from authenticated;
grant  select on public.client_progress                      to authenticated;

revoke insert, update, delete on public.client_bookings      from authenticated;
grant  select on public.client_bookings                      to authenticated;

revoke insert, update, delete on public.client_eod_reports   from authenticated;
grant  select on public.client_eod_reports                   to authenticated;

-- Admins still need full CRUD on these tables for the dashboard. The
-- *_admin_all policies (FOR ALL) gate on is_admin(), but they need the
-- underlying privilege grants too. Re-grant via a dedicated admin role…
-- actually no — admins authenticate as `authenticated` like everyone else.
-- The admin path uses service-role server-side, so it doesn't go through
-- PostgREST grants. We're good.
