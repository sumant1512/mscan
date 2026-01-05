-- ============================================
-- CLEANUP ALL TENANT DATA
-- ============================================
-- This script deletes ALL tenant-related data while preserving
-- only the Super Admin user(s)
--
-- WARNING: This is a DESTRUCTIVE operation!
-- All tenant data will be permanently deleted.
--
-- Usage:
--   psql -d mscan_db -f cleanup-all-tenant-data.sql
--
-- Or using the node script:
--   node database/cleanup-all-tenant-data.js
--
-- Created: 2026-01-02
-- ============================================

BEGIN;

-- Display what will be deleted (for confirmation)
DO $$
DECLARE
    tenant_count INT;
    user_count INT;
    coupon_count INT;
    scan_count INT;
    app_count INT;
    credit_count INT;
    super_admin_count INT;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO user_count FROM users WHERE role != 'SUPER_ADMIN';
    SELECT COUNT(*) INTO super_admin_count FROM users WHERE role = 'SUPER_ADMIN';
    
    -- Count rewards data if tables exist
    SELECT COUNT(*) INTO coupon_count FROM coupons WHERE TRUE;
    SELECT COUNT(*) INTO scan_count FROM scans WHERE TRUE;
    SELECT COUNT(*) INTO app_count FROM verification_apps WHERE TRUE;
    SELECT COUNT(*) INTO credit_count FROM credit_requests WHERE TRUE;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'CLEANUP SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Records to be DELETED:';
    RAISE NOTICE '  - Tenants: %', tenant_count;
    RAISE NOTICE '  - Tenant Users: %', user_count;
    RAISE NOTICE '  - Coupons: %', coupon_count;
    RAISE NOTICE '  - Scans: %', scan_count;
    RAISE NOTICE '  - Verification Apps: %', app_count;
    RAISE NOTICE '  - Credit Requests: %', credit_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Records to be PRESERVED:';
    RAISE NOTICE '  - Super Admin Users: %', super_admin_count;
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================
-- Step 1: Delete Rewards System Data
-- ============================================

DO $$ BEGIN RAISE NOTICE 'Deleting scans...'; END $$;
DELETE FROM scans;

DO $$ BEGIN RAISE NOTICE 'Deleting coupons...'; END $$;
DELETE FROM coupons;

DO $$ BEGIN RAISE NOTICE 'Deleting verification apps...'; END $$;
DELETE FROM verification_apps;

DO $$ BEGIN RAISE NOTICE 'Deleting credit transactions...'; END $$;
DELETE FROM credit_transactions;

DO $$ BEGIN RAISE NOTICE 'Deleting tenant credit balances...'; END $$;
DELETE FROM tenant_credit_balance;

DO $$ BEGIN RAISE NOTICE 'Deleting credit requests...'; END $$;
DELETE FROM credit_requests;

-- ============================================
-- Step 2: Delete OTPs and Token Blacklist
-- ============================================

DO $$ BEGIN RAISE NOTICE 'Deleting OTPs for tenant users...'; END $$;
DELETE FROM otps 
WHERE email IN (
    SELECT email FROM users WHERE role != 'SUPER_ADMIN'
);

DO $$ BEGIN RAISE NOTICE 'Deleting token blacklist for tenant users...'; END $$;
DELETE FROM token_blacklist 
WHERE user_id IN (
    SELECT id FROM users WHERE role != 'SUPER_ADMIN'
);

-- ============================================
-- Step 3: Delete Audit Logs (optional - uncomment to delete)
-- ============================================

DO $$ BEGIN RAISE NOTICE 'Deleting tenant-related audit logs...'; END $$;
DELETE FROM audit_logs 
WHERE user_id IN (
    SELECT id FROM users WHERE role != 'SUPER_ADMIN'
);

-- Option 2: Delete ALL audit logs (uncomment if needed)
-- DELETE FROM audit_logs;

-- ============================================
-- Step 4: Delete Tenant Users
-- ============================================

DO $$ BEGIN RAISE NOTICE 'Deleting tenant users (TENANT_ADMIN and TENANT_USER)...'; END $$;
DELETE FROM users 
WHERE role IN ('TENANT_ADMIN', 'TENANT_USER');

-- ============================================
-- Step 5: Delete Tenants
-- ============================================

DO $$ BEGIN RAISE NOTICE 'Deleting all tenants...'; END $$;
DELETE FROM tenants;

-- ============================================
-- Step 6: Verify Cleanup
-- ============================================

DO $$
DECLARE
    tenant_remaining INT;
    user_remaining INT;
    coupon_remaining INT;
    scan_remaining INT;
    super_admin_remaining INT;
BEGIN
    -- Count remaining records
    SELECT COUNT(*) INTO tenant_remaining FROM tenants;
    SELECT COUNT(*) INTO user_remaining FROM users WHERE role != 'SUPER_ADMIN';
    SELECT COUNT(*) INTO super_admin_remaining FROM users WHERE role = 'SUPER_ADMIN';
    SELECT COUNT(*) INTO coupon_remaining FROM coupons;
    SELECT COUNT(*) INTO scan_remaining FROM scans;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'CLEANUP VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Remaining records:';
    RAISE NOTICE '  - Tenants: %', tenant_remaining;
    RAISE NOTICE '  - Tenant Users: %', user_remaining;
    RAISE NOTICE '  - Coupons: %', coupon_remaining;
    RAISE NOTICE '  - Scans: %', scan_remaining;
    RAISE NOTICE '';
    RAISE NOTICE 'Preserved records:';
    RAISE NOTICE '  - Super Admin Users: %', super_admin_remaining;
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- Verify cleanup was successful
    IF tenant_remaining > 0 OR user_remaining > 0 THEN
        RAISE EXCEPTION 'Cleanup verification failed! Some tenant data remains.';
    END IF;
    
    IF super_admin_remaining = 0 THEN
        RAISE EXCEPTION 'Cleanup verification failed! No Super Admin users found!';
    END IF;
    
    RAISE NOTICE '✓ Cleanup completed successfully!';
    RAISE NOTICE '✓ All tenant data has been deleted.';
    RAISE NOTICE '✓ Super Admin user(s) preserved.';
    RAISE NOTICE '';
END $$;

-- ============================================
-- Step 7: Reset Sequences (Optional)
-- ============================================

-- If you have any sequences that need resetting, add them here
-- Example:
-- ALTER SEQUENCE some_id_seq RESTART WITH 1;

COMMIT;

-- Display final user list
SELECT 
    '═══════════════════════════════════════════════════' as separator
UNION ALL
SELECT 'REMAINING USERS' as separator
UNION ALL
SELECT '═══════════════════════════════════════════════════' as separator;

SELECT 
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users
ORDER BY created_at;
