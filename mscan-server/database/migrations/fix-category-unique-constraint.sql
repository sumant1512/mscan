-- Migration: Fix Category Unique Constraint for Multi-App Architecture
-- Date: 2026-01-11
-- Description: Update unique constraint to scope categories per tenant AND verification_app_id

-- Drop the old constraint
ALTER TABLE categories DROP CONSTRAINT IF EXISTS unique_tenant_category;

-- Add new constraint that includes verification_app_id
ALTER TABLE categories 
ADD CONSTRAINT unique_tenant_app_category UNIQUE (tenant_id, verification_app_id, name);

-- Note: This allows the same category name across different apps within the same tenant
-- e.g., "Electronics" can exist in both "Store A" and "Store B" apps for the same tenant
