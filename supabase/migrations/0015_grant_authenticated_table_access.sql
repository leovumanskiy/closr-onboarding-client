-- RLS policies in 0014 were inert because the `authenticated` role had no
-- table-level privileges on the public schema. Grant the standard CRUD set;
-- RLS then narrows access row-by-row.

grant select on public.clients              to authenticated;
grant update on public.clients              to authenticated;
grant select on public.modules              to authenticated;
grant select on public.steps                to authenticated;
grant select, update on public.client_progress     to authenticated;
grant select, insert on public.client_bookings     to authenticated;
grant select, insert on public.client_eod_reports  to authenticated;
grant select, update on public.notifications       to authenticated;
grant select on public.reminder_log          to authenticated;
grant select on public.audit_log             to authenticated;

-- Admin paths need full CRUD on reference data + clients themselves; the
-- *_admin_all policies already gate behaviour on is_admin().
grant insert, update, delete on public.clients to authenticated;
grant insert, update, delete on public.modules to authenticated;
grant insert, update, delete on public.steps   to authenticated;
grant insert, update, delete on public.client_progress to authenticated;

-- authenticated needs USAGE on the public schema for any of these to work.
grant usage on schema public to authenticated;
