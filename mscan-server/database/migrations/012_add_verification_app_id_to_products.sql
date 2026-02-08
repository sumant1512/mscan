-- Migration: Add verification_app_id to products table
-- Version: 012
-- Date: 2026-01-26
-- Description: Adds verification_app_id column to products table to link products with verification apps

DO $$
BEGIN
  -- Add verification_app_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'verification_app_id'
  ) THEN
    ALTER TABLE products
    ADD COLUMN verification_app_id UUID REFERENCES verification_apps(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added verification_app_id column to products table';
  ELSE
    RAISE NOTICE 'verification_app_id column already exists in products table';
  END IF;

  -- Create index on verification_app_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'products' AND indexname = 'idx_products_verification_app'
  ) THEN
    CREATE INDEX idx_products_verification_app ON products(verification_app_id);
    RAISE NOTICE 'Created index on products.verification_app_id';
  ELSE
    RAISE NOTICE 'Index idx_products_verification_app already exists';
  END IF;

END $$;

-- Add comment
COMMENT ON COLUMN products.verification_app_id IS 'Link to verification app that owns this product';
