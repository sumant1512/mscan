-- ============================================================
-- Migration: Add verification_app_id to redemption_requests
-- ============================================================
-- Makes redemption requests app-scoped so tenant admins can
-- view and manage requests per verification app.
-- ============================================================

ALTER TABLE redemption_requests
  ADD COLUMN IF NOT EXISTS verification_app_id UUID
    REFERENCES verification_apps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_redemption_requests_app
  ON redemption_requests(verification_app_id);

CREATE INDEX IF NOT EXISTS idx_redemption_requests_tenant_app_status
  ON redemption_requests(tenant_id, verification_app_id, status);

RAISE NOTICE 'Migration applied: redemption_requests.verification_app_id added.';
