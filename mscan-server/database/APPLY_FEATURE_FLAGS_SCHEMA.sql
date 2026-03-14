-- Feature Flags Schema Migration
-- Add feature flags system to existing databases

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Feature Flags Schema Migration...';

    -- ============================================
    -- FEATURE FLAGS SYSTEM
    -- ============================================

    -- Check if features table exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'features';

    IF table_count = 0 THEN
        RAISE NOTICE 'Creating features table...';

        -- Features (Global Feature Definitions)
        CREATE TABLE features (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            default_enabled BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_features_code ON features(code);
        CREATE INDEX idx_features_active ON features(is_active);

        CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON features
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        COMMENT ON TABLE features IS 'Global feature definitions that can be enabled per tenant';
        COMMENT ON COLUMN features.code IS 'Unique feature identifier (e.g., advanced-reporting)';
        COMMENT ON COLUMN features.default_enabled IS 'Whether new tenants get this feature by default';

        RAISE NOTICE 'Features table created successfully';
    ELSE
        RAISE NOTICE 'Features table already exists, skipping creation';
    END IF;

    -- Check if tenant_features table exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_features';

    IF table_count = 0 THEN
        RAISE NOTICE 'Creating tenant_features table...';

        -- Tenant Features (Tenant-Specific Feature Enablement)
        CREATE TABLE tenant_features (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            enabled BOOLEAN DEFAULT true,
            enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            enabled_by UUID REFERENCES users(id),
            UNIQUE(tenant_id, feature_id)
        );

        CREATE INDEX idx_tenant_features_tenant ON tenant_features(tenant_id);
        CREATE INDEX idx_tenant_features_feature ON tenant_features(feature_id);
        CREATE INDEX idx_tenant_features_enabled ON tenant_features(enabled);

        COMMENT ON TABLE tenant_features IS 'Tenant-specific feature enablement records';
        COMMENT ON COLUMN tenant_features.enabled IS 'Whether the feature is currently enabled for this tenant';

        RAISE NOTICE 'Tenant features table created successfully';
    ELSE
        RAISE NOTICE 'Tenant features table already exists, skipping creation';
    END IF;

    -- Check if function exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'is_feature_enabled_for_tenant';

    IF table_count = 0 THEN
        RAISE NOTICE 'Creating is_feature_enabled_for_tenant function...';

        -- Helper: Check if feature is enabled for tenant
        CREATE OR REPLACE FUNCTION is_feature_enabled_for_tenant(p_feature_code VARCHAR(100), p_tenant_id UUID)
        RETURNS BOOLEAN AS $$
        DECLARE
            feature_default BOOLEAN;
            tenant_enabled BOOLEAN;
        BEGIN
            -- Get the feature's default setting
            SELECT default_enabled INTO feature_default
            FROM features
            WHERE code = p_feature_code AND is_active = true;

            -- If feature doesn't exist or is inactive, return false
            IF NOT FOUND THEN
                RETURN false;
            END IF;

            -- Check if tenant has explicit setting
            SELECT enabled INTO tenant_enabled
            FROM tenant_features tf
            INNER JOIN features f ON tf.feature_id = f.id
            WHERE f.code = p_feature_code AND tf.tenant_id = p_tenant_id;

            -- Return explicit setting if exists, otherwise default
            IF FOUND THEN
                RETURN tenant_enabled;
            ELSE
                RETURN feature_default;
            END IF;
        END;
        $$ LANGUAGE plpgsql;

        RAISE NOTICE 'Feature check function created successfully';
    ELSE
        RAISE NOTICE 'Feature check function already exists, skipping creation';
    END IF;

    RAISE NOTICE 'Feature Flags Schema Migration completed successfully!';
END $$;