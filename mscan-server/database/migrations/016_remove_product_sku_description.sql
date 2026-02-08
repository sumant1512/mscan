-- Migration: Remove product_sku and description columns
-- Version: 016
-- Date: 2026-02-08
-- Description: Remove unused product_sku and description columns from products table

-- Remove product_sku column (including unique constraint)
ALTER TABLE products DROP COLUMN IF EXISTS product_sku CASCADE;

-- Remove description column
ALTER TABLE products DROP COLUMN IF EXISTS description CASCADE;
