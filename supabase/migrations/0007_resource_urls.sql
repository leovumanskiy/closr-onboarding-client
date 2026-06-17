-- ─── Migration 0007: Real resource URLs from Ville ──────────────────────────
-- Replaces placeholder Looms/PDFs with real URLs, adds Closr form embeds
-- to upload steps, and converts a few form/document steps to video.

-- M1: brand-assets — add Closr marketing-assets form embed
update steps
set config = config
  || jsonb_build_object(
    'instructions', 'Share your marketing assets (logo, testimonials, etc) via the form below, then upload any additional files directly.',
    'embed_url', 'https://app.closr.org/widget/survey/gBIbOv44b6aS5daiDan3',
    'embed_height', 600,
    'embed_label', 'Marketing assets form',
    'embed_script_url', 'https://app.closr.org/js/form_embed.js'
  )
where slug = 'brand-assets'
  and module_id = (select id from modules where slug = 'onboarding');

-- M2: offer-creation
update steps
set config = jsonb_set(config, '{url}', '"https://www.loom.com/embed/9d5da265280842cc871d1b99c579b758"')
where slug = 'expectations-video'
  and module_id = (select id from modules where slug = 'offer-creation');

update steps
set config = jsonb_set(config, '{url}', '"https://docs.google.com/document/d/19TAgnXLmp2xZlSEtTrwV8ZNPSL7Wr3nSfN8bwdDFNtw/edit?usp=sharing"')
where slug = 'offer-sop'
  and module_id = (select id from modules where slug = 'offer-creation');

-- M3: copywriting
update steps
set config = jsonb_set(config, '{url}', '"https://www.loom.com/embed/07432ab1de404476ac2f4e204a3819de"')
where slug = 'copy-sop'
  and module_id = (select id from modules where slug = 'copywriting');

-- M4: ads-mastery
update steps
set config = jsonb_set(config, '{url}', '"https://docs.google.com/document/d/1mSbCAKhvwDkEwosmNV8klDeUUQAd_BJLY0D7GpbouA4/edit?usp=sharing"')
where slug = 'ads-sop'
  and module_id = (select id from modules where slug = 'ads-mastery');

update steps
set config = jsonb_set(config, '{url}', '"https://www.loom.com/embed/d5d612a1c8b940c2a39cd88acff4271a"')
where slug = 'ads-expectations'
  and module_id = (select id from modules where slug = 'ads-mastery');

-- M5: system-setup
-- submit-setup-assets — add Closr upload-assets form embed
update steps
set config = config
  || jsonb_build_object(
    'instructions', 'Submit your assets via the form below, plus any additional files directly.',
    'embed_url', 'https://app.closr.org/widget/survey/L6AseZiNF5GFZwL8HZlb',
    'embed_height', 600,
    'embed_label', 'Upload your assets',
    'embed_script_url', 'https://app.closr.org/js/form_embed.js'
  )
where slug = 'submit-setup-assets'
  and module_id = (select id from modules where slug = 'system-setup');

-- connect-google-cal: form → video (Connect Google Calendar to GHL)
update steps
set type = 'video',
    title = 'Connect Google Calendar to GHL',
    config = jsonb_build_object(
      'url', 'https://www.loom.com/embed/a72d88203961489a92f1ca00d6b3f0ea',
      'min_watch_seconds', 60
    )
where slug = 'connect-google-cal'
  and module_id = (select id from modules where slug = 'system-setup');

-- connect-domain: form → video (Add Domain to GHL)
update steps
set type = 'video',
    title = 'Add Domain to Your GHL Account',
    config = jsonb_build_object(
      'url', 'https://www.loom.com/embed/9e17c51cd69b4295a826544b1005aff0',
      'min_watch_seconds', 60
    )
where slug = 'connect-domain'
  and module_id = (select id from modules where slug = 'system-setup');

-- setup-expectations — system setup & review Loom
update steps
set title = 'System Setup & Review',
    config = jsonb_set(config, '{url}', '"https://www.loom.com/embed/c32194d561b04680b4afe027acafb35d"')
where slug = 'setup-expectations'
  and module_id = (select id from modules where slug = 'system-setup');

-- M6: launch
-- payment-setup: document → video (How to add payment method)
update steps
set type = 'video',
    title = 'How to Add a Payment Method',
    config = jsonb_build_object(
      'url', 'https://www.loom.com/embed/31fa9ec61f6e4d3abb5894d0a24b8457',
      'min_watch_seconds', 60
    )
where slug = 'payment-setup'
  and module_id = (select id from modules where slug = 'launch');

-- record-video-ads — add Closr raw-footage form embed
update steps
set config = config
  || jsonb_build_object(
    'instructions', 'Record 3–5 short video ads following the script your copywriter provided. 30–90 seconds each. Submit raw footage to your editor via the form below or upload directly.',
    'embed_url', 'https://app.closr.org/widget/survey/pAkuOhNgrGZCAQCJEzrE',
    'embed_height', 600,
    'embed_label', 'Raw footage for editor',
    'embed_script_url', 'https://app.closr.org/js/form_embed.js'
  )
where slug = 'record-video-ads'
  and module_id = (select id from modules where slug = 'launch');

-- kpi-expectations — launch call Loom
update steps
set title = 'Launch Call Expectations',
    config = jsonb_set(config, '{url}', '"https://www.loom.com/embed/1c4f71885f2b45d28635788a25717d22"')
where slug = 'kpi-expectations'
  and module_id = (select id from modules where slug = 'launch');
