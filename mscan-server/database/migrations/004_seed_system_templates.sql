-- Migration: Seed System Templates
-- Version: 004
-- Date: 2026-01-22
-- Description: Inserts system templates for 11 industries with predefined attributes

-- ============================================================
-- HELPER FUNCTION: Insert Template with Attributes
-- ============================================================

CREATE OR REPLACE FUNCTION insert_template_with_attributes(
    p_tenant_id UUID,
    p_name VARCHAR,
    p_industry VARCHAR,
    p_description TEXT,
    p_icon VARCHAR,
    p_attributes JSONB
) RETURNS UUID AS $$
DECLARE
    v_template_id UUID;
    v_attr JSONB;
BEGIN
    -- Insert template
    INSERT INTO product_templates (tenant_id, name, industry_type, description, icon, is_system_template, is_active)
    VALUES (p_tenant_id, p_name, p_industry, p_description, p_icon, true, true)
    RETURNING id INTO v_template_id;

    -- Insert attributes
    FOR v_attr IN SELECT * FROM jsonb_array_elements(p_attributes)
    LOOP
        INSERT INTO template_attributes (
            template_id, attribute_name, attribute_key, data_type,
            is_required, validation_rules, default_value, display_order,
            field_group, help_text, placeholder
        ) VALUES (
            v_template_id,
            v_attr->>'attribute_name',
            v_attr->>'attribute_key',
            v_attr->>'data_type',
            COALESCE((v_attr->>'is_required')::boolean, false),
            v_attr->'validation_rules',
            v_attr->>'default_value',
            COALESCE((v_attr->>'display_order')::integer, 0),
            v_attr->>'field_group',
            v_attr->>'help_text',
            v_attr->>'placeholder'
        );
    END LOOP;

    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Get Super Admin Tenant ID
-- ============================================================

DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get the first tenant (could be super admin tenant or system tenant)
    -- In production, this should be a dedicated system tenant
    SELECT id INTO v_tenant_id FROM tenants ORDER BY id LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No tenants found. Please run tenant setup first.';
    END IF;

    -- ============================================================
    -- 1. BASIC TEMPLATE (for backward compatibility)
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Basic Product',
        'basic',
        'Simple product template with essential fields only',
        'inventory_2',
        '[
            {"attribute_name": "Brand", "attribute_key": "brand", "data_type": "string", "is_required": false, "display_order": 1, "field_group": "basic", "placeholder": "e.g., Nike, Apple"},
            {"attribute_name": "Model Number", "attribute_key": "model_number", "data_type": "string", "is_required": false, "display_order": 2, "field_group": "basic", "placeholder": "e.g., ABC-123"},
            {"attribute_name": "Warranty Period (months)", "attribute_key": "warranty_months", "data_type": "number", "is_required": false, "display_order": 3, "field_group": "basic", "validation_rules": {"min": 0, "max": 120}}
        ]'::jsonb
    );

    -- ============================================================
    -- 2. CLOTHING & APPAREL TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Clothing & Apparel',
        'clothing',
        'Template for shirts, pants, dresses, and other clothing items',
        'checkroom',
        '[
            {"attribute_name": "Size", "attribute_key": "size", "data_type": "select", "is_required": true, "display_order": 1, "field_group": "sizing", "validation_rules": {"allowed_values": ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]}},
            {"attribute_name": "Color", "attribute_key": "color", "data_type": "string", "is_required": true, "display_order": 2, "field_group": "basic", "placeholder": "e.g., Black, Navy Blue"},
            {"attribute_name": "Material Composition", "attribute_key": "material", "data_type": "multi-select", "is_required": true, "display_order": 3, "field_group": "specifications", "validation_rules": {"allowed_values": ["Cotton", "Polyester", "Silk", "Wool", "Linen", "Elastane", "Nylon", "Rayon"], "min_selections": 1}},
            {"attribute_name": "Gender", "attribute_key": "gender", "data_type": "select", "is_required": true, "display_order": 4, "field_group": "basic", "validation_rules": {"allowed_values": ["Men", "Women", "Unisex", "Boys", "Girls"]}},
            {"attribute_name": "Fit Type", "attribute_key": "fit_type", "data_type": "select", "is_required": false, "display_order": 5, "field_group": "sizing", "validation_rules": {"allowed_values": ["Slim Fit", "Regular Fit", "Loose Fit", "Oversized"]}},
            {"attribute_name": "Brand", "attribute_key": "brand", "data_type": "string", "is_required": false, "display_order": 6, "field_group": "basic", "placeholder": "e.g., Nike, Adidas"},
            {"attribute_name": "Care Instructions", "attribute_key": "care_instructions", "data_type": "string", "is_required": false, "display_order": 7, "field_group": "specifications", "placeholder": "e.g., Machine wash cold"},
            {"attribute_name": "Weight (grams)", "attribute_key": "weight_grams", "data_type": "number", "is_required": false, "display_order": 8, "field_group": "specifications", "validation_rules": {"min": 0, "max": 5000}}
        ]'::jsonb
    );

    -- ============================================================
    -- 3. FOOTWEAR TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Footwear',
        'footwear',
        'Template for shoes, sandals, boots, and other footwear',
        'run_circle',
        '[
            {"attribute_name": "Size (EU)", "attribute_key": "size_eu", "data_type": "number", "is_required": true, "display_order": 1, "field_group": "sizing", "validation_rules": {"min": 20, "max": 55}},
            {"attribute_name": "Size (US)", "attribute_key": "size_us", "data_type": "number", "is_required": false, "display_order": 2, "field_group": "sizing", "validation_rules": {"min": 3, "max": 18, "decimals": 1}},
            {"attribute_name": "Size (UK)", "attribute_key": "size_uk", "data_type": "number", "is_required": false, "display_order": 3, "field_group": "sizing", "validation_rules": {"min": 2, "max": 17, "decimals": 1}},
            {"attribute_name": "Width", "attribute_key": "width", "data_type": "select", "is_required": false, "display_order": 4, "field_group": "sizing", "validation_rules": {"allowed_values": ["Narrow", "Medium", "Wide", "Extra Wide"]}},
            {"attribute_name": "Color", "attribute_key": "color", "data_type": "string", "is_required": true, "display_order": 5, "field_group": "basic"},
            {"attribute_name": "Material", "attribute_key": "material", "data_type": "multi-select", "is_required": true, "display_order": 6, "field_group": "specifications", "validation_rules": {"allowed_values": ["Leather", "Suede", "Canvas", "Synthetic", "Rubber", "Mesh"], "min_selections": 1}},
            {"attribute_name": "Heel Height (cm)", "attribute_key": "heel_height", "data_type": "number", "is_required": false, "display_order": 7, "field_group": "specifications", "validation_rules": {"min": 0, "max": 20, "decimals": 1}},
            {"attribute_name": "Closure Type", "attribute_key": "closure_type", "data_type": "select", "is_required": false, "display_order": 8, "field_group": "specifications", "validation_rules": {"allowed_values": ["Lace-up", "Slip-on", "Velcro", "Buckle", "Zipper"]}}
        ]'::jsonb
    );

    -- ============================================================
    -- 4. JEWELRY & ACCESSORIES TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Jewelry & Accessories',
        'jewelry',
        'Template for rings, necklaces, bracelets, and other jewelry',
        'diamond',
        '[
            {"attribute_name": "Metal Type", "attribute_key": "metal_type", "data_type": "select", "is_required": true, "display_order": 1, "field_group": "materials", "validation_rules": {"allowed_values": ["Gold", "Silver", "Platinum", "Rose Gold", "White Gold", "Stainless Steel", "Titanium"]}},
            {"attribute_name": "Gemstone", "attribute_key": "gemstone", "data_type": "multi-select", "is_required": false, "display_order": 2, "field_group": "materials", "validation_rules": {"allowed_values": ["Diamond", "Ruby", "Sapphire", "Emerald", "Pearl", "Opal", "Topaz", "Amethyst"]}},
            {"attribute_name": "Carat Weight", "attribute_key": "carat_weight", "data_type": "number", "is_required": false, "display_order": 3, "field_group": "specifications", "validation_rules": {"min": 0, "max": 100, "decimals": 2}},
            {"attribute_name": "Purity", "attribute_key": "purity", "data_type": "select", "is_required": false, "display_order": 4, "field_group": "specifications", "validation_rules": {"allowed_values": ["14K", "18K", "22K", "24K", "925 Sterling", "950 Platinum"]}},
            {"attribute_name": "Gender", "attribute_key": "gender", "data_type": "select", "is_required": false, "display_order": 5, "field_group": "basic", "validation_rules": {"allowed_values": ["Men", "Women", "Unisex"]}},
            {"attribute_name": "Style", "attribute_key": "style", "data_type": "string", "is_required": false, "display_order": 6, "field_group": "basic", "placeholder": "e.g., Modern, Vintage, Classic"},
            {"attribute_name": "Chain Length (cm)", "attribute_key": "chain_length", "data_type": "number", "is_required": false, "display_order": 7, "field_group": "specifications", "validation_rules": {"min": 10, "max": 100}}
        ]'::jsonb
    );

    -- ============================================================
    -- 5. WALL PAINT & COATINGS TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Wall Paint & Coatings',
        'paint',
        'Template for paints, varnishes, and coating products',
        'format_paint',
        '[
            {"attribute_name": "Volume (Liters)", "attribute_key": "volume_liters", "data_type": "number", "is_required": true, "display_order": 1, "field_group": "specifications", "validation_rules": {"min": 0.25, "max": 20, "decimals": 2}},
            {"attribute_name": "Color Code", "attribute_key": "color_code", "data_type": "string", "is_required": true, "display_order": 2, "field_group": "basic", "placeholder": "e.g., RAL 9010, #FFFFFF"},
            {"attribute_name": "Finish Type", "attribute_key": "finish_type", "data_type": "select", "is_required": true, "display_order": 3, "field_group": "basic", "validation_rules": {"allowed_values": ["Matte", "Eggshell", "Satin", "Semi-Gloss", "Gloss"]}},
            {"attribute_name": "Coverage Area (sqm)", "attribute_key": "coverage_area_sqm", "data_type": "number", "is_required": false, "display_order": 4, "field_group": "specifications", "validation_rules": {"min": 0, "max": 200}},
            {"attribute_name": "Base Type", "attribute_key": "base_type", "data_type": "select", "is_required": true, "display_order": 5, "field_group": "specifications", "validation_rules": {"allowed_values": ["Water-Based", "Oil-Based", "Latex", "Acrylic", "Enamel"]}},
            {"attribute_name": "Drying Time (hours)", "attribute_key": "drying_time", "data_type": "number", "is_required": false, "display_order": 6, "field_group": "specifications", "validation_rules": {"min": 0.5, "max": 48, "decimals": 1}}
        ]'::jsonb
    );

    -- ============================================================
    -- 6. BAGS & LUGGAGE TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Bags & Luggage',
        'bags',
        'Template for backpacks, suitcases, handbags, and travel bags',
        'work_outline',
        '[
            {"attribute_name": "Capacity (Liters)", "attribute_key": "capacity_liters", "data_type": "number", "is_required": false, "display_order": 1, "field_group": "specifications", "validation_rules": {"min": 5, "max": 150}},
            {"attribute_name": "Material", "attribute_key": "material", "data_type": "multi-select", "is_required": true, "display_order": 2, "field_group": "materials", "validation_rules": {"allowed_values": ["Leather", "Canvas", "Nylon", "Polyester", "PU Leather", "Polycarbonate"], "min_selections": 1}},
            {"attribute_name": "Number of Compartments", "attribute_key": "compartments", "data_type": "number", "is_required": false, "display_order": 3, "field_group": "specifications", "validation_rules": {"min": 1, "max": 20}},
            {"attribute_name": "Closure Type", "attribute_key": "closure_type", "data_type": "select", "is_required": false, "display_order": 4, "field_group": "specifications", "validation_rules": {"allowed_values": ["Zipper", "Magnetic Snap", "Drawstring", "Buckle", "Velcro"]}},
            {"attribute_name": "Dimensions (L x W x H cm)", "attribute_key": "dimensions", "data_type": "string", "is_required": false, "display_order": 5, "field_group": "specifications", "placeholder": "e.g., 45 x 30 x 15"},
            {"attribute_name": "Wheel Type", "attribute_key": "wheel_type", "data_type": "select", "is_required": false, "display_order": 6, "field_group": "specifications", "validation_rules": {"allowed_values": ["None", "2-Wheel", "4-Wheel Spinner", "Inline Skate"]}}
        ]'::jsonb
    );

    -- ============================================================
    -- 7. ELECTRONICS & GADGETS TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Electronics & Gadgets',
        'electronics',
        'Template for phones, tablets, laptops, and electronic devices',
        'devices',
        '[
            {"attribute_name": "Model Number", "attribute_key": "model_number", "data_type": "string", "is_required": true, "display_order": 1, "field_group": "basic", "placeholder": "e.g., iPhone 15 Pro"},
            {"attribute_name": "Specifications", "attribute_key": "specifications", "data_type": "string", "is_required": false, "display_order": 2, "field_group": "specifications", "placeholder": "e.g., 6GB RAM, 128GB Storage"},
            {"attribute_name": "Warranty (months)", "attribute_key": "warranty_months", "data_type": "number", "is_required": false, "display_order": 3, "field_group": "basic", "validation_rules": {"min": 0, "max": 60}},
            {"attribute_name": "Power Requirements", "attribute_key": "power_requirements", "data_type": "string", "is_required": false, "display_order": 4, "field_group": "specifications", "placeholder": "e.g., 220V, USB-C 65W"},
            {"attribute_name": "Connectivity", "attribute_key": "connectivity", "data_type": "multi-select", "is_required": false, "display_order": 5, "field_group": "specifications", "validation_rules": {"allowed_values": ["WiFi", "Bluetooth", "5G", "4G LTE", "NFC", "USB-C", "HDMI"]}}
        ]'::jsonb
    );

    -- ============================================================
    -- 8. COSMETICS & BEAUTY TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Cosmetics & Beauty',
        'cosmetics',
        'Template for skincare, makeup, fragrances, and beauty products',
        'face_retouching_natural',
        '[
            {"attribute_name": "Volume (ml)", "attribute_key": "volume_ml", "data_type": "number", "is_required": false, "display_order": 1, "field_group": "specifications", "validation_rules": {"min": 1, "max": 1000}},
            {"attribute_name": "Skin Type", "attribute_key": "skin_type", "data_type": "multi-select", "is_required": false, "display_order": 2, "field_group": "suitability", "validation_rules": {"allowed_values": ["Normal", "Dry", "Oily", "Combination", "Sensitive"]}},
            {"attribute_name": "Key Ingredients", "attribute_key": "ingredients", "data_type": "string", "is_required": false, "display_order": 3, "field_group": "specifications", "placeholder": "e.g., Hyaluronic Acid, Vitamin C"},
            {"attribute_name": "SPF Level", "attribute_key": "spf", "data_type": "number", "is_required": false, "display_order": 4, "field_group": "specifications", "validation_rules": {"min": 0, "max": 100}},
            {"attribute_name": "Fragrance", "attribute_key": "fragrance", "data_type": "select", "is_required": false, "display_order": 5, "field_group": "suitability", "validation_rules": {"allowed_values": ["Fragrance-Free", "Light Fragrance", "Strong Fragrance"]}},
            {"attribute_name": "Shelf Life (months)", "attribute_key": "expiry_months", "data_type": "number", "is_required": false, "display_order": 6, "field_group": "specifications", "validation_rules": {"min": 3, "max": 60}}
        ]'::jsonb
    );

    -- ============================================================
    -- 9. FOOD & BEVERAGE TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Food & Beverage',
        'food',
        'Template for packaged food items and beverages',
        'restaurant',
        '[
            {"attribute_name": "Weight/Volume", "attribute_key": "weight_grams", "data_type": "number", "is_required": true, "display_order": 1, "field_group": "specifications", "validation_rules": {"min": 1, "max": 10000}},
            {"attribute_name": "Key Ingredients", "attribute_key": "ingredients", "data_type": "string", "is_required": false, "display_order": 2, "field_group": "specifications", "placeholder": "e.g., Wheat flour, Sugar, Salt"},
            {"attribute_name": "Allergens", "attribute_key": "allergens", "data_type": "multi-select", "is_required": false, "display_order": 3, "field_group": "specifications", "validation_rules": {"allowed_values": ["Gluten", "Nuts", "Dairy", "Eggs", "Soy", "Fish", "Shellfish", "Sesame"]}},
            {"attribute_name": "Nutritional Info", "attribute_key": "nutritional_info", "data_type": "string", "is_required": false, "display_order": 4, "field_group": "specifications", "placeholder": "e.g., 250 kcal per 100g"},
            {"attribute_name": "Expiry Date", "attribute_key": "expiry_date", "data_type": "date", "is_required": false, "display_order": 5, "field_group": "specifications"},
            {"attribute_name": "Storage Conditions", "attribute_key": "storage_conditions", "data_type": "select", "is_required": false, "display_order": 6, "field_group": "specifications", "validation_rules": {"allowed_values": ["Room Temperature", "Refrigerate", "Freeze", "Cool & Dry Place"]}}
        ]'::jsonb
    );

    -- ============================================================
    -- 10. HOME & FURNITURE TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Home & Furniture',
        'furniture',
        'Template for furniture, home decor, and appliances',
        'weekend',
        '[
            {"attribute_name": "Dimensions (L x W x H cm)", "attribute_key": "dimensions", "data_type": "string", "is_required": true, "display_order": 1, "field_group": "specifications", "placeholder": "e.g., 180 x 90 x 75"},
            {"attribute_name": "Material", "attribute_key": "material", "data_type": "multi-select", "is_required": true, "display_order": 2, "field_group": "materials", "validation_rules": {"allowed_values": ["Wood", "Metal", "Glass", "Plastic", "Fabric", "Leather"], "min_selections": 1}},
            {"attribute_name": "Weight (kg)", "attribute_key": "weight_kg", "data_type": "number", "is_required": false, "display_order": 3, "field_group": "specifications", "validation_rules": {"min": 0, "max": 500}},
            {"attribute_name": "Assembly Required", "attribute_key": "assembly_required", "data_type": "boolean", "is_required": false, "display_order": 4, "field_group": "specifications"},
            {"attribute_name": "Warranty (months)", "attribute_key": "warranty_months", "data_type": "number", "is_required": false, "display_order": 5, "field_group": "specifications", "validation_rules": {"min": 0, "max": 120}},
            {"attribute_name": "Care Instructions", "attribute_key": "care_instructions", "data_type": "string", "is_required": false, "display_order": 6, "field_group": "specifications", "placeholder": "e.g., Wipe with damp cloth"}
        ]'::jsonb
    );

    -- ============================================================
    -- 11. SPORTS & FITNESS TEMPLATE
    -- ============================================================

    PERFORM insert_template_with_attributes(
        v_tenant_id,
        'Sports & Fitness',
        'sports',
        'Template for sports equipment, fitness gear, and athletic apparel',
        'fitness_center',
        '[
            {"attribute_name": "Size", "attribute_key": "size", "data_type": "select", "is_required": false, "display_order": 1, "field_group": "sizing", "validation_rules": {"allowed_values": ["XS", "S", "M", "L", "XL", "XXL", "One Size"]}},
            {"attribute_name": "Weight (kg)", "attribute_key": "weight", "data_type": "number", "is_required": false, "display_order": 2, "field_group": "specifications", "validation_rules": {"min": 0, "max": 100, "decimals": 2}},
            {"attribute_name": "Material", "attribute_key": "material", "data_type": "multi-select", "is_required": false, "display_order": 3, "field_group": "materials", "validation_rules": {"allowed_values": ["Polyester", "Nylon", "Spandex", "Cotton", "Rubber", "Steel", "Aluminum"]}},
            {"attribute_name": "Sport Type", "attribute_key": "sport_type", "data_type": "select", "is_required": false, "display_order": 4, "field_group": "basic", "validation_rules": {"allowed_values": ["Running", "Cycling", "Swimming", "Gym", "Yoga", "Team Sports", "Outdoor"]}},
            {"attribute_name": "Gender", "attribute_key": "gender", "data_type": "select", "is_required": false, "display_order": 5, "field_group": "basic", "validation_rules": {"allowed_values": ["Men", "Women", "Unisex"]}},
            {"attribute_name": "Skill Level", "attribute_key": "skill_level", "data_type": "select", "is_required": false, "display_order": 6, "field_group": "suitability", "validation_rules": {"allowed_values": ["Beginner", "Intermediate", "Advanced", "Professional"]}}
        ]'::jsonb
    );

    RAISE NOTICE 'Successfully created 11 system templates';

END $$;

-- ============================================================
-- Cleanup Helper Function
-- ============================================================

DROP FUNCTION IF EXISTS insert_template_with_attributes(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, JSONB);
