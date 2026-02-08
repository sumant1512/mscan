-- Migration: Add attributes JSONB column to products table
-- Version: 017
-- Date: 2026-02-08
-- Description: Add attributes column to store dynamic product attributes based on templates

-- Add attributes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attributes'
  ) THEN
    ALTER TABLE products ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;

    -- Create GIN index for efficient JSONB queries
    CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN (attributes);

    -- Add comment
    COMMENT ON COLUMN products.attributes IS 'Dynamic product attributes stored as JSONB based on template';
  END IF;
END $$;
