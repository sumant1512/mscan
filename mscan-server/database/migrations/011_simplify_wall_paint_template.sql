-- Migration: Simplify Wall Paint Template - Remove Custom Fields
-- Version: 011
-- Date: 2026-01-26
-- Description: Removes all custom fields from wall paint template as they are not implemented in frontend yet

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Find the wall paint template
  SELECT id INTO v_template_id
  FROM product_templates
  WHERE template_name = 'Wall Paint & Coatings'
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE NOTICE 'Wall Paint & Coatings template not found, skipping';
    RETURN;
  END IF;

  -- Update template to remove all custom fields
  UPDATE product_templates
  SET custom_fields = '[]'::jsonb
  WHERE id = v_template_id;

  RAISE NOTICE 'Removed all custom fields from Wall Paint & Coatings template (ID: %)', v_template_id;

END $$;
