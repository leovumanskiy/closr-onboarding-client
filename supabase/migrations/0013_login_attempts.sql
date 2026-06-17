-- Issue #5 (2026-05-15 audit): durable login throttle.
-- In-memory rate limiting doesn't work on Vercel serverless (per-instance),
-- so failed attempts are tracked in the DB. Applied via Supabase MCP.

create table if not exists public.login_attempts (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists login_attempts_email_time_idx
  on public.login_attempts (email, attempted_at desc);

-- Consistent with the rest of the schema: RLS on, no policy → only the
-- service-role client (used by auth.ts) can touch it.
alter table public.login_attempts enable row level security;
