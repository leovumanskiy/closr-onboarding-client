-- Tighten authenticated-role SELECT on public.clients to a column allowlist.
-- Excludes `password_hash`, `notes`, `ghl_access_token`, `ghl_refresh_token`
-- so an authenticated client reading their own row via PostgREST cannot
-- pull admin commentary, encrypted credentials, or the legacy bcrypt hash.
--
-- Service-role bypasses these grants entirely; admin paths read everything
-- via service-role server-side.
--
-- Drops of `password_hash` and `login_attempts` are NOT in this migration —
-- they require the RLS-branch code (Supabase Auth) to be deployed first,
-- otherwise live NextAuth logins on main would break.

revoke select on public.clients from authenticated;

grant select (
  id, user_id, email, role, full_name, business_name, business_website,
  niche, has_ghl, has_fb_ads, status, current_module_id, start_date,
  image_url, slack_channel_id, slack_user_id, must_change_password,
  created_at, updated_at, ghl_location_id, ghl_token_expires_at
) on public.clients to authenticated;
