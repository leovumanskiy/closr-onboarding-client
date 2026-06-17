-- 0019_drop_legacy_password_hash.sql
--
-- Removes the legacy NextAuth-era bcrypt column public.clients.password_hash.
-- Authentication now runs entirely through Supabase Auth (auth.users). The
-- RLS / Supabase-Auth branch is merged and deployed, satisfying the
-- precondition that migration 0018 explicitly deferred this drop on.
--
-- Verified against the live database before writing:
--   * 32/32 clients have user_id set -- all migrated, orphan risk = 0
--   * no view / function / trigger / policy / index / constraint references it
--
-- The hashes are archived into the `private` schema FIRST so the drop is
-- recoverable. `private` is not exposed via PostgREST, so the archived
-- credential material stays off the API. The migration runs in a single
-- transaction: if the drop fails, the archive is rolled back with it.
--
-- Once confident (recommended after ~30-60 days), delete the archive to
-- fully eliminate the credential material:
--   drop table private._archive_clients_password_hash;

create table if not exists private._archive_clients_password_hash as
  select id, email, password_hash, now() as archived_at
  from public.clients
  where password_hash is not null;

alter table public.clients drop column if exists password_hash;
