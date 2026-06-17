-- ─── Seed: 8 Modules + Steps ─────────────────────────────────────────────────
-- Run after 0001_init.sql + all migrations. Safe to re-run (on conflict do nothing).

do $$
declare
  m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  m5 uuid; m6 uuid; m7 uuid; m8 uuid;
begin

-- ── Module 1: Onboarding ─────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'onboarding', 1, 'Onboarding', 'Get set up, share your assets, and hit the ground running.')
on conflict (slug) do nothing;
select id into m1 from modules where slug = 'onboarding';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m1, 'welcome-video',       1, 'Welcome & Start Here',           'video',
  '{"url": "https://www.loom.com/embed/placeholder-welcome", "min_watch_seconds": 60}',
  48),
(m1, 'expectations-intro',  2, 'Expectations & Commitments',     'video_document',
  '{"video_url": "https://www.loom.com/embed/placeholder-expectations", "doc_url": "/docs/expectations.pdf", "doc_label": "Expectations & Commitments Document", "doc_require_ack": true}',
  48),
(m1, 'process-intro',       3, 'Our Process & What to Expect',   'video_document',
  '{"video_url": "https://www.loom.com/embed/placeholder-process", "doc_url": "/docs/agency-overview.pdf", "doc_label": "Agency Overview Document", "doc_require_ack": true}',
  72),
(m1, 'agency-audit',        4, 'Agency Audit Sheet',             'iframe',
  '{"url": "https://forms.fillout.com/t/placeholder-agency-audit", "height": 800, "instructions": "Complete the Agency Audit Sheet so we have a full picture of your business before your kickoff calls."}',
  72),
(m1, 'access-form',         5, 'GHL & Facebook Access',          'iframe',
  '{"url": "https://app.gohighlevel.com/form/placeholder-access", "height": 700, "instructions": "Please complete the form below to grant us access to your GoHighLevel account and Facebook Business Manager."}',
  72),
(m1, 'a2p-form',            6, 'A2P Registration Form',          'iframe',
  '{"url": "https://app.gohighlevel.com/form/placeholder-a2p", "height": 700, "instructions": "Complete the A2P (Application-to-Person) SMS registration form below. This is required for SMS compliance."}',
  72),
(m1, 'brand-assets',        7, 'Brand Assets Upload',            'upload',
  '{"label": "Upload your brand assets — logo, images, fonts, brand guidelines", "accept": "image/*,video/*,.pdf,.zip,.ai,.eps,.svg", "min_files": 1, "max_files": 30, "max_size_mb": 100, "instructions": "Share your marketing assets (logo, testimonials, etc) via the form below, then upload any additional files directly.", "embed_url": "https://app.closr.org/widget/survey/gBIbOv44b6aS5daiDan3", "embed_height": 600, "embed_label": "Marketing assets form", "embed_script_url": "https://app.closr.org/js/form_embed.js"}',
  96),
(m1, 'referral-step',       8, 'Referral Program',               'video',
  '{"url": "https://www.loom.com/embed/placeholder-referral", "min_watch_seconds": 60}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 2: Offer Creation ──────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'offer-creation', 2, 'Offer Creation', 'Define your core offer with expert guidance.')
on conflict (slug) do nothing;
select id into m2 from modules where slug = 'offer-creation';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m2, 'expectations-video',   1, 'Offer Expectations Video',   'video',
  '{"url": "https://www.loom.com/embed/9d5da265280842cc871d1b99c579b758", "min_watch_seconds": 120}',
  48),
(m2, 'offer-sop',            2, 'Offer Creation SOP',         'document',
  '{"url": "https://docs.google.com/document/d/19TAgnXLmp2xZlSEtTrwV8ZNPSL7Wr3nSfN8bwdDFNtw/edit?usp=sharing", "require_ack": true}',
  72)
on conflict (module_id, slug) do nothing;

-- ── Module 3: Copywriting ─────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'copywriting', 3, 'Copywriting Analysis', 'Submit your intake and book your copy call.')
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
  '{"url": "https://www.loom.com/embed/07432ab1de404476ac2f4e204a3819de", "min_watch_seconds": 90}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 4: Ads Mastery ─────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'ads-mastery', 4, 'Ads Mastery', 'Learn the ad system and book your ads strategy call.')
on conflict (slug) do nothing;
select id into m4 from modules where slug = 'ads-mastery';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m4, 'ads-sop',              1, 'Ads Mastery SOP',            'document',
  '{"url": "https://docs.google.com/document/d/1mSbCAKhvwDkEwosmNV8klDeUUQAd_BJLY0D7GpbouA4/edit?usp=sharing", "require_ack": true}',
  72),
(m4, 'book-ads-call',        2, 'Book Your Ads Strategy Call','booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "ads_strategy", "duration_min": 60, "description": "60-min ads strategy session."}',
  72),
(m4, 'ads-expectations',     3, 'Ads Expectations Video',     'video',
  '{"url": "https://www.loom.com/embed/d5d612a1c8b940c2a39cd88acff4271a", "min_watch_seconds": 120}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 5: System Setup ────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'system-setup', 5, 'System Setup', 'Submit your assets and connect your tech stack.')
on conflict (slug) do nothing;
select id into m5 from modules where slug = 'system-setup';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m5, 'submit-setup-assets',  1, 'Submit Setup Assets',        'upload',
  '{"label": "Upload offer doc, scripts, and audit files", "accept": ".pdf,.doc,.docx,.txt,.zip", "min_files": 1, "max_files": 10, "max_size_mb": 25, "instructions": "Submit your assets via the form below, plus any additional files directly.", "embed_url": "https://app.closr.org/widget/survey/L6AseZiNF5GFZwL8HZlb", "embed_height": 600, "embed_label": "Upload your assets", "embed_script_url": "https://app.closr.org/js/form_embed.js"}',
  72),
(m5, 'connect-google-cal',   2, 'Connect Google Calendar to GHL', 'video',
  '{"url": "https://www.loom.com/embed/a72d88203961489a92f1ca00d6b3f0ea", "min_watch_seconds": 60}',
  72),
(m5, 'connect-domain',       3, 'Add Domain to Your GHL Account', 'video',
  '{"url": "https://www.loom.com/embed/9e17c51cd69b4295a826544b1005aff0", "min_watch_seconds": 60}',
  72),
(m5, 'book-setup-call',      4, 'Book Your Setup Call',       'booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "system_setup", "duration_min": 90, "description": "90-min technical setup session."}',
  96),
(m5, 'setup-expectations',   5, 'System Setup & Review',      'video',
  '{"url": "https://www.loom.com/embed/c32194d561b04680b4afe027acafb35d", "min_watch_seconds": 60}',
  48)
on conflict (module_id, slug) do nothing;

-- ── Module 6: Launch ──────────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'launch', 6, 'Launch Call', 'Set up payments, record your ads, and launch.')
on conflict (slug) do nothing;
select id into m6 from modules where slug = 'launch';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m6, 'payment-setup',        1, 'How to Add a Payment Method', 'video',
  '{"url": "https://www.loom.com/embed/31fa9ec61f6e4d3abb5894d0a24b8457", "min_watch_seconds": 60}',
  48),
(m6, 'record-video-ads',     2, 'Record Your Video Ads',      'upload',
  '{"label": "Upload your recorded video ads", "accept": "video/*", "min_files": 1, "max_files": 5, "max_size_mb": 500, "reminder_days": [1, 2, 3, 4], "notify_team_on_upload": true, "instructions": "Record 3–5 short video ads following the script your copywriter provided. 30–90 seconds each. Submit raw footage to your editor via the form below or upload directly.", "embed_url": "https://app.closr.org/widget/survey/pAkuOhNgrGZCAQCJEzrE", "embed_height": 600, "embed_label": "Raw footage for editor", "embed_script_url": "https://app.closr.org/js/form_embed.js"}',
  96),
(m6, 'book-launch-call',     3, 'Book Your Launch Call',      'booking',
  '{"calendar_url": "${CALENDLY_URL}", "call_type": "launch", "duration_min": 60, "description": "Final review before going live."}',
  72),
(m6, 'kpi-expectations',     4, 'Launch Call Expectations',   'video',
  '{"url": "https://www.loom.com/embed/1c4f71885f2b45d28635788a25717d22", "min_watch_seconds": 180}',
  48),
(m6, 'submit-video-ads',     5, 'Submit Video Ads to Rasmus', 'upload',
  '{"label": "Upload your final edited video ads", "accept": "video/*", "min_files": 1, "max_files": 10, "max_size_mb": 500, "instructions": "Upload your finished video ads (or share a Google Drive link). These go straight to Rasmus for review before launch.", "notify_team_on_upload": true}',
  72)
on conflict (module_id, slug) do nothing;

-- ── Module 7: Weekly 1-1 Calls ────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'weekly-calls', 7, 'Weekly 1-1 Calls', 'Schedule your recurring strategy calls.')
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

-- ── Module 8: Dashboard ───────────────────────────────────────────────────────
insert into modules (id, slug, order_index, title, description)
values (gen_random_uuid(), 'dashboard', 8, 'Access Your Dashboard', 'Track your results and celebrate your progress.')
on conflict (slug) do nothing;
select id into m8 from modules where slug = 'dashboard';

insert into steps (module_id, slug, order_index, title, type, config, sla_hours) values
(m8, 'ghl-connect',          1, 'Connect GoHighLevel',        'conditional',
  '{"question": {"field": "has_ghl", "label": "Do you have GoHighLevel?"}, "branches": [{"when": {"has_ghl": true}, "content": {"heading": "Connect Your GHL Account", "description": "Enter your GHL account details so we can connect your performance data.", "fields": [{"name": "ghl_account_url", "label": "GHL Account URL", "type": "url", "required": true}, {"name": "ghl_sub_account", "label": "Sub-Account ID", "type": "text", "required": true}]}}, {"when": {"has_ghl": false}, "content": {"heading": "GHL Setup Coming Soon", "description": "We will set up GoHighLevel for you as part of your system setup. No action needed here.", "fields": []}}]}',
  72),
(m8, 'performance-dashboard',2, 'Performance Dashboard',      'dashboard',
  '{"source": "ghl", "metrics": ["leads", "appointments", "deals_closed", "revenue", "roas", "cpl"], "description": "Your live campaign performance data."}',
  0),
(m8, 'journey-recap',        3, 'Journey Recap & Next Steps', 'video',
  '{"url": "https://www.loom.com/embed/2b18744dd4244803a776f04e239407a1", "min_watch_seconds": 60}',
  0)
on conflict (module_id, slug) do nothing;

end $$;
