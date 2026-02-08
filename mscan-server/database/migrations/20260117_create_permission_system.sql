/**
 * Migration: Create Permission System Tables
 * Date: 2026-01-17
 * Description: Creates tables for dynamic permission management system
 */

-- ============================================================================
-- 1. CREATE PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('GLOBAL', 'TENANT', 'USER')),
    allowed_assigners TEXT[] DEFAULT '{"SUPER_ADMIN"}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE permissions IS 'Stores reusable permission definitions that can be assigned to users or tenants';
COMMENT ON COLUMN permissions.code IS 'Unique permission identifier (e.g., tenant.user.create)';
COMMENT ON COLUMN permissions.scope IS 'Permission applicability: GLOBAL (system-wide), TENANT (tenant-specific), USER (user-specific)';
COMMENT ON COLUMN permissions.allowed_assigners IS 'Array of roles that can assign this permission';

-- Create indices
CREATE UNIQUE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_scope ON permissions(scope);
CREATE INDEX idx_permissions_created_at ON permissions(created_at DESC);

-- ============================================================================
-- 2. CREATE PERMISSION_ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_tenant_level BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT check_assignment_target CHECK (
        (is_tenant_level = true AND tenant_id IS NOT NULL AND user_id IS NULL) OR
        (is_tenant_level = false AND user_id IS NOT NULL)
    )
);

-- Add comments
COMMENT ON TABLE permission_assignments IS 'Links permissions to tenants (tenant-level) or users (user-level)';
COMMENT ON COLUMN permission_assignments.is_tenant_level IS 'true = tenant-level assignment, false = user-level assignment';
COMMENT ON COLUMN permission_assignments.assigned_by IS 'User who assigned the permission';

-- Create indices
CREATE INDEX idx_permission_assignments_permission ON permission_assignments(permission_id);
CREATE INDEX idx_permission_assignments_tenant ON permission_assignments(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_permission_assignments_user ON permission_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_permission_assignments_tenant_user ON permission_assignments(tenant_id, user_id);
CREATE INDEX idx_permission_assignments_assigned_at ON permission_assignments(assigned_at DESC);

-- Prevent duplicate assignments
CREATE UNIQUE INDEX idx_permission_assignments_unique_tenant
    ON permission_assignments(permission_id, tenant_id)
    WHERE is_tenant_level = true;

CREATE UNIQUE INDEX idx_permission_assignments_unique_user
    ON permission_assignments(permission_id, user_id)
    WHERE is_tenant_level = false;

-- ============================================================================
-- 3. ENHANCE AUDIT_LOGS TABLE (add new columns to existing table)
-- ============================================================================

-- Check if audit_logs table exists and enhance it
DO $$
BEGIN
    -- Add actor_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_role') THEN
        ALTER TABLE audit_logs ADD COLUMN actor_role VARCHAR(50);
    END IF;

    -- Add target_type column if it doesn't exist (map from resource_type)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'target_type') THEN
        ALTER TABLE audit_logs ADD COLUMN target_type VARCHAR(50);
        -- Copy data from resource_type if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_type') THEN
            UPDATE audit_logs SET target_type = resource_type WHERE resource_type IS NOT NULL;
        END IF;
    END IF;

    -- Add target_id column if it doesn't exist (map from resource_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'target_id') THEN
        ALTER TABLE audit_logs ADD COLUMN target_id UUID;
        -- Copy data from resource_id if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_id') THEN
            UPDATE audit_logs SET target_id = resource_id WHERE resource_id IS NOT NULL;
        END IF;
    END IF;

    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE audit_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- Add request_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'request_id') THEN
        ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(100);
    END IF;

    -- Add actor_id column as alias for user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_id') THEN
        ALTER TABLE audit_logs ADD COLUMN actor_id UUID REFERENCES users(id);
        -- Copy data from user_id if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
            UPDATE audit_logs SET actor_id = user_id WHERE user_id IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE audit_logs IS 'Audit trail for all security-related operations';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., CREATE_PERMISSION, ASSIGN_PERMISSION, CREATE_USER)';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of target resource (e.g., permission, user, tenant)';

-- Create indices if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id) WHERE target_type IS NOT NULL;

-- ============================================================================
-- 4. CREATE FUNCTION TO UPDATE updated_at TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for permissions table
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at
    BEFORE UPDATE ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. SEED INITIAL PERMISSIONS (from hardcoded permission sets)
-- ============================================================================

-- Insert permissions for app management
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_app', 'Create Verification App', 'Allows creating new verification apps', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_app', 'Edit Verification App', 'Allows modifying verification app settings', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_app', 'Delete Verification App', 'Allows deleting verification apps', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_apps', 'View Verification Apps', 'Allows viewing verification apps', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for coupon management
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_coupon', 'Create Coupon', 'Allows creating new coupons', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_coupon', 'Edit Coupon', 'Allows modifying coupon details and status', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_coupon', 'Delete Coupon', 'Allows deleting coupons', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_coupons', 'View Coupons', 'Allows viewing coupon list and details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for batch management
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_batch', 'Create Coupon Batch', 'Allows creating coupon batches', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_batch', 'Edit Coupon Batch', 'Allows modifying coupon batch details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_batch', 'Delete Coupon Batch', 'Allows deleting coupon batches', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for product management
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_product', 'Create Product', 'Allows adding products to catalogue', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_product', 'Edit Product', 'Allows modifying product details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_product', 'Delete Product', 'Allows removing products from catalogue', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_products', 'View Products', 'Allows viewing product catalogue', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for category management
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_category', 'Create Category', 'Allows creating product categories', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_category', 'Edit Category', 'Allows modifying category details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_category', 'Delete Category', 'Allows deleting product categories', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_categories', 'View Categories', 'Allows viewing category list', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for credit management
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('request_credits', 'Request Credits', 'Allows requesting credit top-ups', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_credit_balance', 'View Credit Balance', 'Allows viewing current credit balance', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}'),
('view_credit_transactions', 'View Credit Transactions', 'Allows viewing credit transaction history', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for analytics and reporting
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('view_analytics', 'View Analytics', 'Allows viewing analytics dashboard', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}'),
('view_scans', 'View Scan History', 'Allows viewing coupon scan history', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Insert permissions for user management (future)
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('manage_tenant_users', 'Manage Tenant Users', 'Allows managing users within tenant', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}')
ON CONFLICT (code) DO NOTHING;

-- Insert system-level permissions (SUPER_ADMIN only)
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('manage_tenants', 'Manage Tenants', 'Full tenant CRUD operations', 'GLOBAL', '{"SUPER_ADMIN"}'),
('approve_credits', 'Approve Credit Requests', 'Approve or reject credit top-up requests', 'GLOBAL', '{"SUPER_ADMIN"}'),
('view_all_data', 'View All System Data', 'Access all system data across tenants', 'GLOBAL', '{"SUPER_ADMIN"}'),
('manage_system_settings', 'Manage System Settings', 'System configuration and settings', 'GLOBAL', '{"SUPER_ADMIN"}')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get effective permissions for a user (tenant-level + user-level)
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE(permission_code VARCHAR(255)) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.code
    FROM permissions p
    INNER JOIN permission_assignments pa ON p.id = pa.permission_id
    WHERE (
        -- Tenant-level permissions
        (pa.is_tenant_level = true AND pa.tenant_id = p_tenant_id)
        OR
        -- User-level permissions
        (pa.is_tenant_level = false AND pa.user_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_effective_permissions IS 'Returns union of tenant-level and user-level permissions for a user';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration success
DO $$
BEGIN
    RAISE NOTICE 'Permission system migration completed successfully';
    RAISE NOTICE 'Tables created: permissions, permission_assignments';
    RAISE NOTICE 'Audit logs table enhanced';
    RAISE NOTICE 'Initial permissions seeded: % permissions', (SELECT COUNT(*) FROM permissions);
END $$;
