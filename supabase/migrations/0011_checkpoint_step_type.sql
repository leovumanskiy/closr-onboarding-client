-- ─── Migration 0011: Checkpoint step type + M6 S2 conversion ─────────────
-- New `checkpoint` step type: instructions + countdown + acknowledge button.
-- Convert M6 S2 (record-video-ads) from upload to a simple checkpoint with the
-- existing 4-day SLA preserved.

alter type step_type add value if not exists 'checkpoint';

update steps
set type = 'checkpoint',
    title = 'Record Your Video Ads',
    config = jsonb_build_object(
      'instructions',
      E'Record 3–5 short video ads following the script your copywriter provided. 30–90 seconds each.\n\nSubmit your raw footage directly to your editor, then mark this step complete.',
      'cta_label', 'I''ve recorded and submitted my ads'
    )
where slug = 'record-video-ads'
  and module_id = (select id from modules where slug = 'launch');
