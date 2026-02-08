-- Migration: Dynamic Product Attributes and API Integration
-- Version: 003
-- Date: 2026-01-22
-- Description: Adds template system for dynamic product attributes and external API integration

-- ============================================================
-- PHASE 1: Create New Tables
-- ============================================================

-- 1. Product Templates Table
CREATE TABLE IF NOT EXISTS product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry_type VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Material icon name
  is_system_template BOOLEAN DEFAULT false, -- System templates can't be edited
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_tenant_template_name UNIQUE (tenant_id, name),
  CONSTRAINT check_industry_type CHECK (
    industry_type IN ('basic', 'clothing', 'footwear', 'jewelry', 'paint',
                      'bags', 'electronics', 'cosmetics', 'food', 'furniture',
                      'sports', 'custom')
  )
);

CREATE INDEX idx_product_templates_tenant ON product_templates(tenant_id);
CREATE INDEX idx_product_templates_industry ON product_templates(industry_type);
CREATE INDEX idx_product_templates_active ON product_templates(is_active) WHERE is_active = true;

COMMENT ON TABLE product_templates IS 'Template definitions for different product industries';
COMMENT ON COLUMN product_templates.is_system_template IS 'System templates are read-only, created by MScan';
COMMENT ON COLUMN product_templates.industry_type IS 'Industry category: clothing, jewelry, electronics, etc.';

-- 2. Template Attributes Table
CREATE TABLE IF NOT EXISTS template_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL, -- Display name: "Size"
  attribute_key VARCHAR(100) NOT NULL, -- Machine name: "size"
  data_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB, -- {"min": 0, "max": 100, "allowed_values": ["S", "M", "L"]}
  default_value TEXT,
  display_order INTEGER DEFAULT 0,
  field_group VARCHAR(100), -- Group related fields: "dimensions", "specifications"
  help_text TEXT,
  placeholder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_template_attr_key UNIQUE (template_id, attribute_key),
  CONSTRAINT check_data_type CHECK (
    data_type IN ('string', 'number', 'boolean', 'date', 'select', 'multi-select', 'url', 'email')
  )
);

CREATE INDEX idx_template_attributes_template ON template_attributes(template_id);
CREATE INDEX idx_template_attributes_order ON template_attributes(template_id, display_order);
CREATE INDEX idx_template_attributes_validation ON template_attributes USING GIN (validation_rules);

COMMENT ON TABLE template_attributes IS 'Defines attributes (fields) for each product template';
COMMENT ON COLUMN template_attributes.attribute_key IS 'Machine-readable key used in API and storage';
COMMENT ON COLUMN template_attributes.validation_rules IS 'JSON validation rules for the attribute';
COMMENT ON COLUMN template_attributes.field_group IS 'Used to group related fields in UI';

-- 3. Product Attribute Values Table
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_key VARCHAR(100) NOT NULL,
  attribute_value JSONB NOT NULL, -- Flexible storage: string, number, array, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_product_attribute UNIQUE (product_id, attribute_key)
);

CREATE INDEX idx_product_attribute_product ON product_attribute_values(product_id);
CREATE INDEX idx_product_attribute_key ON product_attribute_values(attribute_key);
CREATE INDEX idx_product_attribute_value ON product_attribute_values USING GIN (attribute_value);

COMMENT ON TABLE product_attribute_values IS 'Stores actual attribute values for each product';
COMMENT ON COLUMN product_attribute_values.attribute_value IS 'JSON value - can be string, number, array, boolean, etc.';

-- ============================================================
-- PHASE 2: Modify Existing Tables
-- ============================================================

-- 4. Add template_id to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES product_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_template ON products(template_id);

COMMENT ON COLUMN products.template_id IS 'References the product template used for this product';

-- 5. Enhance verification_apps table for API configuration
ALTER TABLE verification_apps
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES product_templates(id),
  ADD COLUMN IF NOT EXISTS mobile_api_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ecommerce_api_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_api_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ecommerce_api_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS api_rate_limits JSONB DEFAULT '{"mobile_rpm": 60, "ecommerce_rpm": 120}'::jsonb,
  ADD COLUMN IF NOT EXISTS api_field_mappings JSONB DEFAULT '{"mobile": [], "ecommerce": []}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_verification_apps_mobile_key ON verification_apps(mobile_api_key) WHERE mobile_api_enabled = true;
CREATE INDEX IF NOT EXISTS idx_verification_apps_ecommerce_key ON verification_apps(ecommerce_api_key) WHERE ecommerce_api_enabled = true;
CREATE INDEX IF NOT EXISTS idx_verification_apps_template ON verification_apps(template_id);

COMMENT ON COLUMN verification_apps.template_id IS 'Default template for products in this verification app';
COMMENT ON COLUMN verification_apps.mobile_api_enabled IS 'Enable Mobile App API v2 for product catalog access';
COMMENT ON COLUMN verification_apps.ecommerce_api_enabled IS 'Enable E-commerce API for full catalog access';
COMMENT ON COLUMN verification_apps.mobile_api_key IS 'API key for mobile app product catalog access';
COMMENT ON COLUMN verification_apps.ecommerce_api_key IS 'API key for e-commerce platform integration';
COMMENT ON COLUMN verification_apps.api_rate_limits IS 'Rate limits: {"mobile_rpm": 60, "ecommerce_rpm": 120}';
COMMENT ON COLUMN verification_apps.api_field_mappings IS 'Field mappings: {"mobile": [], "ecommerce": []}';

-- ============================================================
-- PHASE 3: Create API Usage Tracking Table (Optional)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  api_type VARCHAR(20) NOT NULL, -- 'mobile' or 'ecommerce'
  api_key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of API key
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_api_type CHECK (api_type IN ('mobile', 'ecommerce'))
);

CREATE INDEX idx_api_usage_app ON api_usage_logs(verification_app_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage_logs(request_timestamp);
CREATE INDEX idx_api_usage_app_type ON api_usage_logs(verification_app_id, api_type);

COMMENT ON TABLE api_usage_logs IS 'Tracks API usage for analytics and rate limiting';
COMMENT ON COLUMN api_usage_logs.api_key_hash IS 'Hashed API key for security (not plaintext)';

-- ============================================================
-- PHASE 4: Update Timestamp Triggers
-- ============================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
CREATE TRIGGER update_product_templates_updated_at
    BEFORE UPDATE ON product_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_attribute_values_updated_at
    BEFORE UPDATE ON product_attribute_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Migration Verification
-- ============================================================

-- Verify all tables exist
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('product_templates', 'template_attributes', 'product_attribute_values', 'api_usage_logs')) = 4,
           'Not all tables created successfully';

    RAISE NOTICE 'Migration 003: Dynamic Product Attributes - COMPLETED';
    RAISE NOTICE 'Tables created: product_templates, template_attributes, product_attribute_values, api_usage_logs';
    RAISE NOTICE 'Products table enhanced with template_id';
    RAISE NOTICE 'Verification apps enhanced with API configuration';
END $$;
