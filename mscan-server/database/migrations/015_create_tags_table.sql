-- Migration: Create tags table
-- Version: 015
-- Date: 2026-02-06
-- Description: Add tags table for product categorization and organization

-- Create tags table if it doesn't exist
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique tag names per verification app
  CONSTRAINT unique_tag_name_per_app UNIQUE (verification_app_id, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_verification_app_id ON tags(verification_app_id);
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Add comment
COMMENT ON TABLE tags IS 'Tags for organizing and categorizing products within verification apps';

-- Verification
DO $$
DECLARE
  tags_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tags'
  ) INTO tags_exists;

  IF tags_exists THEN
    RAISE NOTICE '✅ Migration successful: tags table created';
  ELSE
    RAISE EXCEPTION 'Migration verification failed!';
  END IF;
END $$;
