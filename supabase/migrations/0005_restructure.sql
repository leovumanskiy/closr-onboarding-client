-- ─── New step types ───────────────────────────────────────────────────────────
alter type step_type add value if not exists 'video_document';
alter type step_type add value if not exists 'iframe';

-- ─── Slack channel per client ─────────────────────────────────────────────────
alter table clients add column if not exists slack_channel_id text;

-- ─── Module-level reminder tracking ──────────────────────────────────────────
-- Make step_id nullable so we can log module-scoped reminders
alter table reminder_log alter column step_id drop not null;
alter table reminder_log add column if not exists module_id uuid references modules(id) on delete cascade;

-- ─── Module 1 restructure ────────────────────────────────────────────────────
-- Delete all old Module 1 steps (cascades client_progress)
delete from steps
where module_id = (select id from modules where slug = 'onboarding');

-- Insert new Module 1 steps
insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(
  (select id from modules where slug = 'onboarding'),
  'welcome-video', 1, 'Welcome & Start Here', 'video',
  '{"url": "https://www.loom.com/embed/placeholder-welcome", "min_watch_seconds": 60}'::jsonb,
  48
),
(
  (select id from modules where slug = 'onboarding'),
  'expectations-intro', 2, 'Expectations & Commitments', 'video_document',
  '{"video_url": "https://www.loom.com/embed/placeholder-expectations", "doc_url": "/docs/expectations.pdf", "doc_label": "Expectations & Commitments Document", "doc_require_ack": true}'::jsonb,
  48
),
(
  (select id from modules where slug = 'onboarding'),
  'process-intro', 3, 'Our Process & What to Expect', 'video_document',
  '{"video_url": "https://www.loom.com/embed/placeholder-process", "doc_url": "/docs/agency-overview.pdf", "doc_label": "Agency Overview Document", "doc_require_ack": true}'::jsonb,
  72
),
(
  (select id from modules where slug = 'onboarding'),
  'access-form', 4, 'GHL & Facebook Access', 'iframe',
  '{"url": "https://app.gohighlevel.com/form/placeholder-access", "height": 700, "instructions": "Please complete the form below to grant us access to your GoHighLevel account and Facebook Business Manager."}'::jsonb,
  72
),
(
  (select id from modules where slug = 'onboarding'),
  'a2p-form', 5, 'A2P Registration Form', 'iframe',
  '{"url": "https://app.gohighlevel.com/form/placeholder-a2p", "height": 700, "instructions": "Complete the A2P (Application-to-Person) SMS registration form below. This is required for SMS compliance."}'::jsonb,
  72
),
(
  (select id from modules where slug = 'onboarding'),
  'brand-assets', 6, 'Brand Assets Upload', 'upload',
  '{"label": "Upload your brand assets — logo, images, fonts, brand guidelines", "accept": "image/*,video/*,.pdf,.zip,.ai,.eps,.svg", "min_files": 1, "max_files": 30, "max_size_mb": 100, "instructions": "Share your Google Drive folder or upload directly: logo (all formats), brand colours, fonts, any existing creative assets."}'::jsonb,
  96
),
(
  (select id from modules where slug = 'onboarding'),
  'referral-step', 7, 'Referral Program', 'video',
  '{"url": "https://www.loom.com/embed/placeholder-referral", "min_watch_seconds": 60}'::jsonb,
  48
)
on conflict (module_id, slug) do nothing;

-- ─── Module 2: remove sales-call-analysis, reorder remaining steps ────────────
delete from steps
where module_id = (select id from modules where slug = 'offer-creation')
  and slug = 'sales-call-analysis';

update steps set order_index = 1 where module_id = (select id from modules where slug = 'offer-creation') and slug = 'expectations-video';
update steps set order_index = 2 where module_id = (select id from modules where slug = 'offer-creation') and slug = 'offer-sop';

-- ─── Module 8: add GHL connection as first step ───────────────────────────────
update steps
set order_index = order_index + 1
where module_id = (select id from modules where slug = 'dashboard');

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(
  (select id from modules where slug = 'dashboard'),
  'ghl-connect', 1, 'Connect GoHighLevel', 'conditional',
  '{"question": {"field": "has_ghl", "label": "Do you have GoHighLevel?"}, "branches": [{"when": {"has_ghl": true}, "content": {"heading": "Connect Your GHL Account", "description": "Enter your GHL account details so we can connect your performance data.", "fields": [{"name": "ghl_account_url", "label": "GHL Account URL", "type": "url", "required": true}, {"name": "ghl_sub_account", "label": "Sub-Account ID", "type": "text", "required": true}]}}, {"when": {"has_ghl": false}, "content": {"heading": "GHL Setup Coming Soon", "description": "We will set up GoHighLevel for you as part of your system setup. No action needed here.", "fields": []}}]}'::jsonb,
  72
)
on conflict (module_id, slug) do nothing;
