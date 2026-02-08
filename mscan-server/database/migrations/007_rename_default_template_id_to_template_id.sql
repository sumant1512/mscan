-- Migration: Rename default_template_id to template_id in verification_apps table
-- Purpose: Simplify naming convention and enforce template requirement for apps

-- Step 1: Rename the column (only if default_template_id exists and template_id doesn't)
DO $$
DECLARE
  has_default_template_id BOOLEAN;
  has_template_id BOOLEAN;
BEGIN
  -- Check if default_template_id exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_apps' AND column_name = 'default_template_id'
  ) INTO has_default_template_id;

  -- Check if template_id exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_apps' AND column_name = 'template_id'
  ) INTO has_template_id;

  IF has_default_template_id AND NOT has_template_id THEN
    -- Rename: default_template_id exists, template_id doesn't
    ALTER TABLE verification_apps RENAME COLUMN default_template_id TO template_id;
    RAISE NOTICE 'Renamed default_template_id to template_id';
  ELSIF has_default_template_id AND has_template_id THEN
    -- Both exist: copy data from default_template_id to template_id if null, then drop default_template_id
    UPDATE verification_apps SET template_id = default_template_id WHERE template_id IS NULL AND default_template_id IS NOT NULL;
    ALTER TABLE verification_apps DROP COLUMN default_template_id;
    RAISE NOTICE 'Both columns existed: copied data and dropped default_template_id';
  ELSIF has_template_id THEN
    -- Only template_id exists: already migrated
    RAISE NOTICE 'Column template_id already exists, migration already complete';
  ELSE
    -- Neither exists: unexpected state
    RAISE EXCEPTION 'Neither default_template_id nor template_id exists in verification_apps table';
  END IF;
END $$;

-- Step 2: Add NOT NULL constraint (after ensuring all apps have templates)
-- First, set NULL values to a default template if needed
-- UPDATE verification_apps SET template_id = (SELECT id FROM product_templates LIMIT 1) WHERE template_id IS NULL;

-- Step 3: Add NOT NULL constraint
-- ALTER TABLE verification_apps
-- ALTER COLUMN template_id SET NOT NULL;

-- Step 4: Add foreign key constraint if not exists
ALTER TABLE verification_apps
DROP CONSTRAINT IF EXISTS fk_verification_apps_template;

ALTER TABLE verification_apps
ADD CONSTRAINT fk_verification_apps_template
FOREIGN KEY (template_id)
REFERENCES product_templates(id)
ON DELETE RESTRICT;

-- Note: The NOT NULL constraint is commented out initially to allow gradual migration
-- Uncomment it once all existing apps have been assigned templates
