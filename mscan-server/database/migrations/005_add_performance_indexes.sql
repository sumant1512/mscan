-- Migration: 005_add_performance_indexes.sql
-- Purpose: Add GIN indexes for JSONB columns and other performance optimizations
-- Created: January 2025

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. GIN indexes for JSONB fields
-- These indexes significantly improve query performance on JSONB columns

-- Index for validation_rules in template_attributes
CREATE INDEX IF NOT EXISTS idx_template_attributes_validation_rules_gin
ON template_attributes USING GIN (validation_rules);

COMMENT ON INDEX idx_template_attributes_validation_rules_gin IS
'GIN index for validation_rules JSONB column - improves queries filtering by validation rules';

-- Index for attribute_value in product_attribute_values
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_value_gin
ON product_attribute_values USING GIN (attribute_value);

COMMENT ON INDEX idx_product_attribute_values_value_gin IS
'GIN index for attribute_value JSONB column - improves attribute-based product searches';

-- Index for api_rate_limits in verification_apps
CREATE INDEX IF NOT EXISTS idx_verification_apps_rate_limits_gin
ON verification_apps USING GIN (api_rate_limits);

COMMENT ON INDEX idx_verification_apps_rate_limits_gin IS
'GIN index for api_rate_limits JSONB column - improves API rate limit queries';

-- Index for api_field_mappings in verification_apps
CREATE INDEX IF NOT EXISTS idx_verification_apps_field_mappings_gin
ON verification_apps USING GIN (api_field_mappings);

COMMENT ON INDEX idx_verification_apps_field_mappings_gin IS
'GIN index for api_field_mappings JSONB column - improves field mapping queries';

-- 2. Additional performance indexes

-- Composite index for product queries by tenant and app
CREATE INDEX IF NOT EXISTS idx_products_tenant_app
ON products (tenant_id, verification_app_id)
WHERE is_active = true;

COMMENT ON INDEX idx_products_tenant_app IS
'Composite index for filtering active products by tenant and app';

-- Index for template_attributes ordered queries
CREATE INDEX IF NOT EXISTS idx_template_attributes_order
ON template_attributes (template_id, display_order);

COMMENT ON INDEX idx_template_attributes_order IS
'Composite index for retrieving attributes in display order';

-- Index for product_attribute_values by product_id (already covered by unique constraint, but explicit)
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_product
ON product_attribute_values (product_id);

COMMENT ON INDEX idx_product_attribute_values_product IS
'Index for retrieving all attributes for a specific product';

-- Full-text search index for product names (using pg_trgm for fuzzy search)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
ON products USING GIN (product_name gin_trgm_ops);

COMMENT ON INDEX idx_products_name_trgm IS
'GIN trigram index for fuzzy search on product names';

-- Full-text search index for template names
CREATE INDEX IF NOT EXISTS idx_templates_name_trgm
ON product_templates USING GIN (name gin_trgm_ops);

COMMENT ON INDEX idx_templates_name_trgm IS
'GIN trigram index for fuzzy search on template names';

-- Index for template search by industry
CREATE INDEX IF NOT EXISTS idx_templates_industry
ON product_templates (industry_type)
WHERE is_active = true;

COMMENT ON INDEX idx_templates_industry IS
'Index for filtering active templates by industry type';

-- 3. API usage optimization indexes (for api_usage_logs table)
-- Creating api_usage_logs table first if it doesn't exist
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_type VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp
ON api_usage_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_app_time
ON api_usage_logs (verification_app_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_type_time
ON api_usage_logs (api_type, created_at DESC);

COMMENT ON TABLE api_usage_logs IS 'Logs for API usage tracking and analytics';

-- 4. Partial indexes for common queries

-- Index for system templates
CREATE INDEX IF NOT EXISTS idx_templates_system
ON product_templates (tenant_id)
WHERE is_system_template = true;

COMMENT ON INDEX idx_templates_system IS
'Partial index for system templates';

-- Index for custom templates
CREATE INDEX IF NOT EXISTS idx_templates_custom
ON product_templates (tenant_id)
WHERE is_system_template = false AND is_active = true;

COMMENT ON INDEX idx_templates_custom IS
'Partial index for active custom templates';

-- 5. Analyze tables to update statistics
ANALYZE product_templates;
ANALYZE template_attributes;
ANALYZE product_attribute_values;
ANALYZE products;
ANALYZE verification_apps;
ANALYZE api_usage_logs;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes created successfully';
  RAISE NOTICE 'GIN indexes: 4 created';
  RAISE NOTICE 'Composite indexes: 2 created';
  RAISE NOTICE 'Full-text search indexes: 2 created';
  RAISE NOTICE 'Partial indexes: 2 created';
  RAISE NOTICE 'API usage indexes: 3 created';
  RAISE NOTICE 'Total new indexes: 13';
  RAISE NOTICE 'api_usage_logs table created';
END $$;
