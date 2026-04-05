-- ============================================================
-- Patch: Wall Paint & Coatings template — Pack Size + Price
-- ============================================================
-- 1. Updates variant_config on all existing Wall Paint & Coatings
--    system templates to add Pack Size dimension and Price field.
-- 2. Reassigns each tenant's default verify app to use the
--    Wall Paint & Coatings template.
-- ============================================================

DO $$
DECLARE
    v_tenant       RECORD;
    v_template_id  UUID;
    v_app_id       UUID;
    v_paint_config JSONB := '{
      "variant_label": "Pack Size",
      "dimensions": [
        {
          "attribute_key": "pack_size",
          "attribute_name": "Pack Size",
          "type": "select",
          "required": true,
          "options": ["1L", "4L", "10L", "20L"],
          "placeholder": "Select pack size",
          "help_text": "Select the size of the paint pack"
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
        }
      ]
    }'::jsonb;
BEGIN
    FOR v_tenant IN SELECT id, tenant_name FROM tenants WHERE is_active = true ORDER BY created_at LOOP

        -- 1. Update Wall Paint & Coatings template
        UPDATE product_templates
        SET variant_config = v_paint_config,
            updated_at     = CURRENT_TIMESTAMP
        WHERE tenant_id      = v_tenant.id
          AND template_name  = 'Wall Paint & Coatings'
          AND is_system_template = true;

        IF FOUND THEN
            RAISE NOTICE 'Updated Wall Paint & Coatings template for tenant "%"', v_tenant.tenant_name;
        ELSE
            RAISE NOTICE 'Wall Paint & Coatings template not found for tenant "%" — skipping', v_tenant.tenant_name;
        END IF;

        -- 2. Resolve the Wall Paint & Coatings template id
        SELECT id INTO v_template_id
        FROM product_templates
        WHERE tenant_id     = v_tenant.id
          AND template_name = 'Wall Paint & Coatings'
        LIMIT 1;

        IF v_template_id IS NULL THEN
            RAISE NOTICE 'No Wall Paint & Coatings template for tenant "%" — verify app not updated', v_tenant.tenant_name;
            CONTINUE;
        END IF;

        -- 3. Reassign verify app template
        UPDATE verification_apps
        SET template_id = v_template_id,
            updated_at  = CURRENT_TIMESTAMP
        WHERE tenant_id = v_tenant.id
          AND app_name  = 'Default Verify App';

        IF FOUND THEN
            RAISE NOTICE 'Verify app template updated to Wall Paint & Coatings for tenant "%"', v_tenant.tenant_name;
        ELSE
            RAISE NOTICE 'Default Verify App not found for tenant "%" — skipping', v_tenant.tenant_name;
        END IF;

    END LOOP;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Patch complete.';
    RAISE NOTICE 'Wall Paint & Coatings: variant_label=Pack Size,';
    RAISE NOTICE '  dimension=pack_size (1L/4L/10L/20L),';
    RAISE NOTICE '  common_field=price (number, required)';
    RAISE NOTICE 'Default Verify App now uses Wall Paint & Coatings template.';
    RAISE NOTICE '==============================================';
END $$;
