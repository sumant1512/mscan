-- MScan Full Database Setup (One-shot)
-- Run this on a fresh database to create all schema, triggers, indexes, and seed data
-- Includes base schema, batch/coupon workflow, analytics, mobile tables, and product/category catalog

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BASE SCHEMA
-- ============================================
-- From schema.sql

-- TENANTS
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL UNIQUE,
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- OTP
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_otp UNIQUE (email, otp_code)
);

-- TOKEN BLACKLIST
CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_jti VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('ACCESS', 'REFRESH')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_email_not_used ON otps(email, is_used) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(contact_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PRE-REQUISITES: Verification Apps and Coupons
-- ============================================
-- Create verification_apps first (used by coupons and coupon_batches)
CREATE TABLE IF NOT EXISTS verification_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_name VARCHAR(255) NOT NULL,
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
  enable_analytics BOOLEAN DEFAULT true,
  enable_scanning BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_verification_apps_tenant ON verification_apps(tenant_id);

-- Create coupons next (referencing verification_apps)
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  total_usage_limit INTEGER CHECK (total_usage_limit IS NULL OR total_usage_limit > 0),
  per_user_usage_limit INTEGER DEFAULT 1 CHECK (per_user_usage_limit > 0),
  current_usage_count INTEGER DEFAULT 0 CHECK (current_usage_count >= 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted', 'inactive')),
  qr_code_url TEXT,
  description TEXT,
  terms TEXT,
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
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

-- ============================================
-- 001 BASELINE: coupon_batches + scan_history
-- ============================================
-- From 001_create_coupon_batches_and_scan_history.sql
CREATE TABLE IF NOT EXISTS coupon_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL,
  batch_name VARCHAR(255) NOT NULL,
  dealer_name VARCHAR(255),
  zone VARCHAR(100),
  total_coupons INTEGER NOT NULL CHECK (total_coupons > 0),
  serial_number_start INTEGER,
  serial_number_end INTEGER,
  batch_status VARCHAR(50) DEFAULT 'draft',
  activated_at TIMESTAMP,
  activation_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_tenant ON coupon_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_status ON coupon_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_coupon_batches_created_at ON coupon_batches(created_at);
DROP TRIGGER IF EXISTS update_coupon_batches_updated_at ON coupon_batches;
CREATE TRIGGER update_coupon_batches_updated_at
  BEFORE UPDATE ON coupon_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  customer_id UUID,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scan_history_tenant ON scan_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_coupon ON scan_history(coupon_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON scan_history(scanned_at);

-- ============================================
-- 002 Navigation, Tenant Rewards, Coupons, Scans
-- ============================================
-- From 002_add_navigation_tenant_rewards.sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
UPDATE tenants SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_contact_email ON tenants(contact_email);

CREATE TABLE IF NOT EXISTS credit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_amount INTEGER NOT NULL CHECK (requested_amount > 0),
    justification TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    CONSTRAINT chk_rejection_reason CHECK (
        (status = 'rejected' AND rejection_reason IS NOT NULL) OR 
        (status != 'rejected')
    )
);
CREATE INDEX IF NOT EXISTS idx_credit_requests_tenant ON credit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(status);
CREATE INDEX IF NOT EXISTS idx_credit_requests_requested_at ON credit_requests(requested_at);

CREATE TABLE IF NOT EXISTS tenant_credit_balance (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    total_received INTEGER DEFAULT 0 CHECK (total_received >= 0),
    total_spent INTEGER DEFAULT 0 CHECK (total_spent >= 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50) CHECK (reference_type IN ('CREDIT_APPROVAL', 'COUPON_CREATION', 'COUPON_EDIT')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_credit_trans_tenant ON credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_trans_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_trans_created_at ON credit_transactions(created_at);

CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scan_status VARCHAR(20) NOT NULL CHECK (scan_status IN ('SUCCESS', 'EXPIRED', 'EXHAUSTED', 'INVALID', 'INACTIVE')),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    device_info TEXT,
    user_agent TEXT,
    ip_address INET,
    customer_identifier VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scans_coupon ON scans(coupon_id);
CREATE INDEX IF NOT EXISTS idx_scans_tenant ON scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(scan_status);
CREATE INDEX IF NOT EXISTS idx_scans_customer ON scans(customer_identifier);

-- Triggers and status function
CREATE OR REPLACE FUNCTION update_coupon_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date <= CURRENT_TIMESTAMP THEN
        NEW.status = 'expired';
    ELSIF NEW.total_usage_limit IS NOT NULL AND NEW.current_usage_count >= NEW.total_usage_limit THEN
        NEW.status = 'exhausted';
    ELSIF NEW.status = 'expired' OR NEW.status = 'exhausted' THEN
        IF OLD.status != NEW.status AND NEW.status = 'active' THEN
            IF NEW.expiry_date > CURRENT_TIMESTAMP AND 
               (NEW.total_usage_limit IS NULL OR NEW.current_usage_count < NEW.total_usage_limit) THEN
                NEW.status = 'active';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_verification_apps_updated_at ON verification_apps;
CREATE TRIGGER update_verification_apps_updated_at BEFORE UPDATE ON verification_apps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_update_coupon_status ON coupons;
CREATE TRIGGER trigger_update_coupon_status BEFORE INSERT OR UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_coupon_status();

-- Seed tenant_credit_balance for existing tenants
INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
SELECT id, 0, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- 003 Batch coupon support
-- ============================================
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_scans_per_code INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS batch_quantity INTEGER;
CREATE INDEX IF NOT EXISTS idx_coupons_batch ON coupons(batch_id);
CREATE INDEX IF NOT EXISTS idx_coupons_scan_limit ON coupons(max_scans_per_code) WHERE max_scans_per_code IS NOT NULL;
COMMENT ON COLUMN coupons.max_scans_per_code IS 'Maximum scans per code. NULL = unlimited, 1 = single-use, N = limited';
COMMENT ON COLUMN coupons.batch_id IS 'UUID grouping coupons in the same batch';
COMMENT ON COLUMN coupons.batch_quantity IS 'Total coupons in the batch (stored on first record)';

-- ============================================
-- 004 Rename tenant columns
-- ============================================
ALTER TABLE tenants RENAME COLUMN company_name TO tenant_name;
ALTER TABLE tenants RENAME COLUMN contact_email TO email;
ALTER TABLE tenants RENAME COLUMN contact_phone TO phone;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- ============================================
-- 005 Tenant subdomain slug
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain_slug VARCHAR(100);
ALTER TABLE tenants ADD CONSTRAINT unique_tenant_subdomain_slug UNIQUE (subdomain_slug);
ALTER TABLE tenants ADD CONSTRAINT check_subdomain_slug_format 
  CHECK (subdomain_slug IS NULL OR subdomain_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$');
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_slug ON tenants(subdomain_slug) WHERE subdomain_slug IS NOT NULL;
UPDATE tenants 
SET subdomain_slug = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(tenant_name, '[^a-zA-Z0-9]+', '-', 'g'),
  '(^-+|-+$)', '', 'g'
))
WHERE subdomain_slug IS NULL;
DO $$
DECLARE
  tenant_record RECORD;
  new_slug VARCHAR(100);
  counter INT;
BEGIN
  FOR tenant_record IN 
    SELECT id, subdomain_slug 
    FROM tenants 
    WHERE subdomain_slug IN (
      SELECT subdomain_slug 
      FROM tenants 
      WHERE subdomain_slug IS NOT NULL
      GROUP BY subdomain_slug 
      HAVING COUNT(*) > 1
    )
    ORDER BY created_at
  LOOP
    counter := 2;
    new_slug := tenant_record.subdomain_slug;
    WHILE EXISTS (SELECT 1 FROM tenants WHERE subdomain_slug = new_slug AND id != tenant_record.id) LOOP
      new_slug := tenant_record.subdomain_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    IF new_slug != tenant_record.subdomain_slug THEN
      UPDATE tenants SET subdomain_slug = new_slug WHERE id = tenant_record.id;
    END IF;
  END LOOP;
END $$;
ALTER TABLE tenants ALTER COLUMN subdomain_slug SET NOT NULL;
COMMENT ON COLUMN tenants.subdomain_slug IS 'Unique subdomain for tenant access';

-- ============================================
-- 006 Sequential coupon codes
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_code_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, prefix)
);
CREATE INDEX IF NOT EXISTS idx_coupon_sequences_tenant_prefix ON coupon_code_sequences(tenant_id, prefix);
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS code_type VARCHAR(20) DEFAULT 'random' CHECK (code_type IN ('random', 'sequential')),
ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_coupons_code_type ON coupons(code_type);
CREATE INDEX IF NOT EXISTS idx_coupons_code_prefix ON coupons(tenant_id, code_prefix) WHERE code_prefix IS NOT NULL;
CREATE OR REPLACE FUNCTION get_next_coupon_sequence(p_tenant_id UUID, p_prefix VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    INSERT INTO coupon_code_sequences (tenant_id, prefix, next_number)
    VALUES (p_tenant_id, p_prefix, 2)
    ON CONFLICT (tenant_id, prefix) 
    DO UPDATE SET 
        next_number = coupon_code_sequences.next_number + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING next_number - 1 INTO v_next_number;
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 007 Coupon reference
-- ============================================
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_reference VARCHAR(20) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_coupons_reference ON coupons(coupon_reference);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_reference ON coupons(tenant_id, coupon_reference);
CREATE OR REPLACE FUNCTION get_next_coupon_reference(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    SELECT get_next_coupon_sequence(p_tenant_id, 'CP') INTO v_next_number;
    RETURN 'CP-' || LPAD(v_next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PRODUCTS CATALOG (from create-products-table.js)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_sku UNIQUE (tenant_id, product_sku)
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, product_sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(tenant_id, product_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(tenant_id, category);
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_product ON coupons(product_id);
COMMENT ON TABLE products IS 'Product catalog for tenants';
COMMENT ON COLUMN products.product_sku IS 'Stock Keeping Unit - unique per tenant';
COMMENT ON COLUMN coupons.product_id IS 'Link to product in catalog (optional)';

-- ============================================
-- CATEGORIES (from create-categories-table.js)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_category UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(tenant_id, name);
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
-- Drop legacy text category column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
      AND column_name = 'category'
  ) THEN
    EXECUTE 'ALTER TABLE products DROP COLUMN category';
  END IF;
END $$;
COMMENT ON TABLE categories IS 'Product categories for tenant organization';
COMMENT ON COLUMN categories.name IS 'Category name - unique per tenant';
COMMENT ON COLUMN products.category_id IS 'Link to category (optional)';

-- ============================================
-- 010 Tenant analytics schema (requires customers later)
-- ============================================
-- From 010_add_tenant_analytics_schema.sql
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON product_categories(tenant_id);
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
-- idx_products_category_id already exists above; avoid duplicate name
-- CREATE INDEX idx_products_category ON products(category_id);
DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM ('draft', 'code_assigned', 'activated', 'live', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE coupon_batches 
ADD COLUMN IF NOT EXISTS dealer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS zone VARCHAR(100),
ADD COLUMN IF NOT EXISTS serial_number_start INTEGER,
ADD COLUMN IF NOT EXISTS serial_number_end INTEGER,
ADD COLUMN IF NOT EXISTS batch_status batch_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS activation_note TEXT;
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='coupon_batches' AND column_name='status' 
             AND data_type != 'USER-DEFINED') THEN
    UPDATE coupon_batches SET batch_status = 'activated' WHERE status = 'active';
    ALTER TABLE coupon_batches DROP COLUMN IF EXISTS status;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_batches_status ON coupon_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_batches_dealer ON coupon_batches(dealer_name);
CREATE TABLE IF NOT EXISTS serial_number_tracker (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  last_serial_number INTEGER DEFAULT 30000,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS serial_number INTEGER,
ADD COLUMN IF NOT EXISTS campaign_id UUID,
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP;
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='coupons' AND column_name='status' 
             AND data_type = 'character varying') THEN
    UPDATE coupons SET status = 'generated' WHERE status NOT IN ('generated', 'printed', 'active', 'scanned', 'expired');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_coupons_serial ON coupons(serial_number);
CREATE INDEX IF NOT EXISTS idx_coupons_campaign ON coupons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE TABLE IF NOT EXISTS reward_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES coupon_batches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reward_type VARCHAR(50) CHECK (reward_type IN ('common', 'custom')),
  common_amount DECIMAL(10,2),
  custom_variations JSONB,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON reward_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_batch ON reward_campaigns(batch_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON reward_campaigns(status);
ALTER TABLE coupons 
ADD CONSTRAINT fk_coupons_campaign 
FOREIGN KEY (campaign_id) REFERENCES reward_campaigns(id) ON DELETE SET NULL;
ALTER TABLE scan_history 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_state VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_scan_history_tenant_date ON scan_history(tenant_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_history_city ON scan_history(tenant_id, customer_city);
CREATE INDEX IF NOT EXISTS idx_scan_history_location ON scan_history(tenant_id, latitude, longitude);
CREATE TABLE IF NOT EXISTS customer_analytics_cache (
  customer_id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  total_products_purchased INTEGER DEFAULT 0,
  total_codes_redeemed INTEGER DEFAULT 0,
  total_rewards_won DECIMAL(10,2) DEFAULT 0,
  first_scan_location VARCHAR(255),
  last_scan_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_tenant ON customer_analytics_cache(tenant_id);
CREATE OR REPLACE FUNCTION update_customer_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_analytics_cache (
    customer_id,
    tenant_id,
    total_codes_redeemed,
    total_rewards_won,
    first_scan_location,
    last_scan_date,
    updated_at
  )
  VALUES (
    NEW.customer_id,
    NEW.tenant_id,
    1,
    COALESCE(NEW.reward_amount, 0),
    NEW.customer_city,
    NEW.scanned_at,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    total_codes_redeemed = customer_analytics_cache.total_codes_redeemed + 1,
    total_rewards_won = customer_analytics_cache.total_rewards_won + COALESCE(NEW.reward_amount, 0),
    last_scan_date = NEW.scanned_at,
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_customer_analytics ON scan_history;
CREATE TRIGGER trigger_update_customer_analytics
  AFTER INSERT ON scan_history
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_analytics_cache();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_reward_campaigns_updated_at ON reward_campaigns;
CREATE TRIGGER update_reward_campaigns_updated_at
  BEFORE UPDATE ON reward_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 011 Defaults for coupon usage limits
-- ============================================
BEGIN;
UPDATE coupons SET total_usage_limit = COALESCE(total_usage_limit, 1);
UPDATE coupons SET per_user_usage_limit = COALESCE(per_user_usage_limit, 1);
UPDATE coupons SET max_scans_per_code = COALESCE(max_scans_per_code, 1);
ALTER TABLE coupons ALTER COLUMN total_usage_limit SET DEFAULT 1;
ALTER TABLE coupons ALTER COLUMN per_user_usage_limit SET DEFAULT 1;
ALTER TABLE coupons ALTER COLUMN max_scans_per_code SET DEFAULT 1;
ALTER TABLE coupons ALTER COLUMN total_usage_limit SET NOT NULL;
ALTER TABLE coupons ALTER COLUMN per_user_usage_limit SET NOT NULL;
ALTER TABLE coupons ALTER COLUMN max_scans_per_code SET NOT NULL;
ALTER TABLE coupons ADD CONSTRAINT chk_total_usage_limit_positive CHECK (total_usage_limit > 0);
ALTER TABLE coupons ADD CONSTRAINT chk_per_user_usage_limit_positive CHECK (per_user_usage_limit > 0);
ALTER TABLE coupons ADD CONSTRAINT chk_max_scans_per_code_positive CHECK (max_scans_per_code > 0);
COMMIT;

-- ============================================
-- 012 Product/SKU fields on coupons
-- ============================================
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS product_sku VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_coupons_product_sku ON coupons(product_sku);
CREATE INDEX IF NOT EXISTS idx_coupons_product_name ON coupons(product_name);
COMMENT ON COLUMN coupons.product_name IS 'Name of the product this coupon applies to';
COMMENT ON COLUMN coupons.product_sku IS 'SKU identifier for the product';

-- ============================================
-- 013 Coupon points
-- ============================================
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_points INTEGER;
CREATE INDEX IF NOT EXISTS idx_coupons_points ON coupons(coupon_points);

-- ============================================
-- 014 Scan sessions
-- ============================================
CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coupon_code VARCHAR(50) NOT NULL,
  device_id TEXT,
  mobile_e164 VARCHAR(20),
  otp_code VARCHAR(6),
  attempts INTEGER DEFAULT 0,
  status VARCHAR(32) NOT NULL CHECK (status IN ('pending-verification','otp-sent','completed','verification-failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_tenant ON scan_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_coupon ON scan_sessions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON scan_sessions(status);

-- ============================================
-- 015 Points ledger
-- ============================================
CREATE TABLE IF NOT EXISTS user_points (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mobile_e164 VARCHAR(20) NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, mobile_e164)
);
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mobile_e164 VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  session_id UUID,
  coupon_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_points_tx_tenant_mobile ON points_transactions(tenant_id, mobile_e164);

-- ============================================
-- 016 Customers
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Add FK after customers exists to avoid early reference errors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'customer_analytics_cache'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'customer_analytics_cache'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'fk_customer_analytics_customer'
  ) THEN
    ALTER TABLE customer_analytics_cache
      ADD CONSTRAINT fk_customer_analytics_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 017 Customer devices
-- ============================================
CREATE TABLE IF NOT EXISTS customer_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_devices_cust ON customer_devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_devices_tenant ON customer_devices(tenant_id);

-- ============================================
-- 018 Mobile OTPs
-- ============================================
CREATE TABLE IF NOT EXISTS mobile_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mobile_e164 VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_tenant ON mobile_otps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mobile_otps_mobile ON mobile_otps(mobile_e164);

-- ============================================
-- 019 Scan events
-- ============================================
CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  session_id UUID REFERENCES scan_sessions(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  coupon_code VARCHAR(50),
  mobile_e164 VARCHAR(20),
  device_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scan_events_tenant ON scan_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_session ON scan_events(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_type ON scan_events(event_type);
CREATE INDEX IF NOT EXISTS idx_scan_events_coupon ON scan_events(coupon_code);
CREATE INDEX IF NOT EXISTS idx_scan_events_created_at ON scan_events(created_at);

-- ============================================
-- Coupon lifecycle
-- ============================================
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_status_check;
ALTER TABLE coupons 
    DROP CONSTRAINT IF EXISTS coupons_status_check,
    ADD CONSTRAINT coupons_status_check 
    CHECK (status IN ('draft', 'printed', 'active', 'used', 'inactive', 'expired', 'exhausted'));
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS printed_count INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS activation_note TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;
ALTER TABLE coupons ALTER COLUMN status SET DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS idx_coupons_status_lifecycle ON coupons(status) WHERE status IN ('draft', 'printed', 'active');
CREATE INDEX IF NOT EXISTS idx_coupons_printed_at ON coupons(printed_at);
CREATE INDEX IF NOT EXISTS idx_coupons_activated_at ON coupons(activated_at);
UPDATE coupons 
SET activated_at = created_at 
WHERE status = 'active' AND activated_at IS NULL;
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_scan_status_check;
ALTER TABLE scans 
    ADD CONSTRAINT scans_scan_status_check 
    CHECK (scan_status IN ('SUCCESS', 'EXPIRED', 'EXHAUSTED', 'INVALID', 'INACTIVE', 'NOT_ACTIVE', 'USED', 'NOT_PRINTED'));
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
DROP TRIGGER IF EXISTS trigger_validate_coupon_status_transition ON coupons;
CREATE TRIGGER trigger_validate_coupon_status_transition
BEFORE UPDATE ON coupons
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION validate_coupon_status_transition();
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
DROP TRIGGER IF EXISTS trigger_update_coupon_status ON coupons;
CREATE TRIGGER trigger_update_coupon_status
BEFORE UPDATE ON coupons
FOR EACH ROW
EXECUTE FUNCTION update_coupon_status();

-- ============================================
-- SEED
-- ============================================
-- From seed.sql
INSERT INTO users (email, full_name, role, is_active)
VALUES ('admin@mscan.com', 'Super Admin', 'SUPER_ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- Verify credit balance for tenants
INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
SELECT id, 0, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
