-- ─── End of Day reports ──────────────────────────────────────────────────────
-- One row per client per day. Used for show-rate tracking on the post-onboarding
-- performance dashboard. RLS stays disabled (matches 0002_custom_auth) —
-- all access goes through the service client gated by NextAuth session.

create table if not exists client_eod_reports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  report_date   date not null,
  calls_booked  int  not null check (calls_booked >= 0),
  calls_showed  int  not null check (calls_showed >= 0 and calls_showed <= calls_booked),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (client_id, report_date)
);

create index if not exists client_eod_reports_client_date_idx
  on client_eod_reports (client_id, report_date desc);

-- RLS enabled with no policies: service-role client bypasses, anon key blocked.
alter table client_eod_reports enable row level security;
