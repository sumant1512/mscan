-- Migration: Add Multi-App Architecture Support
-- Date: 2026-01-09
-- Description: Adds app scoping to categories/products and user credits system

-- ============================================
-- STEP 1: Add columns to verification_apps
-- ============================================

-- Add code for URL-friendly identifier
ALTER TABLE verification_apps 
ADD COLUMN IF NOT EXISTS code VARCHAR(100);

-- Add API key for external authentication
ALTER TABLE verification_apps 
ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);

-- Add active status
ALTER TABLE verification_apps 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add unique constraints after data population
-- (Will be done after setting values for existing rows)

-- ============================================
-- STEP 2: Add verification_app_id to categories
-- ============================================

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS verification_app_id UUID REFERENCES verification_apps(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_app ON categories(verification_app_id);

-- ============================================
-- STEP 3: Add verification_app_id to products
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS verification_app_id UUID REFERENCES verification_apps(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_app ON products(verification_app_id);

-- ============================================
-- STEP 4: Create user_credits table
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

-- ============================================
-- STEP 5: Create user_credit_transactions table
-- ============================================

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
COMMENT ON COLUMN user_credit_transactions.verification_app_id IS 'Which app generated/consumed the credits (nullable for tracking)';

-- ============================================
-- STEP 6: Update existing data
-- ============================================

-- Generate code and api_key for existing verification apps
-- This will be done programmatically via Node.js script

-- For testing, you can manually set values:
-- UPDATE verification_apps SET 
--   code = LOWER(REPLACE(app_name, ' ', '-')),
--   api_key = gen_random_uuid()::text,
--   is_active = true
-- WHERE code IS NULL;

-- ============================================
-- STEP 7: Add unique constraints
-- ============================================

-- Add unique constraints after data is populated
-- Uncomment after running data population:
-- ALTER TABLE verification_apps ADD CONSTRAINT unique_verification_app_code UNIQUE (tenant_id, code);
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_apps_api_key ON verification_apps(api_key);

-- ============================================
-- STEP 8: Migration Notes
-- ============================================

-- To complete this migration:
-- 1. Run this SQL file to create schema
-- 2. Run data migration script to:
--    - Generate codes and API keys for existing apps
--    - Create default app for existing categories/products
--    - Assign verification_app_id to existing data
-- 3. Run final SQL to add NOT NULL and UNIQUE constraints
