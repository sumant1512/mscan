-- Migration: Standardize Template Name Column
-- Version: 013
-- Date: 2026-02-05
-- Description: Rename 'name' column to 'template_name' in product_templates table for consistency

-- Check if column 'name' exists and rename it to 'template_name'
DO $$
DECLARE
  has_name_column BOOLEAN;
  has_template_name_column BOOLEAN;
BEGIN
  -- Check if 'name' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND column_name = 'name'
  ) INTO has_name_column;

  -- Check if 'template_name' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND column_name = 'template_name'
  ) INTO has_template_name_column;

  IF has_name_column AND NOT has_template_name_column THEN
    -- Rename 'name' to 'template_name'
    ALTER TABLE product_templates RENAME COLUMN name TO template_name;
    RAISE NOTICE 'Column renamed from "name" to "template_name"';
  ELSIF has_template_name_column AND NOT has_name_column THEN
    -- Already using 'template_name'
    RAISE NOTICE 'Column "template_name" already exists, no migration needed';
  ELSIF has_name_column AND has_template_name_column THEN
    -- Both exist - migrate data from 'name' to 'template_name' if null, then drop 'name'
    UPDATE product_templates
    SET template_name = name
    WHERE template_name IS NULL AND name IS NOT NULL;

    ALTER TABLE product_templates DROP COLUMN name;
    RAISE NOTICE 'Both columns existed: migrated data and dropped "name" column';
  ELSE
    -- Neither exists - error
    RAISE EXCEPTION 'Neither "name" nor "template_name" column exists in product_templates table';
  END IF;

  -- Update unique constraint if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND constraint_name = 'unique_tenant_template_name'
  ) THEN
    -- Constraint already exists with correct name
    RAISE NOTICE 'Unique constraint already exists';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'product_templates'
      AND constraint_name = 'unique_template_name_per_tenant'
  ) THEN
    -- Constraint exists with old name, rename it
    ALTER TABLE product_templates
    RENAME CONSTRAINT unique_template_name_per_tenant TO unique_tenant_template_name;
    RAISE NOTICE 'Renamed constraint';
  ELSE
    -- Create the constraint
    ALTER TABLE product_templates
    ADD CONSTRAINT unique_tenant_template_name UNIQUE (tenant_id, template_name);
    RAISE NOTICE 'Created unique constraint';
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'product_templates'
    AND column_name = 'template_name';

  IF column_count = 1 THEN
    RAISE NOTICE '✅ Migration successful: product_templates now uses "template_name" column';
  ELSE
    RAISE EXCEPTION 'Migration verification failed: template_name column not found';
  END IF;
END $$;
