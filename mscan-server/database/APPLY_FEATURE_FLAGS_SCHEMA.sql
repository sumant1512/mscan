-- Feature Flags Schema Migration
-- Add feature flags system to existing databases

-- First, create the helper function if it doesn't exist
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'is_feature_enabled_for_tenant';

    IF func_count = 0 THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION is_feature_enabled_for_tenant(p_feature_code VARCHAR(100), p_tenant_id UUID)
        RETURNS BOOLEAN AS $func$
        DECLARE
            ancestor_enabled BOOLEAN := true;
            ancestor_record RECORD;
        BEGIN
            -- Check all ancestors (including self) are enabled
            FOR ancestor_record IN
                WITH RECURSIVE feature_ancestors AS (
                    -- Start with the target feature
                    SELECT id, parent_id, default_enabled
                    FROM features
                    WHERE code = p_feature_code AND is_active = true
                    
                    UNION ALL
                    
                    -- Recursively get parents
                    SELECT f.id, f.parent_id, f.default_enabled
                    FROM features f
                    INNER JOIN feature_ancestors fa ON fa.parent_id = f.id
                )
                SELECT id, default_enabled FROM feature_ancestors
            LOOP
                -- For each ancestor, check tenant override or default
                SELECT COALESCE(tf.enabled, ancestor_record.default_enabled) INTO ancestor_enabled
                FROM (SELECT ancestor_record.id AS feature_id, ancestor_record.default_enabled) AS f
                LEFT JOIN tenant_features tf ON tf.feature_id = f.feature_id AND tf.tenant_id = p_tenant_id;
                
                -- If any ancestor is disabled, return false
                IF NOT ancestor_enabled THEN
                    RETURN false;
                END IF;
            END LOOP;
            
            -- All ancestors enabled
            RETURN true;
        END;
        $func$ LANGUAGE plpgsql;';

        RAISE NOTICE 'Feature check function created successfully';
    ELSE
        -- Drop and recreate to update with tree logic
        EXECUTE ''DROP FUNCTION is_feature_enabled_for_tenant(VARCHAR(100), UUID);'';
        EXECUTE '
        CREATE OR REPLACE FUNCTION is_feature_enabled_for_tenant(p_feature_code VARCHAR(100), p_tenant_id UUID)
        RETURNS BOOLEAN AS $func$
        DECLARE
            ancestor_enabled BOOLEAN := true;
            ancestor_record RECORD;
        BEGIN
            -- Check all ancestors (including self) are enabled
            FOR ancestor_record IN
                WITH RECURSIVE feature_ancestors AS (
                    -- Start with the target feature
                    SELECT id, parent_id, default_enabled
                    FROM features
                    WHERE code = p_feature_code AND is_active = true
                    
                    UNION ALL
                    
                    -- Recursively get parents
                    SELECT f.id, f.parent_id, f.default_enabled
                    FROM features f
                    INNER JOIN feature_ancestors fa ON fa.parent_id = f.id
                )
                SELECT id, default_enabled FROM feature_ancestors
            LOOP
                -- For each ancestor, check tenant override or default
                SELECT COALESCE(tf.enabled, ancestor_record.default_enabled) INTO ancestor_enabled
                FROM (SELECT ancestor_record.id AS feature_id, ancestor_record.default_enabled) AS f
                LEFT JOIN tenant_features tf ON tf.feature_id = f.feature_id AND tf.tenant_id = p_tenant_id;
                
                -- If any ancestor is disabled, return false
                IF NOT ancestor_enabled THEN
                    RETURN false;
                END IF;
            END LOOP;
            
            -- All ancestors enabled
            RETURN true;
        END;
        $func$ LANGUAGE plpgsql;';

        RAISE NOTICE 'Feature check function updated successfully';
    END IF;
END $$;

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

    -- Check if created_by column exists in features table
    SELECT COUNT(*) INTO table_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'features' AND column_name = 'created_by';

    IF table_count = 0 THEN
        RAISE NOTICE 'Adding created_by column to features table...';

        ALTER TABLE features ADD COLUMN created_by UUID;
        ALTER TABLE features ADD CONSTRAINT fk_features_created_by
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

        RAISE NOTICE 'created_by column added successfully';
    ELSE
        RAISE NOTICE 'created_by column already exists in features table';
    END IF;

    -- Check if parent_id column exists in features table
    SELECT COUNT(*) INTO table_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'features' AND column_name = 'parent_id';

    IF table_count = 0 THEN
        RAISE NOTICE 'Adding parent_id column to features table...';

        ALTER TABLE features ADD COLUMN parent_id UUID;
        ALTER TABLE features ADD CONSTRAINT fk_features_parent_id
            FOREIGN KEY (parent_id) REFERENCES features(id) ON DELETE SET NULL;

        RAISE NOTICE 'parent_id column added successfully';
    ELSE
        RAISE NOTICE 'parent_id column already exists in features table';
    END IF;

    RAISE NOTICE 'Feature Flags Schema Migration completed successfully!';
END $$;