-- Merge Module 1 step 3 (process-intro) into step 2 (expectations-intro)
-- Step 3's video+doc become the "Part 2" of step 2's video_document config.

do $$
declare
  v_module_id uuid;
  v_step3_config jsonb;
begin
  select id into v_module_id from modules where slug = 'onboarding';

  -- Grab step 3's config
  select config into v_step3_config
  from steps
  where module_id = v_module_id and slug = 'process-intro';

  -- Merge step 3's video+doc into step 2 as the second pair
  update steps
  set config = config || jsonb_build_object(
    'video_url_2',      v_step3_config->>'video_url',
    'doc_url_2',        v_step3_config->>'doc_url',
    'doc_label_2',      v_step3_config->>'doc_label',
    'doc_require_ack_2', (v_step3_config->>'doc_require_ack')::boolean
  )
  where module_id = v_module_id and slug = 'expectations-intro';

  -- Delete step 3
  delete from steps where module_id = v_module_id and slug = 'process-intro';

  -- Shift remaining steps down by 1 (order_index 4→3, 5→4, 6→5, 7→6)
  update steps
  set order_index = order_index - 1
  where module_id = v_module_id and order_index > 3;
end $$;
