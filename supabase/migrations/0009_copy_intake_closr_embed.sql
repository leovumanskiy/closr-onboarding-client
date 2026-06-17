-- ─── Migration 0009: M3 S1 copy-intake-form → Closr survey embed ───────────
-- Replace the hand-rolled intake form with the Closr copywriting questionnaire.

update steps
set type = 'iframe',
    title = 'Copywriting Questionnaire',
    config = jsonb_build_object(
      'url', 'https://app.closr.org/widget/survey/p8WLBFPWKLIN14jPA7pm',
      'height', 600,
      'embed_script_url', 'https://app.closr.org/js/form_embed.js',
      'instructions', 'Fill out the copywriting questionnaire below so your copywriter has everything they need before your call.'
    )
where slug = 'copy-intake-form'
  and module_id = (select id from modules where slug = 'copywriting');
