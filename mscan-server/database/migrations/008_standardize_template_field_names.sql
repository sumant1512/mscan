-- Migration: Standardize Template Field Names
-- Version: 008
-- Date: 2026-01-25
-- Description: Update JSONB fields to use attribute_key and attribute_name instead of key and label

-- ============================================
-- Update variant_config dimensions
-- ============================================
UPDATE product_templates
SET variant_config = jsonb_set(
  jsonb_set(
    variant_config,
    '{dimensions}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          jsonb_set(
            dimension - 'key' - 'label',
            '{attribute_key}',
            dimension->'key'
          ),
          '{attribute_name}',
          dimension->'label'
        )
      )
      FROM jsonb_array_elements(variant_config->'dimensions') AS dimension
    ),
    true
  ),
  '{common_fields}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        jsonb_set(
          field - 'key' - 'label',
          '{attribute_key}',
          field->'key'
        ),
        '{attribute_name}',
        field->'label'
      )
    )
    FROM jsonb_array_elements(variant_config->'common_fields') AS field
  ),
  true
)
WHERE variant_config->'dimensions' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(variant_config->'dimensions') AS dim
    WHERE dim ? 'key'
  );

-- ============================================
-- Update custom_fields
-- ============================================
UPDATE product_templates
SET custom_fields = (
  SELECT jsonb_agg(
    jsonb_set(
      jsonb_set(
        field - 'key' - 'label',
        '{attribute_key}',
        field->'key'
      ),
      '{attribute_name}',
      field->'label'
    )
  )
  FROM jsonb_array_elements(custom_fields) AS field
)
WHERE custom_fields IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(custom_fields) AS cf
    WHERE cf ? 'key'
  );

-- ============================================
-- Verification
-- ============================================
-- Check that all templates now use attribute_key and attribute_name
DO $$
DECLARE
  v_templates_with_old_fields INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_templates_with_old_fields
  FROM product_templates
  WHERE (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(variant_config->'dimensions') AS dim
      WHERE dim ? 'key'
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(variant_config->'common_fields') AS field
      WHERE field ? 'key'
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(custom_fields) AS cf
      WHERE cf ? 'key'
    )
  );

  IF v_templates_with_old_fields > 0 THEN
    RAISE WARNING 'Warning: % templates still have old field names (key/label)', v_templates_with_old_fields;
  ELSE
    RAISE NOTICE 'Success: All templates now use attribute_key and attribute_name';
  END IF;
END $$;
