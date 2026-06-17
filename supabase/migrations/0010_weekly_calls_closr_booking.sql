-- ─── Migration 0010: M7 S1 schedule-recurring → Closr booking widget ──────
-- Replace the Calendly booking step with the Closr weekly-calls booking embed.

update steps
set type = 'iframe',
    title = 'Schedule Recurring Calls',
    config = jsonb_build_object(
      'url', 'https://app.closr.org/widget/booking/DOQWREuWI6P0AWbaHYwH',
      'height', 700,
      'embed_script_url', 'https://app.closr.org/js/form_embed.js',
      'instructions', 'Book your weekly 30-min strategy call below. This will repeat every week.'
    )
where slug in ('schedule-recurring', 'schedule-recurring-calls')
  and module_id = (select id from modules where slug = 'weekly-calls');
