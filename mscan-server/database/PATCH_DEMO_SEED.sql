-- ============================================================
-- Patch: Fix demo seed data for E2E testing
-- ============================================================
-- Run this against your existing database to:
--   1. Add tenant admin user  tenant1@demo.com  (demo-brand-one)
--   2. Add dealer user        dealer1@demo.com  (mobile: +919000000001)
--   3. Add staff user         staff1@demo.com
--   4. Create dealer profile, categories, products
--   5. Enable all features for Demo Brand One
--   6. Create a coupon batch with 5 active coupons ready to scan
-- ============================================================

DO $$
DECLARE
    v_tenant1_id     UUID;
    v_app_id         UUID;
    v_template_id    UUID;
    v_dealer_user_id UUID;
    v_staff_user_id  UUID;
    v_dealer_id      UUID;
    v_batch_id       UUID;
    v_cat_electronics INTEGER;
    v_cat_apparel     INTEGER;
    v_admin_user_id  UUID;
BEGIN
    -- Resolve tenant
    SELECT id INTO v_tenant1_id FROM tenants WHERE subdomain_slug = 'demo-brand-one';
    IF v_tenant1_id IS NULL THEN
        RAISE EXCEPTION 'Demo Brand One tenant not found. Run full_setup.sql first.';
    END IF;

    -- Resolve verification app
    SELECT id INTO v_app_id FROM verification_apps
    WHERE tenant_id = v_tenant1_id LIMIT 1;
    IF v_app_id IS NULL THEN
        RAISE EXCEPTION 'No verify app found for Demo Brand One. Run full_setup.sql first.';
    END IF;

    -- Resolve Basic Product template
    SELECT id INTO v_template_id FROM product_templates
    WHERE tenant_id = v_tenant1_id AND template_name = 'Basic Product' LIMIT 1;

    -- ---- 1. Tenant Admin ----
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('tenant1@demo.com', 'Admin One', 'TENANT_ADMIN', v_tenant1_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING;

    SELECT id INTO v_admin_user_id FROM users
    WHERE email = 'tenant1@demo.com' AND tenant_id = v_tenant1_id;

    RAISE NOTICE 'Tenant admin: tenant1@demo.com (id: %)', v_admin_user_id;

    -- ---- 2. Dealer User ----
    INSERT INTO users (email, full_name, role, tenant_id, phone_e164, is_active)
    VALUES ('dealer1@demo.com', 'Demo Dealer One', 'DEALER', v_tenant1_id, '+919000000001', true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_dealer_user_id;

    IF v_dealer_user_id IS NULL THEN
        SELECT id INTO v_dealer_user_id FROM users WHERE email = 'dealer1@demo.com';
    END IF;

    -- ---- 3. Staff User ----
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('staff1@demo.com', 'Demo Staff One', 'TENANT_USER', v_tenant1_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_staff_user_id;

    IF v_staff_user_id IS NULL THEN
        SELECT id INTO v_staff_user_id FROM users WHERE email = 'staff1@demo.com';
    END IF;

    -- ---- 4. Dealer Profile ----
    IF NOT EXISTS (SELECT 1 FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id) THEN
        INSERT INTO dealers (user_id, tenant_id, verification_app_id, dealer_code, shop_name, address, pincode, city, state, is_active)
        VALUES (v_dealer_user_id, v_tenant1_id, v_app_id, 'DLR001', 'Demo Electronics Store', '12 Market Street', '400001', 'Mumbai', 'Maharashtra', true)
        RETURNING id INTO v_dealer_id;

        INSERT INTO dealer_points (dealer_id, tenant_id, balance)
        VALUES (v_dealer_id, v_tenant1_id, 150)
        ON CONFLICT (dealer_id, tenant_id) DO NOTHING;
    ELSE
        SELECT id INTO v_dealer_id FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id;
    END IF;

    RAISE NOTICE 'Dealer profile created/found: %', v_dealer_id;

    -- ---- 5. Categories ----
    IF NOT EXISTS (SELECT 1 FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Electronics') THEN
        INSERT INTO categories (tenant_id, verification_app_id, name, description, is_active)
        VALUES (v_tenant1_id, v_app_id, 'Electronics', 'Electronic gadgets and accessories', true)
        RETURNING id INTO v_cat_electronics;
    ELSE
        SELECT id INTO v_cat_electronics FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Electronics' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Apparel') THEN
        INSERT INTO categories (tenant_id, verification_app_id, name, description, is_active)
        VALUES (v_tenant1_id, v_app_id, 'Apparel', 'Clothing and fashion items', true)
        RETURNING id INTO v_cat_apparel;
    ELSE
        SELECT id INTO v_cat_apparel FROM categories WHERE tenant_id = v_tenant1_id AND name = 'Apparel' LIMIT 1;
    END IF;

    -- ---- 6. Products ----
    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Demo Smartphone X1') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_electronics, 'Demo Smartphone X1', 29999.00, 'INR', 'active', true, 'https://placehold.co/400x400?text=Smartphone+X1');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Demo Wireless Earbuds Pro') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_electronics, 'Demo Wireless Earbuds Pro', 4999.00, 'INR', 'active', true, 'https://placehold.co/400x400?text=Earbuds+Pro');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = v_tenant1_id AND product_name = 'Demo Classic T-Shirt') THEN
        INSERT INTO products (tenant_id, verification_app_id, template_id, category_id, product_name, price, currency, status, is_active, thumbnail_url)
        VALUES (v_tenant1_id, v_app_id, v_template_id, v_cat_apparel, 'Demo Classic T-Shirt', 799.00, 'INR', 'active', true, 'https://placehold.co/400x400?text=T-Shirt');
    END IF;

    -- ---- 7. Enable all features for Demo Brand One ----
    INSERT INTO tenant_features (tenant_id, feature_id, enabled, enabled_by)
    SELECT v_tenant1_id, id, true, v_admin_user_id
    FROM features
    ON CONFLICT (tenant_id, feature_id) DO UPDATE SET enabled = true;

    -- ---- 8. Coupon Batch ----
    IF NOT EXISTS (SELECT 1 FROM coupon_batches WHERE tenant_id = v_tenant1_id AND batch_name = 'Demo Batch Q1-2026') THEN
        INSERT INTO coupon_batches (tenant_id, verification_app_id, batch_name, dealer_name, zone, total_coupons, serial_number_start, serial_number_end, batch_status, activated_at)
        VALUES (v_tenant1_id, v_app_id, 'Demo Batch Q1-2026', 'Demo Dealer One', 'West', 5, 1, 5, 'activated', NOW())
        RETURNING id INTO v_batch_id;
    ELSE
        SELECT id INTO v_batch_id FROM coupon_batches WHERE tenant_id = v_tenant1_id AND batch_name = 'Demo Batch Q1-2026';
    END IF;

    -- ---- 9. Active Coupons (ready to scan) ----
    INSERT INTO coupons (
        tenant_id, verification_app_id, coupon_code, discount_type, discount_value, discount_currency,
        expiry_date, total_usage_limit, per_user_usage_limit, status, credit_cost, max_scans_per_code,
        batch_id, code_type, coupon_reference, serial_number, description, activated_at, coupon_points
    ) VALUES
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0001', 'PERCENTAGE',  10.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-001', 1, 'Demo 10% off coupon', NOW(), 10),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0002', 'PERCENTAGE',  15.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-002', 2, 'Demo 15% off coupon', NOW(), 15),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0003', 'FIXED_AMOUNT', 200.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-003', 3, 'Demo flat Rs.200 off coupon', NOW(), 20),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0004', 'FIXED_AMOUNT', 500.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-004', 4, 'Demo flat Rs.500 off coupon', NOW(), 50),
    (v_tenant1_id, v_app_id, 'DEMO-ACTV-0005', 'PERCENTAGE',  20.00, 'INR', NOW() + INTERVAL '6 months', 1, 1, 'active', 1, 1, v_batch_id, 'sequential', 'DEMO-Q1-005', 5, 'Demo 20% off coupon', NOW(), 20)
    ON CONFLICT (coupon_code) DO NOTHING;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Demo seed applied successfully!';
    RAISE NOTICE 'Tenant Admin : tenant1@demo.com  (subdomain: demo-brand-one)';
    RAISE NOTICE 'Dealer       : dealer1@demo.com  (phone: +919000000001)';
    RAISE NOTICE 'Staff        : staff1@demo.com';
    RAISE NOTICE 'Coupons      : DEMO-ACTV-0001 to DEMO-ACTV-0005 (status: active)';
    RAISE NOTICE '==============================================';
END $$;
