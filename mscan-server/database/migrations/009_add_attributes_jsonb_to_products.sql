-- Migration: Add attributes JSONB column to products table
-- Version: 009
-- Date: 2026-01-25
-- Description: Adds JSONB attributes column to store product attributes instead of using product_attribute_values table

-- ============================================
-- Add attributes column to products table
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attributes'
  ) THEN
    ALTER TABLE products ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added attributes column to products table';
  ELSE
    RAISE NOTICE 'attributes column already exists in products table';
  END IF;
END $$;

-- ============================================
-- Migrate data from product_attribute_values to attributes JSONB
-- ============================================
DO $$
BEGIN
  -- Check if product_attribute_values table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'product_attribute_values'
  ) THEN
    -- Migrate existing attribute values to JSONB
    UPDATE products p
    SET attributes = (
      SELECT COALESCE(jsonb_object_agg(pav.attribute_key, pav.attribute_value::jsonb), '{}'::jsonb)
      FROM product_attribute_values pav
      WHERE pav.product_id = p.id
    )
    WHERE EXISTS (
      SELECT 1 FROM product_attribute_values pav WHERE pav.product_id = p.id
    );

    RAISE NOTICE 'Migrated data from product_attribute_values to attributes JSONB';
  ELSE
    RAISE NOTICE 'product_attribute_values table does not exist, skipping data migration';
  END IF;
END $$;

-- ============================================
-- Create index on attributes JSONB
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);

COMMENT ON COLUMN products.attributes IS 'JSONB column storing product attributes (variants, custom_fields, description_sections)';

-- ============================================
-- Optionally drop old tables (commented out for safety)
-- ============================================
-- DROP TABLE IF EXISTS product_attribute_values CASCADE;
-- DROP TABLE IF EXISTS template_attributes CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 completed: Added attributes JSONB column to products table';
END $$;
