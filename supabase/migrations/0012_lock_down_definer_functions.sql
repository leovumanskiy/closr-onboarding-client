-- Security fix (2026-05-15 audit): anon-executable SECURITY DEFINER RPCs + mutable search_path
-- Applied to project aawxigaabeawvffptefq via Supabase MCP.

-- handle_new_user() inserts into `profiles`, which migration 0002 dropped, and its
-- auth.users trigger was also removed. Dead code — safe to drop entirely.
drop function if exists public.handle_new_user() cascade;

-- unlock_next_steps is only ever called by the app's server routes via the
-- service-role client. Remove the unauthenticated/authenticated REST RPC exposure
-- (was callable via POST /rest/v1/rpc/unlock_next_steps with the public anon key).
revoke execute on function public.unlock_next_steps(uuid) from public;
revoke execute on function public.unlock_next_steps(uuid) from anon;
revoke execute on function public.unlock_next_steps(uuid) from authenticated;

-- Pin search_path so the SECURITY DEFINER / trigger functions can't be hijacked
-- via a mutable search_path (advisor 0011_function_search_path_mutable).
alter function public.unlock_next_steps(uuid) set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = pg_catalog, pg_temp;
