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
    settings JSONB NOT NULL DEFAULT '{"max_verification_apps": 1}'::jsonb,
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
    email VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    phone_e164 VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER', 'DEALER', 'CUSTOMER')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_super_admin_no_tenant CHECK (
        (role = 'SUPER_ADMIN' AND tenant_id IS NULL) OR
        (role != 'SUPER_ADMIN' AND tenant_id IS NOT NULL)
    ),
    CONSTRAINT check_user_identifier CHECK (
        email IS NOT NULL OR phone_e164 IS NOT NULL
    )
);

-- Partial unique index: email must be unique where not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
-- Partial unique index: phone_e164 must be unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_tenant_unique ON users(tenant_id, phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone_e164 ON users(phone_e164);

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
  coupon_reference VARCHAR(20),
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  serial_number INTEGER,
  campaign_id UUID REFERENCES reward_campaigns(id) ON DELETE SET NULL,
  reward_amount DECIMAL(10,2) DEFAULT 0,
  printed_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  coupon_points INTEGER,
  cashback_amount DECIMAL(10,2) DEFAULT 0,
  printed_count INTEGER DEFAULT 0,
  activation_note TEXT,
  deactivation_reason TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_expiry_future CHECK (expiry_date > created_at),
  CONSTRAINT chk_buy_get_consistency CHECK (
    (discount_type = 'BUY_X_GET_Y' AND buy_quantity IS NOT NULL AND get_quantity IS NOT NULL) OR
    (discount_type != 'BUY_X_GET_Y' AND buy_quantity IS NULL AND get_quantity IS NULL)
  ),
  CONSTRAINT unique_tenant_coupon_reference UNIQUE (tenant_id, coupon_reference)
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
        -- draft can go directly to active (printing is a side-action, not a lifecycle step)
        IF OLD.status = 'draft' AND NEW.status NOT IN ('active', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
        END IF;
        -- printed kept for backward compatibility with existing data
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

-- Function to generate next sequential coupon reference per tenant.
-- Uses coupon_code_sequences for atomic, race-condition-free incrementing.
-- Each tenant has its own independent CP sequence starting from CP-001.
CREATE OR REPLACE FUNCTION get_next_coupon_reference(p_tenant_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_next_num INTEGER;
BEGIN
    INSERT INTO coupon_code_sequences (tenant_id, prefix, last_sequence_number)
    VALUES (p_tenant_id, 'CP', 1)
    ON CONFLICT (tenant_id, prefix) DO UPDATE
        SET last_sequence_number = coupon_code_sequences.last_sequence_number + 1,
            updated_at = CURRENT_TIMESTAMP
    RETURNING last_sequence_number INTO v_next_num;

    RETURN 'CP-' || LPAD(v_next_num::TEXT, 3, '0');
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
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  phone_e164 VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT false,
  device_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mobile_otps_phone ON mobile_otps(phone_e164);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_tenant ON mobile_otps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_expires_at ON mobile_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_phone_not_used ON mobile_otps(phone_e164, is_used) WHERE is_used = false;

CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE,
  device_id VARCHAR(255),
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  scan_type VARCHAR(20) DEFAULT 'customer' CHECK (scan_type IN ('customer', 'dealer', 'public')),
  status VARCHAR(20) DEFAULT 'pending-verification' CHECK (status IN ('pending-verification', 'verified', 'completed', 'expired', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_customer ON scan_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_token ON scan_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_expires_at ON scan_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_coupon ON scan_sessions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_scanned_by ON scan_sessions(scanned_by);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_scan_type ON scan_sessions(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON scan_sessions(status);

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

-- Redemption requests: pending = locked points, approved = paid out, rejected = restored
CREATE TABLE IF NOT EXISTS redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
  points_requested INTEGER NOT NULL CHECK (points_requested > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redemption_requests_customer ON redemption_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_tenant ON redemption_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_status ON redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_created_at ON redemption_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_app ON redemption_requests(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_tenant_app_status ON redemption_requests(tenant_id, verification_app_id, status);

CREATE TRIGGER update_redemption_requests_updated_at
  BEFORE UPDATE ON redemption_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- ============================================
-- FEATURE FLAGS SYSTEM
-- ============================================

-- Features (Global Feature Definitions)
CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES features(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    default_enabled BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_features_code ON features(code);
CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active);
CREATE INDEX IF NOT EXISTS idx_features_parent ON features(parent_id);

CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE features IS 'Global feature definitions that can be enabled per tenant';
COMMENT ON COLUMN features.code IS 'Unique feature identifier (e.g., advanced-reporting)';
COMMENT ON COLUMN features.default_enabled IS 'Whether new tenants get this feature by default';

-- Tenant Features (Tenant-Specific Feature Enablement)
CREATE TABLE IF NOT EXISTS tenant_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enabled_by UUID REFERENCES users(id),
    UNIQUE(tenant_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_feature ON tenant_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_enabled ON tenant_features(enabled);

COMMENT ON TABLE tenant_features IS 'Tenant-specific feature enablement records';
COMMENT ON COLUMN tenant_features.enabled IS 'Whether the feature is currently enabled for this tenant';

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

-- ============================================
-- DEALER MANAGEMENT
-- ============================================

-- Dealers
-- Each row = one dealer's profile for ONE verification app.
-- Same person in two apps = two rows. Uniqueness: (user_id, verification_app_id).
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  dealer_code VARCHAR(50) NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_app UNIQUE (user_id, verification_app_id),
  CONSTRAINT unique_dealer_code_per_app UNIQUE (tenant_id, verification_app_id, dealer_code)
);

CREATE INDEX IF NOT EXISTS idx_dealers_user ON dealers(user_id);
CREATE INDEX IF NOT EXISTS idx_dealers_tenant ON dealers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dealers_verification_app ON dealers(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_dealers_code ON dealers(dealer_code);
CREATE INDEX IF NOT EXISTS idx_dealers_active ON dealers(is_active);
CREATE INDEX IF NOT EXISTS idx_dealers_shop_name_trgm ON dealers USING GIN (shop_name gin_trgm_ops);

CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dealer Points (Credit Points Balance)
CREATE TABLE IF NOT EXISTS dealer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_dealer_tenant_points UNIQUE (dealer_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_dealer_points_dealer ON dealer_points(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_points_tenant ON dealer_points(tenant_id);

CREATE TRIGGER update_dealer_points_updated_at BEFORE UPDATE ON dealer_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dealer Point Transactions
CREATE TABLE IF NOT EXISTS dealer_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  reason VARCHAR(255),
  reference_id UUID,
  reference_type VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dealer_point_tx_dealer ON dealer_point_transactions(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_point_tx_tenant ON dealer_point_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dealer_point_tx_type ON dealer_point_transactions(type);
CREATE INDEX IF NOT EXISTS idx_dealer_point_tx_created ON dealer_point_transactions(created_at);

-- ============================================
-- CASHBACK SYSTEM
-- ============================================

-- Cashback Transactions
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scan_session_id UUID,
  coupon_code VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  upi_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED')),
  gateway_transaction_id VARCHAR(255),
  payout_reference VARCHAR(255),
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cashback_tx_customer ON cashback_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_cashback_tx_tenant ON cashback_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cashback_tx_status ON cashback_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cashback_tx_coupon ON cashback_transactions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_cashback_tx_created ON cashback_transactions(created_at);

CREATE TRIGGER update_cashback_transactions_updated_at BEFORE UPDATE ON cashback_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Customer UPI Details
CREATE TABLE IF NOT EXISTS customer_upi_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  upi_id VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_customer_tenant_upi UNIQUE (customer_id, tenant_id, upi_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_upi_customer ON customer_upi_details(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_upi_tenant ON customer_upi_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_upi_primary ON customer_upi_details(customer_id, tenant_id) WHERE is_primary = true;

CREATE TRIGGER update_customer_upi_details_updated_at BEFORE UPDATE ON customer_upi_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

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

-- Super Admin Users
INSERT INTO users (email, full_name, role, is_active)
VALUES ('sumantmishra511@gmail.com', 'Super Admin', 'SUPER_ADMIN', true)
ON CONFLICT (email) WHERE email is NOT NULL DO NOTHING;

INSERT INTO users (email, full_name, role, is_active)
VALUES ('kumarbhaskar419@gmail.com', 'Super Admin', 'SUPER_ADMIN', true)
ON CONFLICT (email) WHERE email is NOT NULL DO NOTHING;

-- ============================================
-- SEED: Demo Tenants & Tenant Admins
-- ============================================
DO $$
DECLARE
    v_super_admin1_id UUID;
    v_super_admin2_id UUID;
    v_tenant1_id UUID;
    v_tenant2_id UUID;
BEGIN
    -- Get super admin IDs
    SELECT id INTO v_super_admin1_id FROM users WHERE email = 'sumantmishra511@gmail.com';
    SELECT id INTO v_super_admin2_id FROM users WHERE email = 'kumarbhaskar419@gmail.com';

    -- Create Tenant 1 (if not exists)
    INSERT INTO tenants (tenant_name, email, contact_person, subdomain_slug, is_active, status, created_by)
    VALUES ('Demo Brand One', 'tenant1@demo.com', 'Admin One', 'demo-brand-one', true, 'active', v_super_admin1_id)
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_tenant1_id;

    IF v_tenant1_id IS NULL THEN
        SELECT id INTO v_tenant1_id FROM tenants WHERE email = 'tenant1@demo.com';
    END IF;

    -- Create Tenant 2 (if not exists)
    INSERT INTO tenants (tenant_name, email, contact_person, subdomain_slug, is_active, status, created_by)
    VALUES ('Demo Brand Two', 'tenant2@demo.com', 'Admin Two', 'demo-brand-two', true, 'active', v_super_admin2_id)
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_tenant2_id;

    IF v_tenant2_id IS NULL THEN
        SELECT id INTO v_tenant2_id FROM tenants WHERE email = 'tenant2@demo.com';
    END IF;

    -- Create Tenant Admin for Tenant 1 (if not exists)
    -- Login: tenant1@demo.com on subdomain demo-brand-one
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('tenant1@demo.com', 'Admin One', 'TENANT_ADMIN', v_tenant1_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING;

    -- Create Tenant Admin for Tenant 2 (if not exists)
    -- Login: tenant2@demo.com on subdomain demo-brand-two
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('tenant2@demo.com', 'Admin Two', 'TENANT_ADMIN', v_tenant2_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING;

    RAISE NOTICE 'Demo tenants and tenant admin users created successfully';
END $$;

-- ============================================
-- Initialize credit balance for all tenants with 5000 welcome credits
-- Creates a full paper trail:
--   credit_requests  (approved)        → visible in super-admin request list
--   credit_transactions (CREDIT)       → visible in transaction history at all levels
-- ============================================
DO $$
DECLARE
    v_tenant        RECORD;
    v_super_admin   UUID;
    v_tenant_admin  UUID;
    v_request_id    UUID;
    v_balance_before INTEGER := 0;
    v_welcome_credits CONSTANT INTEGER := 5000;
BEGIN
    -- Use first super admin as the approver
    SELECT id INTO v_super_admin FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1;

    FOR v_tenant IN SELECT id, tenant_name FROM tenants ORDER BY created_at LOOP

        -- Skip if this tenant already has a credit balance
        IF EXISTS (SELECT 1 FROM tenant_credit_balance WHERE tenant_id = v_tenant.id) THEN
            RAISE NOTICE 'Credit balance already exists for tenant %, skipping', v_tenant.tenant_name;
            CONTINUE;
        END IF;

        -- Find a TENANT_ADMIN user for this tenant (used as requested_by)
        SELECT id INTO v_tenant_admin
        FROM users
        WHERE tenant_id = v_tenant.id AND role = 'TENANT_ADMIN'
        LIMIT 1;

        -- Fall back to super admin if no tenant admin exists yet
        IF v_tenant_admin IS NULL THEN
            v_tenant_admin := v_super_admin;
        END IF;

        -- 1. Insert the approved credit request
        INSERT INTO credit_requests (
            tenant_id, requested_by, requested_amount, status,
            justification, processed_by, processed_at, requested_at
        ) VALUES (
            v_tenant.id,
            v_tenant_admin,
            v_welcome_credits,
            'approved',
            'Welcome credits allocated on account creation',
            v_super_admin,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO v_request_id;

        -- 2. Create the CREDIT transaction record linked to the request
        INSERT INTO credit_transactions (
            tenant_id, transaction_type, amount,
            balance_before, balance_after,
            reference_id, reference_type,
            description, created_by
        ) VALUES (
            v_tenant.id,
            'CREDIT',
            v_welcome_credits,
            v_balance_before,
            v_balance_before + v_welcome_credits,
            v_request_id,
            'CREDIT_APPROVAL',
            'Welcome credits: ' || v_welcome_credits || ' credits allocated on account creation',
            v_super_admin
        );

        -- 3. Set the tenant credit balance
        INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
        VALUES (v_tenant.id, v_welcome_credits, v_welcome_credits, 0)
        ON CONFLICT (tenant_id) DO NOTHING;

        RAISE NOTICE 'Allocated % welcome credits to tenant %', v_welcome_credits, v_tenant.tenant_name;
    END LOOP;
END $$;

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
-- SEED: Feature Flags for Ecommerce & Cashback
-- ============================================

-- Ecommerce feature flag
INSERT INTO features (code, name, description, default_enabled)
VALUES ('ecommerce', 'Ecommerce Module', 'Enable ecommerce product catalog and customer profile for tenant', false)
ON CONFLICT (code) DO NOTHING;

-- Coupon cashback parent flag
INSERT INTO features (code, name, description, default_enabled)
VALUES ('coupon_cashback', 'Coupon Cashback Module', 'Parent flag for the entire coupon cashback system', false)
ON CONFLICT (code) DO NOTHING;

-- Coupon cashback child flags
INSERT INTO features (code, name, description, parent_id, default_enabled)
VALUES (
  'coupon_cashback.dealer_scanning',
  'Dealer Scanning',
  'Enable dealer-only QR scanning with credit points (app required)',
  (SELECT id FROM features WHERE code = 'coupon_cashback'),
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO features (code, name, description, parent_id, default_enabled)
VALUES (
  'coupon_cashback.open_scanning',
  'Open Scanning',
  'Enable open scanning for all users with UPI cashback payout',
  (SELECT id FROM features WHERE code = 'coupon_cashback'),
  false
)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED: System Templates & Default Verify App (all tenants)
-- ============================================
DO $$
DECLARE
    v_tenant RECORD;
    v_template_id UUID;
BEGIN
    FOR v_tenant IN SELECT id, tenant_name FROM tenants ORDER BY created_at LOOP

        -- ---- System Templates ----
        IF EXISTS (SELECT 1 FROM product_templates WHERE tenant_id = v_tenant.id AND is_system_template = true) THEN
            RAISE NOTICE 'System templates already exist for tenant %, skipping templates', v_tenant.tenant_name;
        ELSE
            INSERT INTO product_templates (tenant_id, template_name, industry_type, description, icon, is_system_template, is_active, variant_config, custom_fields)
            VALUES
                (v_tenant.id, 'Basic Product', 'basic', 'Simple product template with essential fields only', 'inventory_2', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Clothing & Apparel', 'clothing', 'Template for shirts, pants, dresses, and other clothing items', 'checkroom', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Footwear', 'footwear', 'Template for shoes, sandals, boots, and other footwear', 'run_circle', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Jewelry & Accessories', 'jewelry', 'Template for rings, necklaces, bracelets, and other jewelry', 'diamond', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Wall Paint & Coatings', 'paint', 'Template for paints, varnishes, and coating products', 'format_paint', true, true, '{"variant_label": "Pack Size", "dimensions": [{"attribute_key": "pack_size", "attribute_name": "Pack Size", "type": "select", "required": true, "options": ["1L", "4L", "10L", "20L"], "placeholder": "Select pack size", "help_text": "Select the size of the paint pack"}], "common_fields": [{"attribute_key": "price", "attribute_name": "Price (₹)", "type": "number", "required": true, "min": 0, "placeholder": "0.00"}]}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Bags & Luggage', 'bags', 'Template for backpacks, suitcases, handbags, and travel bags', 'work_outline', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Electronics & Gadgets', 'electronics', 'Template for phones, tablets, laptops, and electronic devices', 'devices', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Cosmetics & Beauty', 'cosmetics', 'Template for skincare, makeup, fragrances, and beauty products', 'face_retouching_natural', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Food & Beverage', 'food', 'Template for packaged food items and beverages', 'restaurant', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Home & Furniture', 'furniture', 'Template for furniture, home decor, and appliances', 'weekend', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb),
                (v_tenant.id, 'Sports & Fitness', 'sports', 'Template for sports equipment, fitness gear, and athletic apparel', 'fitness_center', true, true, '{"variant_label": "Variant", "dimensions": [], "common_fields": []}'::jsonb, '[]'::jsonb);

            RAISE NOTICE 'Created 11 system templates for tenant %', v_tenant.tenant_name;
        END IF;

        -- ---- Default Verify App ----
        IF EXISTS (SELECT 1 FROM verification_apps WHERE tenant_id = v_tenant.id) THEN
            RAISE NOTICE 'Verify app already exists for tenant %, skipping', v_tenant.tenant_name;
        ELSE
            -- Use the Wall Paint & Coatings template as the default
            SELECT id INTO v_template_id
            FROM product_templates
            WHERE tenant_id = v_tenant.id AND template_name = 'Wall Paint & Coatings'
            LIMIT 1;

            INSERT INTO verification_apps (
                tenant_id, app_name, code, api_key, description,
                enable_scanning, is_active, template_id
            ) VALUES (
                v_tenant.id,
                'Default Verify App',
                upper(left(replace(gen_random_uuid()::text, '-', ''), 8)),
                'msk_' || replace(gen_random_uuid()::text, '-', ''),
                'Default verification app created during initial setup',
                true,
                true,
                v_template_id
            );

            RAISE NOTICE 'Created default verify app for tenant %', v_tenant.tenant_name;
        END IF;

    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM tenants) THEN
        RAISE NOTICE 'No tenants found - skipping system template and verify app seeding';
    END IF;
END $$;

-- ============================================
-- SEED: Demo Brand One — Wall Paint brand dummy data
-- ============================================
-- Tenant Admin : tenant1@demo.com  (subdomain: demo-brand-one)
-- Dealer       : dealer1@demo.com  (mobile: +919000000001)
-- Staff        : staff1@demo.com
-- Template     : Wall Paint & Coatings (Pack Size + Price)
-- Products     : 4 paint products across 2 categories
-- ============================================
DO $$
DECLARE
    v_tenant1_id     UUID;
    v_app_id         UUID;
    v_template_id    UUID;
    v_dealer_user_id UUID;
    v_staff_user_id  UUID;
    v_dealer_id      UUID;
    v_batch_id       UUID;
    v_cat_interior   INTEGER;
    v_cat_exterior   INTEGER;
    v_admin_user_id  UUID;
BEGIN
    -- Resolve tenant
    SELECT id INTO v_tenant1_id FROM tenants WHERE subdomain_slug = 'demo-brand-one';
    IF v_tenant1_id IS NULL THEN
        RAISE NOTICE 'Demo Brand One tenant not found, skipping';
        RETURN;
    END IF;

    -- Resolve verify app
    SELECT id INTO v_app_id FROM verification_apps
    WHERE tenant_id = v_tenant1_id AND app_name = 'Default Verify App' LIMIT 1;
    IF v_app_id IS NULL THEN
        RAISE NOTICE 'No verify app found for Demo Brand One, skipping';
        RETURN;
    END IF;

    -- Resolve Wall Paint & Coatings template
    SELECT id INTO v_template_id FROM product_templates
    WHERE tenant_id = v_tenant1_id AND template_name = 'Wall Paint & Coatings' LIMIT 1;

    -- Resolve tenant admin
    SELECT id INTO v_admin_user_id FROM users
    WHERE email = 'tenant1@demo.com' AND tenant_id = v_tenant1_id LIMIT 1;

    -- ---- Dealer User ----
    INSERT INTO users (email, full_name, role, tenant_id, phone_e164, is_active)
    VALUES ('dealer1@demo.com', 'Demo Dealer One', 'DEALER', v_tenant1_id, '+919000000001', true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_dealer_user_id;
    IF v_dealer_user_id IS NULL THEN
        SELECT id INTO v_dealer_user_id FROM users WHERE email = 'dealer1@demo.com';
    END IF;

    -- ---- Staff User ----
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('staff1@demo.com', 'Demo Staff One', 'TENANT_USER', v_tenant1_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_staff_user_id;
    IF v_staff_user_id IS NULL THEN
        SELECT id INTO v_staff_user_id FROM users WHERE email = 'staff1@demo.com';
    END IF;

    -- ---- Dealer Profile ----
    IF NOT EXISTS (SELECT 1 FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id) THEN
        INSERT INTO dealers (user_id, tenant_id, verification_app_id, dealer_code, shop_name, address, pincode, city, state, is_active)
        VALUES (v_dealer_user_id, v_tenant1_id, v_app_id, 'DLR001', 'Demo Paint Store', '12 Market Street', '400001', 'Mumbai', 'Maharashtra', true)
        RETURNING id INTO v_dealer_id;
        INSERT INTO dealer_points (dealer_id, tenant_id, balance)
        VALUES (v_dealer_id, v_tenant1_id, 150)
        ON CONFLICT (dealer_id, tenant_id) DO NOTHING;
    ELSE
        SELECT id INTO v_dealer_id FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id;
    END IF;

    -- ---- Categories ----
    IF NOT EXISTS (SELECT 1 FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Interior Paints') THEN
        INSERT INTO categories (tenant_id, verification_app_id, name, description, is_active)
        VALUES (v_tenant1_id, v_app_id, 'Interior Paints', 'Paints for interior walls and ceilings', true)
        RETURNING id INTO v_cat_interior;
    ELSE
        SELECT id INTO v_cat_interior FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Interior Paints' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Exterior Paints') THEN
        INSERT INTO categories (tenant_id, verification_app_id, name, description, is_active)
        VALUES (v_tenant1_id, v_app_id, 'Exterior Paints', 'Paints for exterior walls and outdoor surfaces', true)
        RETURNING id INTO v_cat_exterior;
    ELSE
        SELECT id INTO v_cat_exterior FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Exterior Paints' LIMIT 1;
    END IF;

    -- ---- 4 Paint Products ----
    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Royale Shyne Interior Emulsion') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_interior,
            'Royale Shyne Interior Emulsion', 1850.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Royale+Shyne',
            '{"pack_size": "20L", "price": 1850}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Tractor Emulsion Interior') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_interior,
            'Tractor Emulsion Interior', 980.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Tractor+Emulsion',
            '{"pack_size": "10L", "price": 980}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Apex Exterior Emulsion') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_exterior,
            'Apex Exterior Emulsion', 2200.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Apex+Exterior',
            '{"pack_size": "20L", "price": 2200}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Weathercoat All Guard Exterior') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_exterior,
            'Weathercoat All Guard Exterior', 560.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Weathercoat',
            '{"pack_size": "4L", "price": 560}'::jsonb);
    END IF;

    -- ---- Enable all features ----
    INSERT INTO tenant_features (tenant_id, feature_id, enabled, enabled_by)
    SELECT v_tenant1_id, id, true, v_admin_user_id
    FROM features
    ON CONFLICT (tenant_id, feature_id) DO UPDATE SET enabled = true;

    -- ---- Coupon Batch ----
    IF NOT EXISTS (SELECT 1 FROM coupon_batches WHERE tenant_id = v_tenant1_id AND batch_name = 'Demo Batch Q1-2026') THEN
        INSERT INTO coupon_batches (tenant_id, verification_app_id, batch_name, dealer_name, zone, total_coupons, serial_number_start, serial_number_end, batch_status, activated_at)
        VALUES (v_tenant1_id, v_app_id, 'Demo Batch Q1-2026', 'Demo Dealer One', 'West', 5, 1, 5, 'activated', NOW())
        RETURNING id INTO v_batch_id;
    ELSE
        SELECT id INTO v_batch_id FROM coupon_batches WHERE tenant_id = v_tenant1_id AND batch_name = 'Demo Batch Q1-2026' LIMIT 1;
    END IF;

    -- ---- Active Coupons ----
    INSERT INTO coupons (
        tenant_id, verification_app_id, coupon_code, discount_type, discount_value, discount_currency,
        expiry_date, total_usage_limit, per_user_usage_limit, status, credit_cost, max_scans_per_code,
        batch_id, code_type, coupon_reference, serial_number, description, activated_at, coupon_points
    ) VALUES
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0001', 'PERCENTAGE',   10.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-001', 1, 'Demo 10% off coupon', NOW(), 10),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0002', 'PERCENTAGE',   15.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-002', 2, 'Demo 15% off coupon', NOW(), 15),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0003', 'FIXED_AMOUNT', 200.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-003', 3, 'Demo flat Rs.200 off coupon', NOW(), 20),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0004', 'FIXED_AMOUNT', 500.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-004', 4, 'Demo flat Rs.500 off coupon', NOW(), 50),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0005', 'PERCENTAGE',   20.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-005', 5, 'Demo 20% off coupon', NOW(), 20)
    ON CONFLICT (coupon_code) DO NOTHING;

    RAISE NOTICE 'Demo Brand One seed complete (paint brand, tenant: %)', v_tenant1_id;
END $$;

-- ============================================
-- SEED: Demo Brand Two — Clothing brand dummy data
-- ============================================
-- Tenant Admin : tenant2@demo.com  (subdomain: demo-brand-two)
-- Dealer       : dealer2@demo.com  (mobile: +919000000002)
-- Staff        : staff2@demo.com
-- Template     : Clothing Brand (custom, Size + Color variants, Price + SKU fields)
-- Products     : 4 clothing products across 2 categories
-- ============================================
DO $$
DECLARE
    v_tenant2_id     UUID;
    v_app_id         UUID;
    v_template_id    UUID;
    v_dealer_user_id UUID;
    v_staff_user_id  UUID;
    v_dealer_id      UUID;
    v_batch_id       UUID;
    v_cat_topwear    INTEGER;
    v_cat_bottomwear INTEGER;
    v_admin_user_id  UUID;
    v_clothing_config JSONB := '{
      "variant_label": "Variant",
      "dimensions": [
        {
          "attribute_key": "size",
          "attribute_name": "Size",
          "type": "select",
          "required": true,
          "options": ["XS", "S", "M", "L", "XL", "XXL"],
          "help_text": "Select the garment size"
        },
        {
          "attribute_key": "color",
          "attribute_name": "Color",
          "type": "text",
          "required": true,
          "placeholder": "e.g., Navy Blue, Black, White",
          "help_text": "Enter the colour of the garment"
        }
      ],
      "common_fields": [
        {
          "attribute_key": "price",
          "attribute_name": "Price (₹)",
          "type": "number",
          "required": true,
          "min": 0,
          "placeholder": "0.00"
        },
        {
          "attribute_key": "sku",
          "attribute_name": "SKU",
          "type": "text",
          "required": true,
          "placeholder": "e.g., CLT-001-M-NVY"
        },
        {
          "attribute_key": "fabric",
          "attribute_name": "Fabric",
          "type": "select",
          "required": false,
          "options": ["Cotton", "Polyester", "Linen", "Wool", "Silk", "Denim", "Blend"]
        }
      ]
    }'::jsonb;
BEGIN
    -- Resolve tenant
    SELECT id INTO v_tenant2_id FROM tenants WHERE subdomain_slug = 'demo-brand-two';
    IF v_tenant2_id IS NULL THEN
        RAISE NOTICE 'Demo Brand Two tenant not found, skipping';
        RETURN;
    END IF;

    -- Resolve verify app
    SELECT id INTO v_app_id FROM verification_apps
    WHERE tenant_id = v_tenant2_id AND app_name = 'Default Verify App' LIMIT 1;
    IF v_app_id IS NULL THEN
        RAISE NOTICE 'No verify app found for Demo Brand Two, skipping';
        RETURN;
    END IF;

    -- Resolve tenant admin
    SELECT id INTO v_admin_user_id FROM users
    WHERE email = 'tenant2@demo.com' AND tenant_id = v_tenant2_id LIMIT 1;

    -- ---- Clothing Brand custom template ----
    IF NOT EXISTS (SELECT 1 FROM product_templates WHERE tenant_id = v_tenant2_id AND template_name = 'Clothing Brand') THEN
        INSERT INTO product_templates (
            tenant_id, template_name, industry_type, description, icon,
            is_system_template, is_active, variant_config, custom_fields
        ) VALUES (
            v_tenant2_id,
            'Clothing Brand',
            'clothing',
            'Custom template for Demo Brand Two — apparel with size, colour, SKU and fabric variants',
            'checkroom',
            false,
            true,
            v_clothing_config,
            '[]'::jsonb
        )
        RETURNING id INTO v_template_id;
    ELSE
        SELECT id INTO v_template_id FROM product_templates
        WHERE tenant_id = v_tenant2_id AND template_name = 'Clothing Brand' LIMIT 1;
    END IF;

    -- ---- Assign template to verify app ----
    UPDATE verification_apps
    SET template_id = v_template_id,
        updated_at  = CURRENT_TIMESTAMP
    WHERE id = v_app_id;

    -- ---- Dealer User ----
    INSERT INTO users (email, full_name, role, tenant_id, phone_e164, is_active)
    VALUES ('dealer2@demo.com', 'Demo Dealer Two', 'DEALER', v_tenant2_id, '+919000000002', true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_dealer_user_id;
    IF v_dealer_user_id IS NULL THEN
        SELECT id INTO v_dealer_user_id FROM users WHERE email = 'dealer2@demo.com';
    END IF;

    -- ---- Staff User ----
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('staff2@demo.com', 'Demo Staff Two', 'TENANT_USER', v_tenant2_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_staff_user_id;
    IF v_staff_user_id IS NULL THEN
        SELECT id INTO v_staff_user_id FROM users WHERE email = 'staff2@demo.com';
    END IF;

    -- ---- Dealer Profile ----
    IF NOT EXISTS (SELECT 1 FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id) THEN
        INSERT INTO dealers (user_id, tenant_id, verification_app_id, dealer_code, shop_name, address, pincode, city, state, is_active)
        VALUES (v_dealer_user_id, v_tenant2_id, v_app_id, 'DLR002', 'Demo Fashion Store', '45 Fashion Street', '110001', 'New Delhi', 'Delhi', true)
        RETURNING id INTO v_dealer_id;
        INSERT INTO dealer_points (dealer_id, tenant_id, balance)
        VALUES (v_dealer_id, v_tenant2_id, 200)
        ON CONFLICT (dealer_id, tenant_id) DO NOTHING;
    ELSE
        SELECT id INTO v_dealer_id FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id;
    END IF;

    -- ---- Categories ----
    IF NOT EXISTS (SELECT 1 FROM categories WHERE tenant_id = v_tenant2_id AND name = 'Topwear') THEN
        INSERT INTO categories (tenant_id, verification_app_id, name, description, is_active)
        VALUES (v_tenant2_id, v_app_id, 'Topwear', 'T-shirts, shirts, kurtas and other upper garments', true)
        RETURNING id INTO v_cat_topwear;
    ELSE
        SELECT id INTO v_cat_topwear FROM categories WHERE tenant_id = v_tenant2_id AND name = 'Topwear' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE tenant_id = v_tenant2_id AND name = 'Bottomwear') THEN
        INSERT INTO categories (tenant_id, verification_app_id, name, description, is_active)
        VALUES (v_tenant2_id, v_app_id, 'Bottomwear', 'Jeans, trousers, chinos and other lower garments', true)
        RETURNING id INTO v_cat_bottomwear;
    ELSE
        SELECT id INTO v_cat_bottomwear FROM categories WHERE tenant_id = v_tenant2_id AND name = 'Bottomwear' LIMIT 1;
    END IF;

    -- ---- 4 Clothing Products ----
    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant2_id AND product_name = 'Classic Cotton Polo T-Shirt') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant2_id, v_app_id, v_template_id, v_cat_topwear,
            'Classic Cotton Polo T-Shirt', 799.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Polo+T-Shirt',
            '{"size": "M", "color": "Navy Blue", "price": 799, "sku": "CLT-PLO-M-NVY", "fabric": "Cotton"}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant2_id AND product_name = 'Linen Formal Shirt') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant2_id, v_app_id, v_template_id, v_cat_topwear,
            'Linen Formal Shirt', 1499.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Linen+Shirt',
            '{"size": "L", "color": "White", "price": 1499, "sku": "CLT-SHT-L-WHT", "fabric": "Linen"}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant2_id AND product_name = 'Slim Fit Stretch Jeans') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant2_id, v_app_id, v_template_id, v_cat_bottomwear,
            'Slim Fit Stretch Jeans', 1999.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Slim+Jeans',
            '{"size": "32", "color": "Dark Blue", "price": 1999, "sku": "CLT-JNS-32-DBL", "fabric": "Denim"}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant2_id AND product_name = 'Relaxed Fit Chinos') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url, attributes)
        VALUES (v_tenant2_id, v_app_id, v_template_id, v_cat_bottomwear,
            'Relaxed Fit Chinos', 1299.00, 'INR', 'active', true,
            'https://placehold.co/400x400?text=Chinos',
            '{"size": "34", "color": "Beige", "price": 1299, "sku": "CLT-CHN-34-BGE", "fabric": "Cotton"}'::jsonb);
    END IF;

    -- ---- Enable all features ----
    INSERT INTO tenant_features (tenant_id, feature_id, enabled, enabled_by)
    SELECT v_tenant2_id, id, true, v_admin_user_id
    FROM features
    ON CONFLICT (tenant_id, feature_id) DO UPDATE SET enabled = true;

    -- ---- Coupon Batch ----
    IF NOT EXISTS (SELECT 1 FROM coupon_batches WHERE tenant_id = v_tenant2_id AND batch_name = 'Demo Batch Q1-2026') THEN
        INSERT INTO coupon_batches (tenant_id, verification_app_id, batch_name, dealer_name, zone, total_coupons, serial_number_start, serial_number_end, batch_status, activated_at)
        VALUES (v_tenant2_id, v_app_id, 'Demo Batch Q1-2026', 'Demo Dealer Two', 'North', 5, 1, 5, 'activated', NOW())
        RETURNING id INTO v_batch_id;
    ELSE
        SELECT id INTO v_batch_id FROM coupon_batches WHERE tenant_id = v_tenant2_id AND batch_name = 'Demo Batch Q1-2026' LIMIT 1;
    END IF;

    -- ---- Active Coupons ----
    INSERT INTO coupons (
        tenant_id, verification_app_id, coupon_code, discount_type, discount_value, discount_currency,
        expiry_date, total_usage_limit, per_user_usage_limit, status, credit_cost, max_scans_per_code,
        batch_id, code_type, coupon_reference, serial_number, description, activated_at, coupon_points
    ) VALUES
    (v_tenant2_id, v_app_id, 'DEMO-T2-0001', 'PERCENTAGE',   10.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-T2-001', 1, 'Demo 10% off coupon', NOW(), 10),
    (v_tenant2_id, v_app_id, 'DEMO-T2-0002', 'PERCENTAGE',   15.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-T2-002', 2, 'Demo 15% off coupon', NOW(), 15),
    (v_tenant2_id, v_app_id, 'DEMO-T2-0003', 'FIXED_AMOUNT', 200.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-T2-003', 3, 'Demo flat Rs.200 off coupon', NOW(), 20),
    (v_tenant2_id, v_app_id, 'DEMO-T2-0004', 'FIXED_AMOUNT', 500.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-T2-004', 4, 'Demo flat Rs.500 off coupon', NOW(), 50),
    (v_tenant2_id, v_app_id, 'DEMO-T2-0005', 'PERCENTAGE',   20.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-T2-005', 5, 'Demo 20% off coupon', NOW(), 20)
    ON CONFLICT (coupon_code) DO NOTHING;

    RAISE NOTICE 'Demo Brand Two seed complete (clothing brand, tenant: %)', v_tenant2_id;
END $$;
