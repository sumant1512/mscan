-- MScan Full Database Setup (Fresh Installation Only)
-- Run this on a FRESH database to create complete schema
-- This is NOT for upgrading existing databases - use migrations for that

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE batch_status AS ENUM ('draft', 'code_assigned', 'activated', 'live', 'completed');

-- ============================================
-- TRIGGER FUNCTION (used by multiple tables)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- BASE SCHEMA - TENANTS & USERS
-- ============================================

-- TENANTS
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active',
    contact_person VARCHAR(255),
    created_by UUID, -- References the SUPER_ADMIN user who created this tenant
    subdomain_slug VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_subdomain_slug_format CHECK (subdomain_slug IS NULL OR subdomain_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
    CONSTRAINT tenants_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT unique_tenant_subdomain_slug UNIQUE (subdomain_slug)
);

CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain_slug);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_e164 VARCHAR(20),
  email VARCHAR(255),
  full_name VARCHAR(120),
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_phone_or_email CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT uq_tenant_phone UNIQUE (tenant_id, phone_e164),
  CONSTRAINT uq_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_super_admin_no_tenant CHECK (
        (role = 'SUPER_ADMIN' AND tenant_id IS NULL) OR
        (role != 'SUPER_ADMIN' AND tenant_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for tenants.created_by now that users table exists
-- This references the SUPER_ADMIN who created the tenant
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- OTP
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_otp UNIQUE (email, otp_code)
);

CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_email_not_used ON otps(email, is_used) WHERE is_used = false;

-- TOKEN BLACKLIST
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('ACCESS', 'REFRESH')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    target_type VARCHAR(50),
    target_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id) WHERE target_type IS NOT NULL;

-- ============================================
-- VERIFICATION APPS
-- ============================================
CREATE TABLE IF NOT EXISTS verification_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  api_key VARCHAR(255),
  display_name VARCHAR(255),
  description TEXT,
  business_type VARCHAR(100),
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  welcome_message TEXT,
  scan_success_message TEXT DEFAULT 'Coupon verified successfully!',
  scan_failure_message TEXT DEFAULT 'Invalid or expired coupon.',
  post_scan_redirect_url TEXT,
  enable_scanning BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  currency VARCHAR(3) DEFAULT 'INR',
  template_id UUID,  -- FK added after product_templates created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_verification_app_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF', 'SGD', 'AED', 'MYR', 'THB', 'ZAR', 'NZD', 'MXN', 'BRL', 'KRW', 'HKD', 'SEK', 'NOK', 'DKK'))
);

CREATE INDEX IF NOT EXISTS idx_verification_apps_tenant ON verification_apps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_apps_code ON verification_apps(code);
CREATE INDEX IF NOT EXISTS idx_verification_apps_api_key ON verification_apps(api_key);

CREATE TRIGGER update_verification_apps_updated_at BEFORE UPDATE ON verification_apps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PRODUCT TEMPLATES & DYNAMIC ATTRIBUTES
-- ============================================

-- Product Templates
CREATE TABLE IF NOT EXISTS product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  industry_type VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  variant_config JSONB NOT NULL DEFAULT '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_template_name UNIQUE (tenant_id, template_name),
  CONSTRAINT check_industry_type CHECK (
    industry_type IN ('basic', 'clothing', 'footwear', 'jewelry', 'paint',
                      'bags', 'electronics', 'cosmetics', 'food', 'furniture',
                      'sports', 'custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_product_templates_tenant ON product_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_industry ON product_templates(industry_type);
CREATE INDEX IF NOT EXISTS idx_product_templates_active ON product_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_templates_tenant_active ON product_templates(tenant_id, is_active);

COMMENT ON TABLE product_templates IS 'Template definitions for different product industries';
COMMENT ON COLUMN product_templates.template_name IS 'Name of the template (e.g., "Wall Paint", "T-Shirt")';
COMMENT ON COLUMN product_templates.variant_config IS 'JSONB configuration for product variants (dimensions + common fields)';
COMMENT ON COLUMN product_templates.custom_fields IS 'JSONB array of custom field definitions';

CREATE TRIGGER update_product_templates_updated_at BEFORE UPDATE ON product_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK constraint to verification_apps now that product_templates exists
ALTER TABLE verification_apps ADD CONSTRAINT fk_verification_apps_template
    FOREIGN KEY (template_id) REFERENCES product_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_verification_apps_template ON verification_apps(template_id);

-- Template Attributes
CREATE TABLE IF NOT EXISTS template_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL,
  attribute_key VARCHAR(100) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB,
  default_value TEXT,
  display_order INTEGER DEFAULT 0,
  field_group VARCHAR(100),
  help_text TEXT,
  placeholder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_template_attr_key UNIQUE (template_id, attribute_key),
  CONSTRAINT check_data_type CHECK (
    data_type IN ('string', 'number', 'boolean', 'date', 'select', 'multi-select', 'url', 'email')
  )
);

CREATE INDEX IF NOT EXISTS idx_template_attributes_template ON template_attributes(template_id);
CREATE INDEX IF NOT EXISTS idx_template_attributes_order ON template_attributes(template_id, display_order);
CREATE INDEX IF NOT EXISTS idx_template_attributes_validation ON template_attributes USING GIN (validation_rules);

COMMENT ON TABLE template_attributes IS 'Defines attributes (fields) for each product template';
COMMENT ON COLUMN template_attributes.attribute_key IS 'Machine-readable key used in API and storage';

-- ============================================
-- PRODUCTS CATALOG
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  image_url TEXT,
  thumbnail_url TEXT NOT NULL,
  product_images JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'active',
  template_id UUID REFERENCES product_templates(id) ON DELETE SET NULL,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
  category_id INTEGER,  -- FK added after categories created
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  track_inventory BOOLEAN DEFAULT false,
  allow_backorder BOOLEAN DEFAULT false,
  stock_status VARCHAR(50) DEFAULT 'in_stock',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_stock_quantity_positive CHECK (stock_quantity >= 0),
  CONSTRAINT check_low_stock_threshold_positive CHECK (low_stock_threshold >= 0),
  CONSTRAINT check_stock_status CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued'))
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(tenant_id, product_name);
CREATE INDEX IF NOT EXISTS idx_products_template ON products(template_id);
CREATE INDEX IF NOT EXISTS idx_products_verification_app ON products(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status) WHERE track_inventory = true;
CREATE INDEX IF NOT EXISTS idx_products_tenant_app ON products(tenant_id, verification_app_id) WHERE is_active = true;

COMMENT ON TABLE products IS 'Product catalog for tenants';
COMMENT ON COLUMN products.template_id IS 'References the product template used for this product';
COMMENT ON COLUMN products.verification_app_id IS 'Links product to a specific verification app';
COMMENT ON COLUMN products.attributes IS 'Dynamic product attributes stored as JSONB based on template';
COMMENT ON COLUMN products.thumbnail_url IS 'Main/featured image URL for the product (mandatory)';
COMMENT ON COLUMN products.product_images IS 'Array of product image objects with url, is_first, and order fields';
COMMENT ON COLUMN products.stock_quantity IS 'Current available stock quantity';
COMMENT ON COLUMN products.low_stock_threshold IS 'Threshold for low stock alerts';
COMMENT ON COLUMN products.track_inventory IS 'Whether to track inventory for this product';
COMMENT ON COLUMN products.allow_backorder IS 'Allow orders when out of stock';
COMMENT ON COLUMN products.stock_status IS 'Current stock status: in_stock, low_stock, out_of_stock, discontinued';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Product Attribute Values
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_key VARCHAR(100) NOT NULL,
  attribute_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_product_attribute UNIQUE (product_id, attribute_key)
);

CREATE INDEX IF NOT EXISTS idx_product_attribute_product ON product_attribute_values(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_key ON product_attribute_values(attribute_key);
CREATE INDEX IF NOT EXISTS idx_product_attribute_value ON product_attribute_values USING GIN (attribute_value);

COMMENT ON TABLE product_attribute_values IS 'Stores actual attribute values for each product';

CREATE TRIGGER update_product_attributes_updated_at BEFORE UPDATE ON product_attribute_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_app_category UNIQUE (tenant_id, verification_app_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_app ON categories(verification_app_id);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK constraint to products now that categories exists
ALTER TABLE products ADD CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Product Categories (junction table)
CREATE TABLE IF NOT EXISTS product_categories (
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tag_name_per_app UNIQUE (verification_app_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_verification_app_id ON tags(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

COMMENT ON TABLE tags IS 'Tags for organizing and categorizing products within verification apps';
COMMENT ON COLUMN tags.verification_app_id IS 'Tags belong to a specific verification app';

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Product-Tags Junction Table
CREATE TABLE IF NOT EXISTS product_tags (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag_id);

COMMENT ON TABLE product_tags IS 'Many-to-many relationship between products and tags';

-- Helper function: Get all tags for a verification app
CREATE OR REPLACE FUNCTION get_tags_for_app(app_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
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

-- Helper function: Get tags for a product
CREATE OR REPLACE FUNCTION get_product_tags(prod_id INTEGER)
RETURNS TABLE (
  tag_id UUID,
  tag_name VARCHAR(100),
  tag_icon VARCHAR(50)
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
-- REWARD CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS reward_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
  campaign_name VARCHAR(255) NOT NULL,
  description TEXT,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('DISCOUNT', 'CASHBACK', 'POINTS', 'GIFT')),
  reward_value DECIMAL(10,2),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reward_campaigns_tenant ON reward_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reward_campaigns_app ON reward_campaigns(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_reward_campaigns_active ON reward_campaigns(is_active);

CREATE TRIGGER update_reward_campaigns_updated_at BEFORE UPDATE ON reward_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COUPON BATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
  batch_name VARCHAR(255) NOT NULL,
  dealer_name VARCHAR(255),
  zone VARCHAR(100),
  total_coupons INTEGER NOT NULL CHECK (total_coupons > 0),
  serial_number_start INTEGER,
  serial_number_end INTEGER,
  batch_status batch_status DEFAULT 'draft',
  activated_at TIMESTAMP,
  activation_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_batches_tenant ON coupon_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_status ON coupon_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_created_at ON coupon_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_dealer ON coupon_batches(dealer_name);

CREATE TRIGGER update_coupon_batches_updated_at BEFORE UPDATE ON coupon_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COUPONS (COMPLETE SCHEMA)
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
  coupon_code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  discount_currency VARCHAR(3) DEFAULT 'USD',
  buy_quantity INTEGER CHECK (buy_quantity IS NULL OR buy_quantity > 0),
  get_quantity INTEGER CHECK (get_quantity IS NULL OR get_quantity > 0),
  min_purchase_amount DECIMAL(10,2) CHECK (min_purchase_amount IS NULL OR min_purchase_amount >= 0),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_usage_limit INTEGER NOT NULL DEFAULT 1 CHECK (total_usage_limit > 0),
  per_user_usage_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_user_usage_limit > 0),
  current_usage_count INTEGER DEFAULT 0 CHECK (current_usage_count >= 0),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'printed', 'active', 'used', 'inactive', 'expired', 'exhausted')),
  qr_code_url TEXT,
  description TEXT,
  terms TEXT,
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
  max_scans_per_code INTEGER NOT NULL DEFAULT 1 CHECK (max_scans_per_code > 0),
  batch_id UUID REFERENCES coupon_batches(id) ON DELETE SET NULL,
  batch_quantity INTEGER,
  code_type VARCHAR(20) DEFAULT 'random' CHECK (code_type IN ('random', 'sequential')),
  code_prefix VARCHAR(20),
  coupon_reference VARCHAR(20) UNIQUE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  serial_number INTEGER,
  campaign_id UUID REFERENCES reward_campaigns(id) ON DELETE SET NULL,
  reward_amount DECIMAL(10,2) DEFAULT 0,
  printed_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  coupon_points INTEGER,
  printed_count INTEGER DEFAULT 0,
  activation_note TEXT,
  deactivation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_expiry_future CHECK (expiry_date > created_at),
  CONSTRAINT chk_buy_get_consistency CHECK (
    (discount_type = 'BUY_X_GET_Y' AND buy_quantity IS NOT NULL AND get_quantity IS NOT NULL) OR
    (discount_type != 'BUY_X_GET_Y' AND buy_quantity IS NULL AND get_quantity IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_expiry ON coupons(expiry_date);
CREATE INDEX IF NOT EXISTS idx_coupons_app ON coupons(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons(created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_batch ON coupons(batch_id);
CREATE INDEX IF NOT EXISTS idx_coupons_scan_limit ON coupons(max_scans_per_code) WHERE max_scans_per_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_code_type ON coupons(code_type);
CREATE INDEX IF NOT EXISTS idx_coupons_code_prefix ON coupons(tenant_id, code_prefix) WHERE code_prefix IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_reference ON coupons(coupon_reference);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_reference ON coupons(tenant_id, coupon_reference);
CREATE INDEX IF NOT EXISTS idx_coupons_product ON coupons(product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_serial ON coupons(serial_number);
CREATE INDEX IF NOT EXISTS idx_coupons_campaign ON coupons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_coupons_product_sku ON coupons(product_sku);
CREATE INDEX IF NOT EXISTS idx_coupons_product_name ON coupons(product_name);
CREATE INDEX IF NOT EXISTS idx_coupons_points ON coupons(coupon_points);
CREATE INDEX IF NOT EXISTS idx_coupons_status_lifecycle ON coupons(status) WHERE status IN ('draft', 'printed', 'active');
CREATE INDEX IF NOT EXISTS idx_coupons_printed_at ON coupons(printed_at);
CREATE INDEX IF NOT EXISTS idx_coupons_activated_at ON coupons(activated_at);

COMMENT ON COLUMN coupons.max_scans_per_code IS 'Maximum scans per code. NULL = unlimited, 1 = single-use, N = limited';
COMMENT ON COLUMN coupons.batch_id IS 'UUID grouping coupons in the same batch';
COMMENT ON COLUMN coupons.product_id IS 'Link to product in catalog (optional)';
COMMENT ON COLUMN coupons.product_name IS 'Name of the product this coupon applies to';
COMMENT ON COLUMN coupons.product_sku IS 'SKU identifier for the product';

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Coupon status validation trigger
CREATE OR REPLACE FUNCTION validate_coupon_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
        IF OLD.status = 'draft' AND NEW.status NOT IN ('printed', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
        END IF;
        IF OLD.status = 'printed' AND NEW.status NOT IN ('active', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from printed to %', NEW.status;
        END IF;
        IF OLD.status = 'active' AND NEW.status NOT IN ('used', 'inactive', 'expired', 'exhausted') THEN
            RAISE EXCEPTION 'Invalid transition from active to %', NEW.status;
        END IF;
        IF OLD.status = 'used' AND NEW.status NOT IN ('used', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from used to %', NEW.status;
        END IF;
    END IF;

    IF NEW.status = 'printed' AND OLD.status = 'draft' THEN
        NEW.printed_at = COALESCE(NEW.printed_at, CURRENT_TIMESTAMP);
        NEW.printed_count = COALESCE(NEW.printed_count, 0) + 1;
    END IF;

    IF NEW.status = 'active' AND OLD.status IN ('draft', 'printed') THEN
        NEW.activated_at = COALESCE(NEW.activated_at, CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_coupon_status_transition
BEFORE UPDATE ON coupons
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION validate_coupon_status_transition();

-- Auto-update coupon status trigger
CREATE OR REPLACE FUNCTION update_coupon_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        IF NEW.expiry_date <= CURRENT_TIMESTAMP THEN
            NEW.status = 'expired';
        END IF;
        IF NEW.total_usage_limit IS NOT NULL
           AND NEW.current_usage_count >= NEW.total_usage_limit THEN
            NEW.status = 'exhausted';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_status
BEFORE UPDATE ON coupons
FOR EACH ROW
EXECUTE FUNCTION update_coupon_status();

-- Function to generate next sequential coupon reference per tenant
CREATE OR REPLACE FUNCTION get_next_coupon_reference(p_tenant_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_max_num INTEGER;
    v_next_ref VARCHAR(20);
BEGIN
    -- Find the maximum reference number for this tenant
    SELECT COALESCE(
        MAX(
            CASE
                WHEN coupon_reference ~ '^CP-[0-9]+$'
                THEN CAST(SUBSTRING(coupon_reference FROM 4) AS INTEGER)
                ELSE 0
            END
        ),
        0
    ) INTO v_max_num
    FROM coupons
    WHERE tenant_id = p_tenant_id;

    -- Generate next reference with zero-padding
    v_next_ref := 'CP-' || LPAD((v_max_num + 1)::TEXT, 3, '0');

    RETURN v_next_ref;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SCANS
-- ============================================
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  customer_id UUID,
  scan_status VARCHAR(50) NOT NULL CHECK (scan_status IN ('SUCCESS', 'EXPIRED', 'EXHAUSTED', 'INVALID', 'INACTIVE', 'NOT_ACTIVE', 'USED', 'NOT_PRINTED')),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  location_address TEXT,
  customer_city VARCHAR(255),
  customer_state VARCHAR(100),
  device_info TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_tenant ON scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scans_coupon ON scans(coupon_id);
CREATE INDEX IF NOT EXISTS idx_scans_customer ON scans(customer_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(scan_status);
CREATE INDEX IF NOT EXISTS idx_scans_tenant_date ON scans(tenant_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_city ON scans(tenant_id, customer_city);
CREATE INDEX IF NOT EXISTS idx_scans_location ON scans(tenant_id, latitude, longitude);

-- ============================================
-- SCAN HISTORY (legacy table)
-- ============================================
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  customer_id UUID,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  location_address TEXT,
  customer_city VARCHAR(255),
  customer_state VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_history_tenant ON scan_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_coupon ON scan_history(coupon_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON scan_history(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_history_tenant_date ON scan_history(tenant_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_history_city ON scan_history(tenant_id, customer_city);
CREATE INDEX IF NOT EXISTS idx_scan_history_location ON scan_history(tenant_id, latitude, longitude);

-- ============================================
-- COUPON CODE SEQUENCES
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prefix VARCHAR(20) NOT NULL,
  last_sequence_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_prefix UNIQUE (tenant_id, prefix)
);

CREATE INDEX IF NOT EXISTS idx_coupon_code_sequences_tenant ON coupon_code_sequences(tenant_id);

CREATE TRIGGER update_coupon_code_sequences_updated_at BEFORE UPDATE ON coupon_code_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SERIAL NUMBER TRACKER
-- ============================================
CREATE TABLE IF NOT EXISTS serial_number_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE CASCADE,
  last_serial_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_app_serial UNIQUE (tenant_id, verification_app_id)
);

CREATE INDEX IF NOT EXISTS idx_serial_number_tracker_tenant ON serial_number_tracker(tenant_id);
CREATE INDEX IF NOT EXISTS idx_serial_number_tracker_app ON serial_number_tracker(verification_app_id);

CREATE TRIGGER update_serial_number_tracker_updated_at BEFORE UPDATE ON serial_number_tracker
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INVENTORY MANAGEMENT
-- ============================================

-- Stock Movements (audit log for inventory changes)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON stock_movements(tenant_id, created_at DESC);

COMMENT ON TABLE stock_movements IS 'Audit log for all stock/inventory changes';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type: restock, sale, adjustment, reservation, return';
COMMENT ON COLUMN stock_movements.reference_type IS 'Related entity: order, coupon_scan, manual, etc.';

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  webhook_url TEXT NOT NULL,
  secret_key VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_app_event ON webhooks(verification_app_id, event_type) WHERE is_active = true;

COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON COLUMN webhooks.event_type IS 'Event types: low_stock, out_of_stock, product_updated, order_created, etc.';
COMMENT ON COLUMN webhooks.secret_key IS 'Secret key for webhook signature validation';

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_status VARCHAR(50) NOT NULL,
  attempts INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(delivery_status, created_at DESC);

COMMENT ON TABLE webhook_logs IS 'Logs for webhook delivery attempts';
COMMENT ON COLUMN webhook_logs.delivery_status IS 'Status: pending, success, failed, retrying';

-- Auto-update stock status trigger
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_inventory = true THEN
    IF NEW.stock_quantity <= 0 THEN
      NEW.stock_status = 'out_of_stock';
    ELSIF NEW.stock_quantity <= NEW.low_stock_threshold THEN
      NEW.stock_status = 'low_stock';
    ELSE
      NEW.stock_status = 'in_stock';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_status
  BEFORE INSERT OR UPDATE OF stock_quantity, low_stock_threshold, track_inventory
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_status();

COMMENT ON FUNCTION update_product_stock_status() IS 'Automatically updates stock_status based on quantity and threshold';

-- Auto-log stock movements trigger
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity AND NEW.track_inventory = true THEN
    INSERT INTO stock_movements (
      product_id, tenant_id, movement_type, quantity,
      previous_quantity, new_quantity, notes
    ) VALUES (
      NEW.id, NEW.tenant_id,
      CASE
        WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'restock'
        WHEN NEW.stock_quantity < OLD.stock_quantity THEN 'deduction'
        ELSE 'adjustment'
      END,
      ABS(NEW.stock_quantity - OLD.stock_quantity),
      OLD.stock_quantity, NEW.stock_quantity,
      'Automatic stock movement log'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_stock_movement
  AFTER UPDATE OF stock_quantity
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_movement();

COMMENT ON FUNCTION log_stock_movement() IS 'Automatically logs stock movements when quantity changes';

-- ============================================
-- CREDIT MANAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_received INTEGER NOT NULL DEFAULT 0 CHECK (total_received >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_credit_balance_tenant ON tenant_credit_balance(tenant_id);

CREATE TRIGGER update_tenant_credit_balance_updated_at BEFORE UPDATE ON tenant_credit_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_amount INTEGER NOT NULL CHECK (requested_amount > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  justification TEXT,
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_requests_tenant ON credit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(status);
CREATE INDEX IF NOT EXISTS idx_credit_requests_requested_by ON credit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_credit_requests_processed_by ON credit_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_credit_requests_requested_at ON credit_requests(requested_at);

CREATE TRIGGER update_credit_requests_updated_at BEFORE UPDATE ON credit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'REFUND')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant ON credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- ============================================
-- USER CREDITS (Reward Credits)
-- ============================================
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    credit_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_tenant ON user_credits(tenant_id);

COMMENT ON TABLE user_credits IS 'User reward credits - shared across all verification apps';
COMMENT ON COLUMN user_credits.credit_amount IS 'Current credit balance for user';

CREATE TABLE IF NOT EXISTS user_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_credit_id UUID NOT NULL REFERENCES user_credits(id) ON DELETE CASCADE,
    verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'adjusted', 'transferred')),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_user_credit ON user_credit_transactions(user_credit_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_app ON user_credit_transactions(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_created ON user_credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_type ON user_credit_transactions(transaction_type);

COMMENT ON TABLE user_credit_transactions IS 'Transaction history for user reward credits';
COMMENT ON COLUMN user_credit_transactions.verification_app_id IS 'Which app generated/consumed the credits';

-- ============================================
-- MOBILE & POINTS SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS customer_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_type VARCHAR(50),
  device_model VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  fcm_token TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_customer_device UNIQUE (customer_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_devices_customer ON customer_devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_devices_device_id ON customer_devices(device_id);

CREATE TRIGGER update_customer_devices_updated_at BEFORE UPDATE ON customer_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS mobile_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT false,
  device_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mobile_otps_phone ON mobile_otps(phone_e164);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_expires_at ON mobile_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_phone_not_used ON mobile_otps(phone_e164, is_used) WHERE is_used = false;

CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  device_id VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_customer ON scan_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_token ON scan_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_expires_at ON scan_sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_customer_tenant_points UNIQUE (customer_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_points_customer ON user_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_points_tenant ON user_points(tenant_id);

CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST')),
  points INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_points_transactions_customer ON points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_tenant ON points_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at);

CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_events_scan ON scan_events(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_type ON scan_events(event_type);
CREATE INDEX IF NOT EXISTS idx_scan_events_created_at ON scan_events(created_at);

-- ============================================
-- API USAGE LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE CASCADE,
  api_type VARCHAR(50) NOT NULL CHECK (api_type IN ('mobile', 'ecommerce', 'external')),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_app ON api_usage_logs(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_type ON api_usage_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(request_timestamp);

-- ============================================
-- PERMISSIONS SYSTEM
-- ============================================

-- Tenant User Roles
CREATE TABLE IF NOT EXISTS tenant_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_tenant_role UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_user ON tenant_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_roles_tenant ON tenant_user_roles(tenant_id);

CREATE TRIGGER update_tenant_user_roles_updated_at BEFORE UPDATE ON tenant_user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- App-Level User Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE CASCADE,
  permission_name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant ON user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_app ON user_permissions(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);

-- Permission Definitions (Dynamic Permission System)
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

CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope);
CREATE INDEX IF NOT EXISTS idx_permissions_created_at ON permissions(created_at DESC);

COMMENT ON TABLE permissions IS 'Stores reusable permission definitions that can be assigned to users or tenants';
COMMENT ON COLUMN permissions.code IS 'Unique permission identifier (e.g., tenant.user.create)';
COMMENT ON COLUMN permissions.scope IS 'Permission applicability: GLOBAL (system-wide), TENANT (tenant-specific), USER (user-specific)';
COMMENT ON COLUMN permissions.allowed_assigners IS 'Array of roles that can assign this permission';

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permission Assignments
CREATE TABLE IF NOT EXISTS permission_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_tenant_level BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT check_assignment_target CHECK (
        (is_tenant_level = true AND tenant_id IS NOT NULL AND user_id IS NULL) OR
        (is_tenant_level = false AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_permission_assignments_permission ON permission_assignments(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_tenant ON permission_assignments(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permission_assignments_user ON permission_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permission_assignments_tenant_user ON permission_assignments(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_assigned_at ON permission_assignments(assigned_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_assignments_unique_tenant
    ON permission_assignments(permission_id, tenant_id)
    WHERE is_tenant_level = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_assignments_unique_user
    ON permission_assignments(permission_id, user_id)
    WHERE is_tenant_level = false;

COMMENT ON TABLE permission_assignments IS 'Links permissions to tenants (tenant-level) or users (user-level)';
COMMENT ON COLUMN permission_assignments.is_tenant_level IS 'true = tenant-level assignment, false = user-level assignment';

-- Helper: Get effective permissions for a user (tenant-level + user-level)
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE(permission_code VARCHAR(255)) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.code
    FROM permissions p
    INNER JOIN permission_assignments pa ON p.id = pa.permission_id
    WHERE (
        (pa.is_tenant_level = true AND pa.tenant_id = p_tenant_id)
        OR
        (pa.is_tenant_level = false AND pa.user_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_effective_permissions IS 'Returns union of tenant-level and user-level permissions for a user';

-- ============================================
-- PERFORMANCE INDEXES (Trigram & Fuzzy Search)
-- ============================================

-- Trigram indexes for fuzzy search on product names
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (product_name gin_trgm_ops);
COMMENT ON INDEX idx_products_name_trgm IS 'GIN trigram index for fuzzy search on product names';

-- Trigram indexes for fuzzy search on template names
CREATE INDEX IF NOT EXISTS idx_templates_name_trgm ON product_templates USING GIN (template_name gin_trgm_ops);
COMMENT ON INDEX idx_templates_name_trgm IS 'GIN trigram index for fuzzy search on template names';

-- Partial indexes for template queries
CREATE INDEX IF NOT EXISTS idx_templates_system ON product_templates(tenant_id) WHERE is_system_template = true;
CREATE INDEX IF NOT EXISTS idx_templates_custom ON product_templates(tenant_id) WHERE is_system_template = false AND is_active = true;

-- ============================================
-- SEED DATA
-- ============================================

-- Super Admin User
INSERT INTO users (email, full_name, role, is_active)
VALUES ('admin@mscan.com', 'Super Admin', 'SUPER_ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- Initialize credit balance for all tenants (if any exist)
INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
SELECT id, 0, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- SEED: Permission Definitions
-- ============================================

-- App management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_app', 'Create Verification App', 'Allows creating new verification apps', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_app', 'Edit Verification App', 'Allows modifying verification app settings', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_app', 'Delete Verification App', 'Allows deleting verification apps', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_apps', 'View Verification Apps', 'Allows viewing verification apps', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Coupon management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_coupon', 'Create Coupon', 'Allows creating new coupons', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_coupon', 'Edit Coupon', 'Allows modifying coupon details and status', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_coupon', 'Delete Coupon', 'Allows deleting coupons', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_coupons', 'View Coupons', 'Allows viewing coupon list and details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Batch management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_batch', 'Create Coupon Batch', 'Allows creating coupon batches', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_batch', 'Edit Coupon Batch', 'Allows modifying coupon batch details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_batch', 'Delete Coupon Batch', 'Allows deleting coupon batches', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}')
ON CONFLICT (code) DO NOTHING;

-- Product management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_product', 'Create Product', 'Allows adding products to catalogue', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_product', 'Edit Product', 'Allows modifying product details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_product', 'Delete Product', 'Allows removing products from catalogue', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_products', 'View Products', 'Allows viewing product catalogue', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Category management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('create_category', 'Create Category', 'Allows creating product categories', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('edit_category', 'Edit Category', 'Allows modifying category details', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('delete_category', 'Delete Category', 'Allows deleting product categories', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_categories', 'View Categories', 'Allows viewing category list', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Credit management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('request_credits', 'Request Credits', 'Allows requesting credit top-ups', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}'),
('view_credit_balance', 'View Credit Balance', 'Allows viewing current credit balance', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}'),
('view_credit_transactions', 'View Credit Transactions', 'Allows viewing credit transaction history', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- Analytics permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('view_analytics', 'View Analytics', 'Allows viewing analytics dashboard', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}'),
('view_scans', 'View Scan History', 'Allows viewing coupon scan history', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN", "TENANT_USER"}')
ON CONFLICT (code) DO NOTHING;

-- User management permissions
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('manage_tenant_users', 'Manage Tenant Users', 'Allows managing users within tenant', 'TENANT', '{"SUPER_ADMIN", "TENANT_ADMIN"}')
ON CONFLICT (code) DO NOTHING;

-- System-level permissions (SUPER_ADMIN only)
INSERT INTO permissions (code, name, description, scope, allowed_assigners) VALUES
('manage_tenants', 'Manage Tenants', 'Full tenant CRUD operations', 'GLOBAL', '{"SUPER_ADMIN"}'),
('approve_credits', 'Approve Credit Requests', 'Approve or reject credit top-up requests', 'GLOBAL', '{"SUPER_ADMIN"}'),
('view_all_data', 'View All System Data', 'Access all system data across tenants', 'GLOBAL', '{"SUPER_ADMIN"}'),
('manage_system_settings', 'Manage System Settings', 'System configuration and settings', 'GLOBAL', '{"SUPER_ADMIN"}')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED: System Templates (requires a tenant)
-- ============================================
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get the first tenant (if any exist)
    SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'No tenants found - skipping system template seeding (run after first tenant is created)';
        RETURN;
    END IF;

    -- Skip if system templates already exist for this tenant
    IF EXISTS (SELECT 1 FROM product_templates WHERE tenant_id = v_tenant_id AND is_system_template = true) THEN
        RAISE NOTICE 'System templates already exist for tenant, skipping';
        RETURN;
    END IF;

    -- 1. Basic Product
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Basic Product', 'basic', 'Simple product template with essential fields only', 'inventory_2', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 2. Clothing & Apparel
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Clothing & Apparel', 'clothing', 'Template for shirts, pants, dresses, and other clothing items', 'checkroom', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 3. Footwear
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Footwear', 'footwear', 'Template for shoes, sandals, boots, and other footwear', 'run_circle', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 4. Jewelry & Accessories
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Jewelry & Accessories', 'jewelry', 'Template for rings, necklaces, bracelets, and other jewelry', 'diamond', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 5. Wall Paint & Coatings
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Wall Paint & Coatings', 'paint', 'Template for paints, varnishes, and coating products', 'format_paint', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 6. Bags & Luggage
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Bags & Luggage', 'bags', 'Template for backpacks, suitcases, handbags, and travel bags', 'work_outline', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 7. Electronics & Gadgets
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Electronics & Gadgets', 'electronics', 'Template for phones, tablets, laptops, and electronic devices', 'devices', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 8. Cosmetics & Beauty
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Cosmetics & Beauty', 'cosmetics', 'Template for skincare, makeup, fragrances, and beauty products', 'face_retouching_natural', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 9. Food & Beverage
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Food & Beverage', 'food', 'Template for packaged food items and beverages', 'restaurant', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 10. Home & Furniture
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Home & Furniture', 'furniture', 'Template for furniture, home decor, and appliances', 'weekend', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    -- 11. Sports & Fitness
    INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active,
        variant_config, custom_fields)
    VALUES (v_tenant_id, 'Sports & Fitness', 'sports', 'Template for sports equipment, fitness gear, and athletic apparel', 'fitness_center', true, true,
        '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

    RAISE NOTICE 'Successfully created 11 system templates';
END $$;
