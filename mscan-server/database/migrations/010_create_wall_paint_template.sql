-- Migration: Create Wall Paint and Coatings Template
-- Version: 010
-- Date: 2026-01-26
-- Description: Creates a comprehensive template for wall paints and coatings with variants and structured descriptions

DO $$
DECLARE
  v_template_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get the first tenant (adjust if needed)
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant found, skipping template creation';
    RETURN;
  END IF;

  -- Check if template already exists
  IF EXISTS (
    SELECT 1 FROM product_templates 
    WHERE template_name = 'Wall Paint & Coatings' AND tenant_id = v_tenant_id
  ) THEN
    RAISE NOTICE 'Wall Paint & Coatings template already exists';
    RETURN;
  END IF;

  -- Create the template
  INSERT INTO product_templates (
    id,
    tenant_id,
    template_name,
    description,
    variant_config,
    custom_fields,
    is_active
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    'Wall Paint & Coatings',
    'Complete template for wall paints, emulsions, primers, and coating products with size variants and structured descriptions',
    -- Variant Configuration for different pack sizes
    jsonb_build_object(
      'variant_label', 'Pack Sizes',
      'dimensions', jsonb_build_array(
        jsonb_build_object(
          'attribute_key', 'pack_size',
          'attribute_name', 'Pack Size',
          'type', 'select',
          'required', true,
          'options', jsonb_build_array('200ml', '500ml', '1L', '2L', '4L', '10L', '20L')
        ),
        jsonb_build_object(
          'attribute_key', 'pack_type',
          'attribute_name', 'Pack Type',
          'type', 'select',
          'required', true,
          'options', jsonb_build_array('Tin', 'Plastic Can', 'Bucket', 'Drum')
        )
      ),
      'common_fields', jsonb_build_array(
        jsonb_build_object(
          'attribute_key', 'sku',
          'attribute_name', 'SKU Code',
          'type', 'text',
          'required', true,
          'placeholder', 'e.g., WP-WHT-1L-TIN'
        ),
        jsonb_build_object(
          'attribute_key', 'mrp',
          'attribute_name', 'MRP (₹)',
          'type', 'number',
          'required', true,
          'min', 0
        ),
        jsonb_build_object(
          'attribute_key', 'stock_qty',
          'attribute_name', 'Stock Quantity',
          'type', 'number',
          'required', false,
          'min', 0
        )
      )
    ),
    -- Custom Fields for product attributes
    jsonb_build_array(
      -- Basic Information Group
      jsonb_build_object(
        'attribute_key', 'brand_name',
        'attribute_name', 'Brand Name',
        'data_type', 'select',
        'is_required', true,
        'display_order', 1,
        'field_group', 'Basic Information',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Asian Paints', 'Berger Paints', 'Nerolac', 'Dulux', 'Nippon Paint', 'Indigo Paints', 'Kansai Nerolac', 'Other')
        ),
        'help_text', 'Select the paint brand'
      ),
      jsonb_build_object(
        'attribute_key', 'paint_type',
        'attribute_name', 'Paint Type',
        'data_type', 'select',
        'is_required', true,
        'display_order', 2,
        'field_group', 'Basic Information',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Emulsion', 'Enamel', 'Primer', 'Distemper', 'Texture Paint', 'Waterproofing', 'Wood Finish', 'Metal Paint')
        )
      ),
      jsonb_build_object(
        'attribute_key', 'color_name',
        'attribute_name', 'Color Name',
        'data_type', 'string',
        'is_required', true,
        'display_order', 3,
        'field_group', 'Basic Information',
        'placeholder', 'e.g., Pure White, Cream Delight, Sky Blue',
        'help_text', 'Official color name from brand'
      ),
      jsonb_build_object(
        'attribute_key', 'color_code',
        'attribute_name', 'Color Code',
        'data_type', 'string',
        'is_required', false,
        'display_order', 4,
        'field_group', 'Basic Information',
        'placeholder', 'e.g., #FFFFFF or RAL-9010'
      ),
      jsonb_build_object(
        'attribute_key', 'finish_type',
        'attribute_name', 'Finish Type',
        'data_type', 'select',
        'is_required', true,
        'display_order', 5,
        'field_group', 'Basic Information',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Matt', 'Satin', 'Eggshell', 'Semi-Gloss', 'High Gloss', 'Flat')
        )
      ),
      -- Technical Specifications Group
      jsonb_build_object(
        'attribute_key', 'coverage_area',
        'attribute_name', 'Coverage Area (sq ft per litre)',
        'data_type', 'number',
        'is_required', true,
        'display_order', 6,
        'field_group', 'Technical Specifications',
        'validation_rules', jsonb_build_object(
          'min_value', 50,
          'max_value', 200
        ),
        'help_text', 'Approximate coverage in square feet per litre'
      ),
      jsonb_build_object(
        'attribute_key', 'drying_time',
        'attribute_name', 'Drying Time (hours)',
        'data_type', 'string',
        'is_required', true,
        'display_order', 7,
        'field_group', 'Technical Specifications',
        'placeholder', 'e.g., 4-6 hours (touch dry), 12-14 hours (recoat)',
        'help_text', 'Time for touch dry and recoat'
      ),
      jsonb_build_object(
        'attribute_key', 'recommended_coats',
        'attribute_name', 'Recommended Coats',
        'data_type', 'select',
        'is_required', true,
        'display_order', 8,
        'field_group', 'Technical Specifications',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('1', '2', '3', '2-3')
        )
      ),
      jsonb_build_object(
        'attribute_key', 'voc_content',
        'attribute_name', 'VOC Content',
        'data_type', 'select',
        'is_required', false,
        'display_order', 9,
        'field_group', 'Technical Specifications',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Low VOC', 'Zero VOC', 'Standard', 'Not Specified')
        )
      ),
      jsonb_build_object(
        'attribute_key', 'washability',
        'attribute_name', 'Washability',
        'data_type', 'select',
        'is_required', false,
        'display_order', 10,
        'field_group', 'Technical Specifications',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Highly Washable', 'Washable', 'Scrubbable', 'Not Washable')
        )
      ),
      -- Application Details Group
      jsonb_build_object(
        'attribute_key', 'surface_type',
        'attribute_name', 'Suitable Surface Types',
        'data_type', 'multi-select',
        'is_required', true,
        'display_order', 11,
        'field_group', 'Application Details',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Interior Walls', 'Exterior Walls', 'Ceiling', 'Wood', 'Metal', 'Concrete', 'Plaster')
        )
      ),
      jsonb_build_object(
        'attribute_key', 'application_method',
        'attribute_name', 'Application Method',
        'data_type', 'multi-select',
        'is_required', true,
        'display_order', 12,
        'field_group', 'Application Details',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('Brush', 'Roller', 'Spray Gun', 'Airless Spray')
        )
      ),
      jsonb_build_object(
        'attribute_key', 'dilution_ratio',
        'attribute_name', 'Dilution Ratio',
        'data_type', 'string',
        'is_required', false,
        'display_order', 13,
        'field_group', 'Application Details',
        'placeholder', 'e.g., 10-15% water for first coat',
        'help_text', 'Water or thinner dilution ratio'
      ),
      -- Features & Benefits Group
      jsonb_build_object(
        'attribute_key', 'key_features',
        'attribute_name', 'Key Features',
        'data_type', 'multi-select',
        'is_required', false,
        'display_order', 14,
        'field_group', 'Features & Benefits',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array(
            'Anti-Bacterial',
            'Anti-Fungal',
            'Weather Resistant',
            'Stain Resistant',
            'Easy to Clean',
            'Quick Dry',
            'Low Odor',
            'Eco-Friendly',
            'UV Protection',
            'Heat Reflective',
            'Crack Resistance',
            'Smooth Finish'
          )
        )
      ),
      jsonb_build_object(
        'attribute_key', 'special_properties',
        'attribute_name', 'Special Properties',
        'data_type', 'string',
        'is_required', false,
        'display_order', 15,
        'field_group', 'Features & Benefits',
        'placeholder', 'Any unique selling points or special characteristics',
        'validation_rules', jsonb_build_object(
          'max_length', 500
        )
      ),
      -- Warranty & Certification Group
      jsonb_build_object(
        'attribute_key', 'warranty_years',
        'attribute_name', 'Warranty Period (Years)',
        'data_type', 'select',
        'is_required', false,
        'display_order', 16,
        'field_group', 'Warranty & Certification',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('No Warranty', '1 Year', '2 Years', '3 Years', '5 Years', '7 Years', '10 Years', '15 Years')
        )
      ),
      jsonb_build_object(
        'attribute_key', 'certifications',
        'attribute_name', 'Certifications',
        'data_type', 'multi-select',
        'is_required', false,
        'display_order', 17,
        'field_group', 'Warranty & Certification',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('ISO Certified', 'Green Product', 'Bureau of Indian Standards (BIS)', 'LEED Certified', 'GreenGuard')
        )
      ),
      -- Product Description (Structured)
      jsonb_build_object(
        'attribute_key', 'product_description',
        'attribute_name', 'Product Description Sections',
        'data_type', 'structured-list',
        'is_required', true,
        'display_order', 18,
        'field_group', 'Product Description',
        'validation_rules', jsonb_build_object(
          'min_sections', 3,
          'max_sections', 8,
          'min_points_per_section', 2,
          'max_points_per_section', 10
        ),
        'help_text', 'Add structured sections like Features, Benefits, Application Guide, Coverage Details, etc.'
      ),
      -- Manufacturing Details Group
      jsonb_build_object(
        'attribute_key', 'manufacturing_date',
        'attribute_name', 'Manufacturing Date',
        'data_type', 'date',
        'is_required', false,
        'display_order', 19,
        'field_group', 'Manufacturing Details'
      ),
      jsonb_build_object(
        'attribute_key', 'batch_number',
        'attribute_name', 'Batch Number',
        'data_type', 'string',
        'is_required', false,
        'display_order', 20,
        'field_group', 'Manufacturing Details',
        'placeholder', 'Batch/Lot number'
      ),
      jsonb_build_object(
        'attribute_key', 'shelf_life',
        'attribute_name', 'Shelf Life (Months)',
        'data_type', 'select',
        'is_required', false,
        'display_order', 21,
        'field_group', 'Manufacturing Details',
        'validation_rules', jsonb_build_object(
          'options', jsonb_build_array('12', '18', '24', '36', '48')
        )
      )
    ),
    true
  ) RETURNING id INTO v_template_id;

  RAISE NOTICE 'Created Wall Paint & Coatings template with ID: %', v_template_id;

END $$;
