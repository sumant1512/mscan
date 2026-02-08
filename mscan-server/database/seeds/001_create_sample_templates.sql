-- ============================================
-- Seed Data: Sample Product Templates
-- ============================================
-- Creates Wall Paint and T-Shirt templates with sample tags

DO $$
DECLARE
  v_tenant_id UUID;
  v_paint_template_id UUID;
  v_tshirt_template_id UUID;
  v_app_id UUID;
BEGIN

  -- Get first tenant (adjust if needed)
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Please create a tenant first.';
  END IF;

  -- Get or create a verification app
  SELECT id INTO v_app_id FROM verification_apps WHERE tenant_id = v_tenant_id LIMIT 1;

  IF v_app_id IS NULL THEN
    INSERT INTO verification_apps (tenant_id, app_name, code, is_active)
    VALUES (v_tenant_id, 'Sample App', 'SAMPLE-APP', true)
    RETURNING id INTO v_app_id;
  END IF;

  RAISE NOTICE 'Using Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Using App ID: %', v_app_id;

  -- ============================================
  -- 1. WALL PAINT TEMPLATE
  -- ============================================

  INSERT INTO product_templates (
    tenant_id,
    template_name,
    industry_type,
    description,
    variant_config,
    custom_fields,
    is_active
  ) VALUES (
    v_tenant_id,
    'Wall Paint & Coating',
    'paint',
    'Template for wall paints and coatings with pack size variants',
    '{
      "variant_label": "Pack Size",
      "dimensions": [
        {
          "attribute_key": "pack_size",
          "attribute_name": "Pack Size",
          "type": "text",
          "required": true,
          "placeholder": "e.g., 20L, 10Kg, 4L",
          "help_text": "Enter the size of the pack"
        }
      ],
      "common_fields": [
        {
          "attribute_key": "sku",
          "attribute_name": "SKU",
          "type": "text",
          "required": true,
          "placeholder": "e.g., PAINT-001-20L"
        },
        {
          "attribute_key": "mrp",
          "attribute_name": "MRP (₹)",
          "type": "number",
          "required": true,
          "min": 0,
          "placeholder": "0.00"
        },
        {
          "attribute_key": "discount_percentage",
          "attribute_name": "Discount %",
          "type": "number",
          "required": false,
          "min": 0,
          "max": 100,
          "placeholder": "0"
        }
      ]
    }'::jsonb,
    '[
      {
        "attribute_key": "paint_type",
        "attribute_name": "Paint Type",
        "type": "select",
        "required": true,
        "options": ["Emulsion", "Enamel", "Distemper", "Primer", "Texture", "Weather Proof", "Wood Finish", "Metal Finish"]
      },
      {
        "attribute_key": "finish_type",
        "attribute_name": "Finish Type",
        "type": "select",
        "required": true,
        "options": ["Matte", "Flat", "Eggshell", "Satin", "Semi-Gloss", "High Gloss", "Metallic", "Textured"]
      },
      {
        "attribute_key": "coverage_area",
        "attribute_name": "Coverage Area",
        "type": "text",
        "required": false,
        "placeholder": "e.g., 120-140 sq ft per liter",
        "help_text": "Coverage area per unit"
      },
      {
        "attribute_key": "drying_time",
        "attribute_name": "Drying Time",
        "type": "text",
        "required": false,
        "placeholder": "e.g., Touch dry: 30 min, Hard dry: 6 hours"
      },
      {
        "attribute_key": "washability",
        "attribute_name": "Washability",
        "type": "select",
        "required": false,
        "options": ["Washable", "Stain Resistant", "Scrubbable", "Not Washable"]
      },
      {
        "attribute_key": "surface_type",
        "attribute_name": "Suitable Surfaces",
        "type": "text",
        "required": false,
        "placeholder": "e.g., Interior Walls, Ceiling, Wood",
        "help_text": "Types of surfaces this paint can be applied to"
      }
    ]'::jsonb,
    true
  )
  RETURNING id INTO v_paint_template_id;

  RAISE NOTICE 'Created Wall Paint Template: %', v_paint_template_id;

  -- Create tags for Paint
  INSERT INTO tags (tenant_id, verification_app_id, name, description, icon, is_active) VALUES
  (v_tenant_id, v_app_id, 'Interior Paint', 'For interior walls and ceilings', 'home', true),
  (v_tenant_id, v_app_id, 'Exterior Paint', 'Weather-resistant paint for exterior walls', 'location_city', true),
  (v_tenant_id, v_app_id, 'Premium Quality', 'High-end premium paints', 'star', true),
  (v_tenant_id, v_app_id, 'Eco-Friendly', 'Low VOC and environmentally safe', 'eco', true),
  (v_tenant_id, v_app_id, 'Waterproof', 'Water-resistant coating', 'water_drop', true);

  RAISE NOTICE 'Created 5 tags for Paint products';

  -- ============================================
  -- 2. T-SHIRT TEMPLATE
  -- ============================================

  INSERT INTO product_templates (
    tenant_id,
    template_name,
    industry_type,
    description,
    variant_config,
    custom_fields,
    is_active
  ) VALUES (
    v_tenant_id,
    'T-Shirt & Apparel',
    'apparel',
    'Template for t-shirts and clothing with size and color variants',
    '{
      "variant_label": "Variant",
      "dimensions": [
        {
          "attribute_key": "size",
          "attribute_name": "Size",
          "type": "select",
          "required": true,
          "options": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
        },
        {
          "attribute_key": "color",
          "attribute_name": "Color",
          "type": "text",
          "required": true,
          "placeholder": "e.g., Red, Blue, Black"
        }
      ],
      "common_fields": [
        {
          "attribute_key": "sku",
          "attribute_name": "SKU",
          "type": "text",
          "required": true,
          "placeholder": "e.g., TSHIRT-M-RED"
        },
        {
          "attribute_key": "mrp",
          "attribute_name": "MRP (₹)",
          "type": "number",
          "required": true,
          "min": 0,
          "placeholder": "0.00"
        },
        {
          "attribute_key": "discount_percentage",
          "attribute_name": "Discount %",
          "type": "number",
          "required": false,
          "min": 0,
          "max": 100,
          "placeholder": "0"
        },
        {
          "attribute_key": "stock",
          "attribute_name": "Stock Quantity",
          "type": "number",
          "required": false,
          "min": 0,
          "placeholder": "0"
        }
      ]
    }'::jsonb,
    '[
      {
        "attribute_key": "fabric_type",
        "attribute_name": "Fabric Type",
        "type": "select",
        "required": true,
        "options": ["100% Cotton", "Polyester", "Cotton-Poly Blend", "Linen", "Rayon", "Spandex Blend"]
      },
      {
        "attribute_key": "fit",
        "attribute_name": "Fit",
        "type": "select",
        "required": true,
        "options": ["Regular Fit", "Slim Fit", "Oversized", "Athletic Fit"]
      },
      {
        "attribute_key": "sleeve_length",
        "attribute_name": "Sleeve Length",
        "type": "select",
        "required": true,
        "options": ["Half Sleeve", "Full Sleeve", "Sleeveless", "3/4 Sleeve"]
      },
      {
        "attribute_key": "collar_type",
        "attribute_name": "Collar Type",
        "type": "select",
        "required": false,
        "options": ["Round Neck", "V-Neck", "Polo Collar", "Henley", "Crew Neck"]
      },
      {
        "attribute_key": "gsm",
        "attribute_name": "GSM (Fabric Weight)",
        "type": "number",
        "required": false,
        "placeholder": "e.g., 180",
        "help_text": "Higher GSM means thicker fabric"
      },
      {
        "attribute_key": "pattern",
        "attribute_name": "Pattern",
        "type": "select",
        "required": false,
        "options": ["Solid", "Striped", "Printed", "Checked", "Abstract"]
      }
    ]'::jsonb,
    true
  )
  RETURNING id INTO v_tshirt_template_id;

  RAISE NOTICE 'Created T-Shirt Template: %', v_tshirt_template_id;

  -- Create tags for T-Shirt (using same app for demo, in production these might be different apps)
  INSERT INTO tags (tenant_id, verification_app_id, name, description, icon, is_active) VALUES
  (v_tenant_id, v_app_id, 'Casual Wear', 'Everyday casual clothing', 'checkroom', true),
  (v_tenant_id, v_app_id, 'Sports Wear', 'Athletic and sports apparel', 'sports', true),
  (v_tenant_id, v_app_id, 'Gym Wear', 'Workout and fitness clothing', 'fitness_center', true),
  (v_tenant_id, v_app_id, 'Formal Wear', 'Business and formal attire', 'business_center', true),
  (v_tenant_id, v_app_id, 'Organic Cotton', 'Made from organic cotton', 'nature', true);

  RAISE NOTICE 'Created 5 tags for T-Shirt products';

  -- ============================================
  -- SUMMARY
  -- ============================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED DATA CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'App ID: %', v_app_id;
  RAISE NOTICE 'Paint Template ID: %', v_paint_template_id;
  RAISE NOTICE 'T-Shirt Template ID: %', v_tshirt_template_id;
  RAISE NOTICE 'Total Tags Created: 10';
  RAISE NOTICE '========================================';

END $$;

-- Verify the data
SELECT
  pt.template_name,
  pt.industry_type,
  COUNT(t.id) as tag_count
FROM product_templates pt
LEFT JOIN verification_apps va ON pt.tenant_id = va.tenant_id
LEFT JOIN tags t ON t.verification_app_id = va.id
GROUP BY pt.id, pt.template_name, pt.industry_type
ORDER BY pt.template_name;
