-- Migration: Add variant_config and custom_fields to product_templates
-- Version: 014
-- Date: 2026-02-05
-- Description: Upgrade old schema (003) to new schema (004) by adding JSONB columns

-- Add variant_config column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND column_name = 'variant_config'
  ) THEN
    ALTER TABLE product_templates
    ADD COLUMN variant_config JSONB NOT NULL DEFAULT '{
      "variant_label": "Variant",
      "dimensions": [],
      "common_fields": []
    }'::jsonb;

    RAISE NOTICE 'Added variant_config column';
  ELSE
    RAISE NOTICE 'variant_config column already exists';
  END IF;
END $$;

-- Add custom_fields column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE product_templates
    ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

    RAISE NOTICE 'Added custom_fields column';
  ELSE
    RAISE NOTICE 'custom_fields column already exists';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN product_templates.variant_config IS 'JSONB configuration for product variants (dimensions + common fields)';
COMMENT ON COLUMN product_templates.custom_fields IS 'JSONB array of custom field definitions';

-- Verification
DO $$
DECLARE
  has_variant_config BOOLEAN;
  has_custom_fields BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND column_name = 'variant_config'
  ) INTO has_variant_config;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND column_name = 'custom_fields'
  ) INTO has_custom_fields;

  IF has_variant_config AND has_custom_fields THEN
    RAISE NOTICE '✅ Migration successful: product_templates now has variant_config and custom_fields';
  ELSE
    RAISE EXCEPTION 'Migration verification failed!';
  END IF;
END $$;
