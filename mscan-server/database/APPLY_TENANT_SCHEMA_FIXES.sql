-- ============================================
-- Tenant Schema Fixes Migration
-- Apply to existing databases
-- Date: 2026-02-13
-- ============================================

-- NOTE: Run this script if you have an existing database
-- For fresh installations, just use full_setup.sql

BEGIN;

-- ============================================
-- STEP 1: Add foreign key constraint for created_by
-- (Will fail silently if already exists)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_tenants_created_by'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT fk_tenants_created_by
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint fk_tenants_created_by';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_tenants_created_by already exists';
    END IF;
END $$;

-- ============================================
-- STEP 2: Add index for created_by
-- (Will fail silently if already exists)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);

-- ============================================
-- STEP 3: Update existing tenants with created_by
-- Set to the first available super admin
-- ============================================
DO $$
DECLARE
    super_admin_id UUID;
    updated_count INTEGER;
BEGIN
    -- Find first super admin
    SELECT id INTO super_admin_id
    FROM users
    WHERE role = 'SUPER_ADMIN'
    LIMIT 1;

    IF super_admin_id IS NULL THEN
        RAISE NOTICE 'No super admin found. Skipping created_by update.';
    ELSE
        -- Update all tenants with NULL created_by
        UPDATE tenants
        SET created_by = super_admin_id
        WHERE created_by IS NULL;

        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % tenant(s) with created_by = %', updated_count, super_admin_id;
    END IF;
END $$;

-- ============================================
-- STEP 4: Remove duplicate contact_name column
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name = 'contact_name'
    ) THEN
        ALTER TABLE tenants DROP COLUMN contact_name;
        RAISE NOTICE 'Removed contact_name column from tenants table';
    ELSE
        RAISE NOTICE 'contact_name column does not exist - already removed';
    END IF;
END $$;

-- ============================================
-- STEP 5: Verify changes
-- ============================================
DO $$
DECLARE
    has_contact_name BOOLEAN;
    has_created_by_fk BOOLEAN;
    has_created_by_index BOOLEAN;
    null_created_by_count INTEGER;
BEGIN
    -- Check if contact_name still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'contact_name'
    ) INTO has_contact_name;

    -- Check if foreign key exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_tenants_created_by'
    ) INTO has_created_by_fk;

    -- Check if index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_tenants_created_by'
    ) INTO has_created_by_index;

    -- Count tenants with NULL created_by
    SELECT COUNT(*) INTO null_created_by_count
    FROM tenants
    WHERE created_by IS NULL;

    -- Print verification results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'contact_name column exists: %', has_contact_name;
    RAISE NOTICE 'created_by FK constraint exists: %', has_created_by_fk;
    RAISE NOTICE 'created_by index exists: %', has_created_by_index;
    RAISE NOTICE 'Tenants with NULL created_by: %', null_created_by_count;
    RAISE NOTICE '========================================';

    IF NOT has_contact_name AND has_created_by_fk AND has_created_by_index AND null_created_by_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All fixes applied successfully!';
    ELSE
        RAISE WARNING 'Some fixes may not have been applied. Check the notices above.';
    END IF;
END $$;

COMMIT;

-- ============================================
-- Post-Migration Test Query
-- ============================================
-- Uncomment and run this to verify:
/*
SELECT
    t.id,
    t.tenant_name,
    t.contact_person,
    t.created_by,
    u.full_name as created_by_name,
    u.email as created_by_email
FROM tenants t
LEFT JOIN users u ON t.created_by = u.id
LIMIT 5;
*/
