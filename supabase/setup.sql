-- ============================================================================
-- Client Portal — Full Setup
-- ============================================================================
-- One-shot SQL for a fresh Supabase project. Schema + functions + storage +
-- modules/steps seed. RLS is disabled everywhere; the app authorises via the
-- service-role key and the NextAuth session.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (mostly idempotent — uses IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type client_status     as enum ('active', 'paused', 'completed', 'churned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type step_type         as enum ('video', 'document', 'form', 'upload', 'booking', 'conditional', 'external', 'dashboard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type step_status       as enum ('locked', 'available', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('step_completed', 'module_unlocked', 'reminder', 'stuck_alert', 'file_uploaded', 'system');
exception when duplicate_object then null; end $$;

-- ─── Clients (auth-bearing table) ────────────────────────────────────────────
-- Each row is a portal user. NextAuth's CredentialsProvider authorises against
-- this table (auth.ts → authorize → select from clients). `id` is the session
-- subject id, used as user_id in notifications and actor_id in audit_log.
create table if not exists clients (
  id                uuid primary key default gen_random_uuid(),
  username          text unique,
  password_hash     text,
  role              text not null default 'client' check (role in ('client','admin')),
  display_name      text,
  email             text,
  company_name      text not null,
  has_ghl           boolean not null default false,
  has_fb_ads        boolean not null default false,
  status            client_status not null default 'active',
  current_module_id uuid,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- After backfilling existing rows you can tighten these:
-- alter table clients alter column username      set not null;
-- alter table clients alter column password_hash set not null;

alter table clients disable row level security;

-- ─── Modules ─────────────────────────────────────────────────────────────────
create table if not exists modules (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  order_index  int not null,
  title        text not null,
  description  text,
  unlock_rule  text not null default 'previous_complete',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table modules disable row level security;

-- Add FK now that modules exists
alter table clients
  add constraint if not exists clients_current_module_id_fkey
  foreign key (current_module_id) references modules(id) on delete set null;

-- ─── Steps ───────────────────────────────────────────────────────────────────
create table if not exists steps (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references modules(id) on delete cascade,
  slug        text not null,
  order_index int not null,
  title       text not null,
  type        step_type not null,
  config      jsonb not null default '{}',
  sla_hours   int not null default 72,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (module_id, slug)
);
alter table steps disable row level security;

-- ─── Client Progress ─────────────────────────────────────────────────────────
create table if not exists client_progress (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  step_id      uuid not null references steps(id) on delete cascade,
  status       step_status not null default 'locked',
  started_at   timestamptz,
  completed_at timestamptz,
  due_at       timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (client_id, step_id)
);
alter table client_progress disable row level security;

-- ─── Form Submissions ────────────────────────────────────────────────────────
create table if not exists client_form_submissions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  step_id      uuid not null references steps(id) on delete cascade,
  payload      jsonb not null,
  submitted_at timestamptz not null default now()
);
alter table client_form_submissions disable row level security;

-- ─── Uploads ─────────────────────────────────────────────────────────────────
create table if not exists client_uploads (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  step_id     uuid not null references steps(id) on delete cascade,
  file_path   text not null,
  file_name   text not null,
  size        bigint not null,
  mime        text not null,
  uploaded_at timestamptz not null default now()
);
alter table client_uploads disable row level security;

-- ─── Bookings ────────────────────────────────────────────────────────────────
create table if not exists client_bookings (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  step_id        uuid not null references steps(id) on delete cascade,
  scheduled_for  timestamptz,
  provider       text not null default 'calendly',
  external_id    text,
  notes          text,
  created_at     timestamptz not null default now()
);
alter table client_bookings disable row level security;

-- ─── Notifications ───────────────────────────────────────────────────────────
-- user_id references clients.id (the session subject)
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references clients(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text not null,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table notifications disable row level security;

-- ─── Reminder Log ────────────────────────────────────────────────────────────
create table if not exists reminder_log (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  step_id    uuid not null references steps(id) on delete cascade,
  kind       text not null,
  sent_at    timestamptz not null default now()
);
alter table reminder_log disable row level security;

-- ─── Audit Log ───────────────────────────────────────────────────────────────
-- actor_id references clients.id (NULL allowed for system/cron actions)
create table if not exists audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references clients(id),
  action        text not null,
  subject_table text not null,
  subject_id    text not null,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
alter table audit_log disable row level security;

-- ─── Updated_at trigger function ─────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_updated_at  on clients;
drop trigger if exists modules_updated_at  on modules;
drop trigger if exists steps_updated_at    on steps;
drop trigger if exists progress_updated_at on client_progress;

create trigger clients_updated_at  before update on clients         for each row execute function set_updated_at();
create trigger modules_updated_at  before update on modules         for each row execute function set_updated_at();
create trigger steps_updated_at    before update on steps           for each row execute function set_updated_at();
create trigger progress_updated_at before update on client_progress for each row execute function set_updated_at();

-- ─── unlock_next_steps ───────────────────────────────────────────────────────
-- Called by the journey engine after a step is completed. Unlocks the next
-- step in the same module, or the first step of the next module if the
-- current module is fully complete.
create or replace function unlock_next_steps(p_client_id uuid)
returns void language plpgsql security definer as $$
declare
  v_completed_step  steps%rowtype;
  v_next_step       steps%rowtype;
  v_current_module  modules%rowtype;
  v_next_module     modules%rowtype;
  v_all_done        boolean;
begin
  for v_current_module in
    select distinct m.*
    from modules m
    join steps s on s.module_id = m.id
    join client_progress cp on cp.step_id = s.id
    where cp.client_id = p_client_id and cp.status = 'completed'
  loop
    select bool_and(cp.status = 'completed') into v_all_done
    from steps s
    join client_progress cp on cp.step_id = s.id and cp.client_id = p_client_id
    where s.module_id = v_current_module.id;

    if v_all_done then
      select * into v_next_module
      from modules
      where order_index = v_current_module.order_index + 1
      limit 1;

      if found then
        select * into v_next_step
        from steps
        where module_id = v_next_module.id
        order by order_index
        limit 1;

        if found then
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';

          update clients
          set current_module_id = v_next_module.id
          where id = p_client_id
            and (current_module_id = v_current_module.id or current_module_id is null);
        end if;
      end if;
    else
      for v_completed_step in
        select s.*
        from steps s
        join client_progress cp on cp.step_id = s.id
        where s.module_id = v_current_module.id
          and cp.client_id = p_client_id
          and cp.status = 'completed'
        order by s.order_index
      loop
        select * into v_next_step
        from steps
        where module_id = v_current_module.id
          and order_index = v_completed_step.order_index + 1
        limit 1;

        if found then
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- ─── Storage bucket ──────────────────────────────────────────────────────────
-- Private bucket for client uploads. App reads/writes via service-role key.
insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do nothing;

-- ============================================================================
-- SEED — 8 Modules + Steps
-- ============================================================================
-- Idempotent: re-runs add nothing (on conflict do nothing).

do $$
declare
  m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  m5 uuid; m6 uuid; m7 uuid; m8 uuid;
begin

-- ── Module 1: Onboarding ─────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'onboarding', 1, 'Onboarding', 'Get set up and share your business assets.')
on conflict (slug) do nothing;
select id into m1 from modules where slug = 'onboarding';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m1, 'welcome-video',       1, 'Welcome & Start Here',        'video',
  '{"url": "https://www.loom.com/embed/placeholder-welcome", "min_watch_seconds": 60}',
  48),
(m1, 'expectations-doc',    2, 'Expectations & Commitments',  'document',
  '{"url": "/docs/expectations.pdf", "require_ack": true}',
  48),
(m1, 'agency-audit-form',   3, 'Agency Audit Form',           'form',
  '{"fields": [{"name": "agency_name", "label": "Agency Name", "type": "text", "required": true}, {"name": "monthly_revenue", "label": "Current Monthly Revenue", "type": "select", "options": ["<$5k", "$5k–$15k", "$15k–$50k", "$50k+"], "required": true}, {"name": "team_size", "label": "Team Size", "type": "number", "required": true}, {"name": "main_challenge", "label": "Biggest Challenge Right Now", "type": "textarea", "required": true}]}',
  72),
(m1, 'onboarding-form',     4, 'Onboarding Questionnaire',    'conditional',
  '{"question": {"field": "has_ghl", "label": "Do you have GoHighLevel?"}, "branches": [{"when": {"has_ghl": true}, "content": {"heading": "GHL Path", "description": "Great! Complete your GHL setup below.", "fields": [{"name": "ghl_account_url", "label": "GHL Account URL", "type": "url", "required": true}, {"name": "ghl_sub_account", "label": "Sub-Account ID", "type": "text", "required": true}]}}, {"when": {"has_ghl": false}, "content": {"heading": "No GHL — Setup Guide", "description": "No worries! We will set up GoHighLevel for you.", "fields": [{"name": "preferred_crm", "label": "Current CRM (if any)", "type": "text", "required": false}]}}]}',
  72),
(m1, 'atp-form',            5, 'ATP Form Submission',         'form',
  '{"submitTo": "internal", "fields": [{"name": "goals_90_days", "label": "90-Day Goals", "type": "textarea", "required": true}, {"name": "ideal_client", "label": "Ideal Client Profile", "type": "textarea", "required": true}, {"name": "usp", "label": "Unique Selling Proposition", "type": "textarea", "required": true}, {"name": "existing_assets", "label": "Existing Marketing Assets", "type": "textarea", "required": false}]}',
  72),
(m1, 'asset-upload',        6, 'Upload Your Assets',          'upload',
  '{"label": "Upload logo, testimonials, brand assets", "accept": "image/*,video/*,.pdf,.zip", "min_files": 1, "max_files": 20, "max_size_mb": 50}',
  96),
(m1, 'referral-step',       7, 'Referral & Incentive Program','document',
  '{"url": "/docs/referral-program.pdf", "require_ack": true, "cta_label": "I understand the referral program"}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 2: Offer Creation ─────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'offer-creation', 2, 'Offer Creation', 'Review your sales call analysis and define your core offer.')
on conflict (slug) do nothing;
select id into m2 from modules where slug = 'offer-creation';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m2, 'sales-call-analysis',  1, 'Sales Call Analysis',        'external',
  '{"provider": "ghl", "label": "Your sales call data has been analysed. Review your key insights below.", "metric": "sales_call_summary"}',
  48),
(m2, 'expectations-video',   2, 'Offer Expectations Video',   'video',
  '{"url": "https://www.loom.com/embed/placeholder-offer-expectations", "min_watch_seconds": 120}',
  48),
(m2, 'offer-sop',            3, 'Offer Creation SOP',         'document',
  '{"url": "/docs/offer-creation-sop.pdf", "require_ack": true}',
  72)
on conflict (module_id, slug) do nothing;

-- ── Module 3: Copywriting ────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'copywriting', 3, 'Copywriting', 'Submit your intake and book your copy call.')
on conflict (slug) do nothing;
select id into m3 from modules where slug = 'copywriting';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m3, 'copy-intake-form',     1, 'Copywriting Intake Form',    'form',
  '{"submitTo": "copywriter", "fields": [{"name": "offer_name", "label": "Offer Name", "type": "text", "required": true}, {"name": "target_audience", "label": "Target Audience", "type": "textarea", "required": true}, {"name": "pain_points", "label": "Top 3 Pain Points", "type": "textarea", "required": true}, {"name": "desired_outcome", "label": "Desired Outcome for Client", "type": "textarea", "required": true}, {"name": "tone", "label": "Brand Tone", "type": "select", "options": ["Professional", "Conversational", "Bold", "Empathetic"], "required": true}]}',
  72),
(m3, 'book-copy-call',       2, 'Book Your Copy Call',        'booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "copy_review", "duration_min": 60, "description": "30-min strategy call with your copywriter."}',
  72),
(m3, 'copy-sop',             3, 'Copywriting SOP & Expectations', 'video',
  '{"url": "https://www.loom.com/embed/placeholder-copy-sop", "min_watch_seconds": 90}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 4: Ads Mastery ────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'ads-mastery', 4, 'Ads Mastery', 'Learn the ad system and book your ads strategy call.')
on conflict (slug) do nothing;
select id into m4 from modules where slug = 'ads-mastery';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m4, 'ads-sop',              1, 'Ads Mastery SOP',            'document',
  '{"url": "/docs/ads-mastery-sop.pdf", "require_ack": true}',
  72),
(m4, 'book-ads-call',        2, 'Book Your Ads Strategy Call','booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "ads_strategy", "duration_min": 60, "description": "60-min ads strategy session."}',
  72),
(m4, 'ads-expectations',     3, 'Ads Expectations Video',     'video',
  '{"url": "https://www.loom.com/embed/placeholder-ads-expectations", "min_watch_seconds": 120}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 5: System Setup ───────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'system-setup', 5, 'System Setup', 'Submit your assets and connect your tech stack.')
on conflict (slug) do nothing;
select id into m5 from modules where slug = 'system-setup';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m5, 'submit-setup-assets',  1, 'Submit Setup Assets',        'upload',
  '{"label": "Upload offer doc, scripts, and audit files", "accept": ".pdf,.doc,.docx,.txt,.zip", "min_files": 1, "max_files": 10, "max_size_mb": 25}',
  72),
(m5, 'connect-google-cal',   2, 'Connect Google Calendar',    'form',
  '{"fields": [{"name": "calendar_email", "label": "Google Calendar Email", "type": "email", "required": true}, {"name": "calendar_confirmed", "label": "I have shared my calendar", "type": "checkbox", "required": true}], "instructions": "Share your Google Calendar with our team email: team@youragency.com"}',
  72),
(m5, 'connect-domain',       3, 'Connect Your Domain',        'form',
  '{"fields": [{"name": "domain", "label": "Your Domain", "type": "url", "required": true}, {"name": "registrar", "label": "Domain Registrar", "type": "select", "options": ["GoDaddy", "Namecheap", "Cloudflare", "Google Domains", "Other"], "required": true}, {"name": "dns_access", "label": "I can access DNS settings", "type": "checkbox", "required": true}]}',
  72),
(m5, 'book-setup-call',      4, 'Book Your Setup Call',       'booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "system_setup", "duration_min": 90, "description": "90-min technical setup session."}',
  96),
(m5, 'setup-expectations',   5, 'Setup Expectations Video',   'video',
  '{"url": "https://www.loom.com/embed/placeholder-setup-expectations", "min_watch_seconds": 60}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 6: Launch ─────────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'launch', 6, 'Launch', 'Set up payments, record your ads, and launch.')
on conflict (slug) do nothing;
select id into m6 from modules where slug = 'launch';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m6, 'payment-setup',        1, 'Payment Setup Guide',        'document',
  '{"url": "/docs/payment-setup-guide.pdf", "require_ack": true}',
  48),
(m6, 'record-video-ads',     2, 'Record Your Video Ads',      'upload',
  '{"label": "Upload your recorded video ads", "accept": "video/*", "min_files": 1, "max_files": 5, "max_size_mb": 500, "reminder_days": [1, 2, 3, 4], "notify_team_on_upload": true, "instructions": "Record 3–5 short video ads following the script your copywriter provided. 30–90 seconds each. Upload here when done."}',
  96),
(m6, 'book-launch-call',     3, 'Book Your Launch Call',      'booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "launch", "duration_min": 60, "description": "Final review before going live."}',
  72),
(m6, 'kpi-expectations',     4, 'KPI & Expectations Video',   'video',
  '{"url": "https://www.loom.com/embed/placeholder-kpi-expectations", "min_watch_seconds": 180}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 7: Weekly Calls ───────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'weekly-calls', 7, 'Weekly Calls', 'Schedule your recurring strategy calls.')
on conflict (slug) do nothing;
select id into m7 from modules where slug = 'weekly-calls';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m7, 'schedule-recurring',   1, 'Schedule Recurring Calls',   'booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "weekly_strategy", "duration_min": 30, "description": "Book your weekly 30-min strategy call. This will repeat every week.", "recurring": true}',
  96),
(m7, 'weekly-expectations',  2, 'Weekly Calls Expectations',  'video',
  '{"url": "https://www.loom.com/embed/placeholder-weekly-expectations", "min_watch_seconds": 60}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 8: Dashboard ──────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'dashboard', 8, 'Performance Dashboard', 'Track your results and celebrate your progress.')
on conflict (slug) do nothing;
select id into m8 from modules where slug = 'dashboard';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m8, 'performance-dashboard',1, 'Performance Dashboard',      'dashboard',
  '{"source": "ghl", "metrics": ["leads", "appointments", "deals_closed", "revenue", "roas", "cpl"], "description": "Your live campaign performance data."}',
  0),
(m8, 'journey-recap',        2, 'Journey Recap & Next Steps', 'video',
  '{"url": "https://www.loom.com/embed/2b18744dd4244803a776f04e239407a1", "min_watch_seconds": 60}',
  0)
on conflict (module_id, slug) do nothing;

end $$;

-- ============================================================================
-- Done. Next steps:
--
-- 1) Create your first ADMIN user. Generate a bcrypt(cost=12) hash from your
--    machine, then insert:
--
--    -- in your terminal:
--    -- node -e "require('bcryptjs').hash('PASSWORD', 12).then(console.log)"
--
--    insert into clients (username, password_hash, role, display_name, company_name)
--    values ('admin', 'PASSWORD', 'admin', 'Site Admin', 'Internal');
--
-- 2) Once signed in as admin, create client accounts via the New Client form
--    (calls lib/admin/actions.ts → createClientUser, which bcrypts at cost 12).
-- ============================================================================
