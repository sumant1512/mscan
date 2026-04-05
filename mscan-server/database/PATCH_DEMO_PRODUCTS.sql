-- ============================================================
-- Patch: Demo products for Brand One (paint) and Brand Two (clothing)
-- ============================================================
-- Demo Brand One:
--   - Replaces placeholder products with 4 paint products
--   - Uses Wall Paint & Coatings template (Pack Size + Price)
--   - Categories: Interior Paints, Exterior Paints
--
-- Demo Brand Two:
--   - Creates custom "Clothing Brand" template
--   - Assigns it to the Default Verify App
--   - Creates 4 clothing products
--   - Categories: Topwear, Bottomwear
--   - Adds dealer2@demo.com and staff2@demo.com users
-- ============================================================

-- ---- Demo Brand One: Paint Products ----
DO $$
DECLARE
    v_tenant1_id  UUID;
    v_app_id      UUID;
    v_template_id UUID;
    v_cat_interior  INTEGER;
    v_cat_exterior  INTEGER;
BEGIN
    SELECT id INTO v_tenant1_id FROM tenants WHERE subdomain_slug = 'demo-brand-one';
    IF v_tenant1_id IS NULL THEN
        RAISE NOTICE 'Demo Brand One not found, skipping';
        RETURN;
    END IF;

    SELECT id INTO v_app_id FROM verification_apps
    WHERE tenant_id = v_tenant1_id AND app_name = 'Default Verify App' LIMIT 1;

    SELECT id INTO v_template_id FROM product_templates
    WHERE tenant_id = v_tenant1_id AND template_name = 'Wall Paint & Coatings' LIMIT 1;

    -- Categories
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

    -- Products
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

    RAISE NOTICE 'Demo Brand One: 4 paint products seeded';
END $$;

-- ---- Demo Brand Two: Clothing Brand Template + Products ----
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
    SELECT id INTO v_tenant2_id FROM tenants WHERE subdomain_slug = 'demo-brand-two';
    IF v_tenant2_id IS NULL THEN
        RAISE NOTICE 'Demo Brand Two not found, skipping';
        RETURN;
    END IF;

    SELECT id INTO v_app_id FROM verification_apps
    WHERE tenant_id = v_tenant2_id AND app_name = 'Default Verify App' LIMIT 1;

    SELECT id INTO v_admin_user_id FROM users
    WHERE email = 'tenant2@demo.com' AND tenant_id = v_tenant2_id LIMIT 1;

    -- Custom Clothing Brand template
    IF NOT EXISTS (SELECT 1 FROM product_templates WHERE tenant_id = v_tenant2_id AND template_name = 'Clothing Brand') THEN
        INSERT INTO product_templates (
            tenant_id, template_name, industry_type, description, icon,
            is_system_template, is_active, variant_config, custom_fields
        ) VALUES (
            v_tenant2_id, 'Clothing Brand', 'clothing',
            'Custom template for Demo Brand Two — size, colour, SKU and fabric variants',
            'checkroom', false, true, v_clothing_config, '[]'::jsonb
        )
        RETURNING id INTO v_template_id;
    ELSE
        SELECT id INTO v_template_id FROM product_templates
        WHERE tenant_id = v_tenant2_id AND template_name = 'Clothing Brand' LIMIT 1;
    END IF;

    -- Assign template to verify app
    UPDATE verification_apps
    SET template_id = v_template_id, updated_at = CURRENT_TIMESTAMP
    WHERE id = v_app_id;
    RAISE NOTICE 'Clothing Brand template assigned to Demo Brand Two verify app';

    -- Dealer User
    INSERT INTO users (email, full_name, role, tenant_id, phone_e164, is_active)
    VALUES ('dealer2@demo.com', 'Demo Dealer Two', 'DEALER', v_tenant2_id, '+919000000002', true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_dealer_user_id;
    IF v_dealer_user_id IS NULL THEN
        SELECT id INTO v_dealer_user_id FROM users WHERE email = 'dealer2@demo.com';
    END IF;

    -- Staff User
    INSERT INTO users (email, full_name, role, tenant_id, is_active)
    VALUES ('staff2@demo.com', 'Demo Staff Two', 'TENANT_USER', v_tenant2_id, true)
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
    RETURNING id INTO v_staff_user_id;
    IF v_staff_user_id IS NULL THEN
        SELECT id INTO v_staff_user_id FROM users WHERE email = 'staff2@demo.com';
    END IF;

    -- Dealer Profile
    IF NOT EXISTS (SELECT 1 FROM dealers WHERE user_id = v_dealer_user_id AND verification_app_id = v_app_id) THEN
        INSERT INTO dealers (user_id, tenant_id, verification_app_id, dealer_code, shop_name, address, pincode, city, state, is_active)
        VALUES (v_dealer_user_id, v_tenant2_id, v_app_id, 'DLR002', 'Demo Fashion Store', '45 Fashion Street', '110001', 'New Delhi', 'Delhi', true)
        RETURNING id INTO v_dealer_id;
        INSERT INTO dealer_points (dealer_id, tenant_id, balance)
        VALUES (v_dealer_id, v_tenant2_id, 200)
        ON CONFLICT (dealer_id, tenant_id) DO NOTHING;
    END IF;

    -- Categories
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

    -- 4 Clothing Products
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

    -- Enable all features for Demo Brand Two
    INSERT INTO tenant_features (tenant_id, feature_id, enabled, enabled_by)
    SELECT v_tenant2_id, id, true, v_admin_user_id
    FROM features
    ON CONFLICT (tenant_id, feature_id) DO UPDATE SET enabled = true;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Demo Brand Two seed complete (clothing brand)';
    RAISE NOTICE 'Template : Clothing Brand (Size x Color, Price, SKU, Fabric)';
    RAISE NOTICE 'Products : Polo T-Shirt, Linen Shirt, Slim Jeans, Chinos';
    RAISE NOTICE 'Dealer   : dealer2@demo.com (+919000000002)';
    RAISE NOTICE 'Staff    : staff2@demo.com';
    RAISE NOTICE '==============================================';
END $$;
