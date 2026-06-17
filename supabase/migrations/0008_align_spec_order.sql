-- ─── Migration 0008: Align modules/steps with canonical onboarding spec ─────
-- Idempotent: safe to re-run.
--   - M1: insert "agency-audit" at position 3, shift later steps down
--   - M3 / M6 / M7 / M8: rename module titles to spec wording
--   - M6: insert "submit-video-ads" final step (footage send to Rasmus)

do $$
declare
  v_m1 uuid;
  v_m6 uuid;
begin
  select id into v_m1 from modules where slug = 'onboarding';
  select id into v_m6 from modules where slug = 'launch';

  -- ── M1: Insert "agency-audit" at order_index 3 ─────────────────────────────
  if not exists (
    select 1 from steps where module_id = v_m1 and slug = 'agency-audit'
  ) then
    -- Shift existing steps at order_index >= 3 down by 1 (descending to avoid unique conflicts)
    update steps
       set order_index = order_index + 1
     where module_id = v_m1
       and order_index >= 3;

    insert into steps (module_id, slug, order_index, title, type, config, sla_hours)
    values (
      v_m1,
      'agency-audit',
      3,
      'Agency Audit Sheet',
      'iframe',
      jsonb_build_object(
        'url', 'https://forms.fillout.com/t/placeholder-agency-audit',
        'height', 800,
        'instructions', 'Complete the Agency Audit Sheet so we have a full picture of your business before your kickoff calls.'
      ),
      72
    );
  end if;

  -- ── M6: Insert "submit-video-ads" at the end ───────────────────────────────
  if not exists (
    select 1 from steps where module_id = v_m6 and slug = 'submit-video-ads'
  ) then
    insert into steps (module_id, slug, order_index, title, type, config, sla_hours)
    values (
      v_m6,
      'submit-video-ads',
      (select coalesce(max(order_index), 0) + 1 from steps where module_id = v_m6),
      'Submit Video Ads to Rasmus',
      'upload',
      jsonb_build_object(
        'label', 'Upload your final edited video ads',
        'accept', 'video/*',
        'min_files', 1,
        'max_files', 10,
        'max_size_mb', 500,
        'instructions', 'Upload your finished video ads (or share a Google Drive link). These go straight to Rasmus for review before launch.',
        'notify_team_on_upload', true
      ),
      72
    );
  end if;

  -- ── Module title renames to match spec ─────────────────────────────────────
  update modules set title = 'Copywriting Analysis'  where slug = 'copywriting'   and title <> 'Copywriting Analysis';
  update modules set title = 'Launch Call'           where slug = 'launch'        and title <> 'Launch Call';
  update modules set title = 'Weekly 1-1 Calls'      where slug = 'weekly-calls'  and title <> 'Weekly 1-1 Calls';
  update modules set title = 'Access Your Dashboard' where slug = 'dashboard'     and title <> 'Access Your Dashboard';
end $$;
