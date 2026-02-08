/**
 * Rollback: Remove Permission System Tables
 * Date: 2026-01-17
 * Description: Reverts the permission system migration
 */

-- ============================================================================
-- WARNING: This will delete all permission data
-- ============================================================================

BEGIN;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_effective_permissions(UUID, UUID);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS permission_assignments CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
-- Note: audit_logs table is kept as it may be used by other features

-- Drop indices (if they weren't cascade deleted)
DROP INDEX IF EXISTS idx_permissions_code;
DROP INDEX IF EXISTS idx_permissions_scope;
DROP INDEX IF EXISTS idx_permissions_created_at;
DROP INDEX IF EXISTS idx_permission_assignments_permission;
DROP INDEX IF EXISTS idx_permission_assignments_tenant;
DROP INDEX IF EXISTS idx_permission_assignments_user;
DROP INDEX IF EXISTS idx_permission_assignments_tenant_user;
DROP INDEX IF EXISTS idx_permission_assignments_assigned_at;
DROP INDEX IF EXISTS idx_permission_assignments_unique_tenant;
DROP INDEX IF EXISTS idx_permission_assignments_unique_user;

-- Log rollback
DO $$
BEGIN
    RAISE NOTICE 'Permission system rollback completed';
    RAISE NOTICE 'Tables dropped: permissions, permission_assignments';
    RAISE NOTICE 'Functions dropped: get_user_effective_permissions, update_updated_at_column';
END $$;

COMMIT;
