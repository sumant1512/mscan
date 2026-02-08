-- ============================================
-- 004 Template-Based Product System
-- ============================================
-- This migration creates the template system for dynamic product management

-- ============================================
-- PRODUCT TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  industry_type VARCHAR(50),
  description TEXT,

  -- Variant configuration (JSONB)
  -- Defines how product variants work (dimensions + common fields)
  variant_config JSONB NOT NULL DEFAULT '{
    "variant_label": "Variant",
    "dimensions": [],
    "common_fields": []
  }'::jsonb,

  -- Custom fields configuration (JSONB)
  -- Defines product-specific fields
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_template_name_per_tenant UNIQUE (tenant_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_product_templates_tenant ON product_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_industry ON product_templates(industry_type);
CREATE INDEX IF NOT EXISTS idx_product_templates_active ON product_templates(is_active) WHERE is_active = true;

COMMENT ON TABLE product_templates IS 'Product templates define the structure for different product types';
COMMENT ON COLUMN product_templates.variant_config IS 'JSONB configuration for product variants (dimensions + common fields)';
COMMENT ON COLUMN product_templates.custom_fields IS 'JSONB array of custom field definitions';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_product_templates_updated_at ON product_templates;
CREATE TRIGGER update_product_templates_updated_at
BEFORE UPDATE ON product_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TAGS (Replaces Categories)
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- Material Icon name (e.g., 'format_paint', 'home')
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_tag_per_app UNIQUE (tenant_id, verification_app_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_app ON tags(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tenant_id, verification_app_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(is_active) WHERE is_active = true;

COMMENT ON TABLE tags IS 'Tags for organizing products (replaces categories)';
COMMENT ON COLUMN tags.icon IS 'Material Icon name for visual representation';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PRODUCT-TAGS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_tags (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag_id);

COMMENT ON TABLE product_tags IS 'Many-to-many relationship between products and tags';

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Add template_id to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE products ADD COLUMN template_id UUID REFERENCES product_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_template ON products(template_id);

COMMENT ON COLUMN products.template_id IS 'Reference to product template that defines structure';

-- Add template_id to verification_apps table (default template for app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_apps' AND column_name = 'default_template_id'
  ) THEN
    ALTER TABLE verification_apps ADD COLUMN default_template_id UUID REFERENCES product_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_verification_apps_template ON verification_apps(default_template_id);

COMMENT ON COLUMN verification_apps.default_template_id IS 'Default template for products created in this app';

-- ============================================
-- VALIDATION CONSTRAINTS
-- ============================================

-- Ensure variant_config has required structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_variant_config_structure'
  ) THEN
    ALTER TABLE product_templates ADD CONSTRAINT check_variant_config_structure
    CHECK (
      variant_config ? 'variant_label' AND
      variant_config ? 'dimensions' AND
      variant_config ? 'common_fields'
    );
  END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get all tags for a verification app
CREATE OR REPLACE FUNCTION get_tags_for_app(app_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(100),
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.description, t.icon, t.is_active
  FROM tags t
  WHERE t.verification_app_id = app_id AND t.is_active = true
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get product tags
CREATE OR REPLACE FUNCTION get_product_tags(prod_id INTEGER)
RETURNS TABLE (
  tag_id UUID,
  tag_name VARCHAR(100),
  tag_icon VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.icon
  FROM tags t
  JOIN product_tags pt ON pt.tag_id = t.id
  WHERE pt.product_id = prod_id AND t.is_active = true
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (Optional - can be removed in production)
-- ============================================

-- This will be populated by seed script
