-- ============================================
-- REWARDS SYSTEM MIGRATION
-- Add tables for tenant management, credits, and rewards
-- ============================================

-- ============================================
-- CREDIT REQUESTS TABLE
-- ============================================
CREATE TABLE credit_requests (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_amount INTEGER NOT NULL,
    justification TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    CONSTRAINT chk_amount_positive CHECK (requested_amount > 0)
);

CREATE INDEX idx_credit_requests_tenant ON credit_requests(tenant_id);
CREATE INDEX idx_credit_requests_status ON credit_requests(status);
CREATE INDEX idx_credit_requests_requested_at ON credit_requests(requested_at);

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id INTEGER,
    reference_type VARCHAR(50) CHECK (reference_type IN ('CREDIT_APPROVAL', 'COUPON_CREATION')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_credit_trans_tenant ON credit_transactions(tenant_id);
CREATE INDEX idx_credit_trans_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_trans_created_at ON credit_transactions(created_at);

-- ============================================
-- TENANT CREDIT BALANCE TABLE
-- ============================================
CREATE TABLE tenant_credit_balance (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    total_received INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX idx_credit_balance_tenant ON tenant_credit_balance(tenant_id);

-- ============================================
-- VERIFICATION APPS TABLE
-- ============================================
CREATE TABLE verification_apps (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    welcome_message TEXT,
    scan_success_message TEXT,
    scan_failure_message TEXT,
    post_scan_redirect_url TEXT,
    enable_analytics BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_apps_tenant ON verification_apps(tenant_id);

-- ============================================
-- COUPONS TABLE
-- ============================================
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    verification_app_id INTEGER REFERENCES verification_apps(id) ON DELETE SET NULL,
    coupon_code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y')),
    discount_value DECIMAL(10,2) NOT NULL,
    discount_currency VARCHAR(3) DEFAULT 'USD',
    buy_quantity INTEGER,
    get_quantity INTEGER,
    min_purchase_amount DECIMAL(10,2),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_usage_limit INTEGER,
    per_user_usage_limit INTEGER DEFAULT 1,
    current_usage_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted', 'inactive')),
    qr_code_url TEXT,
    description TEXT,
    terms TEXT,
    credit_cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_discount_positive CHECK (discount_value > 0),
    CONSTRAINT chk_expiry_future CHECK (expiry_date > created_at)
);

CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX idx_coupons_code ON coupons(coupon_code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_expiry ON coupons(expiry_date);
CREATE INDEX idx_coupons_app ON coupons(verification_app_id);

-- ============================================
-- SCANS TABLE
-- ============================================
CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scan_status VARCHAR(20) NOT NULL CHECK (scan_status IN ('SUCCESS', 'EXPIRED', 'EXHAUSTED', 'INVALID', 'INACTIVE')),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    device_info TEXT,
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_scans_coupon ON scans(coupon_id);
CREATE INDEX idx_scans_tenant ON scans(tenant_id);
CREATE INDEX idx_scans_timestamp ON scans(scan_timestamp);
CREATE INDEX idx_scans_status ON scans(scan_status);

-- ============================================
-- INITIALIZE CREDIT BALANCE FOR EXISTING TENANTS
-- ============================================
INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
SELECT id, 0, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- FUNCTION: Auto-update tenant credit balance timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_credit_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credit_balance_timestamp
BEFORE UPDATE ON tenant_credit_balance
FOR EACH ROW
EXECUTE FUNCTION update_credit_balance_timestamp();

-- ============================================
-- FUNCTION: Auto-create credit balance for new tenants
-- ============================================
CREATE OR REPLACE FUNCTION create_tenant_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
    VALUES (NEW.id, 0, 0, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_tenant_credit_balance
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION create_tenant_credit_balance();

-- ============================================
-- FUNCTION: Auto-update coupon status based on expiry and usage
-- ============================================
CREATE OR REPLACE FUNCTION update_coupon_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if expired
    IF NEW.expiry_date <= CURRENT_TIMESTAMP AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    
    -- Check if exhausted
    IF NEW.total_usage_limit IS NOT NULL 
       AND NEW.current_usage_count >= NEW.total_usage_limit 
       AND NEW.status = 'active' THEN
        NEW.status = 'exhausted';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_status
BEFORE UPDATE ON coupons
FOR EACH ROW
EXECUTE FUNCTION update_coupon_status();
