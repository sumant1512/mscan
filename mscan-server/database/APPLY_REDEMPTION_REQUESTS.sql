-- ============================================
-- Redemption Requests Table
-- Tracks customer point redemption requests.
-- Status flow: pending → approved | rejected
-- Points are deducted from user_points.total_points immediately
-- on request (locked), restored on rejection.
-- ============================================

CREATE TABLE IF NOT EXISTS redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  points_requested INTEGER NOT NULL CHECK (points_requested > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redemption_requests_customer ON redemption_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_tenant ON redemption_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_status ON redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_created_at ON redemption_requests(created_at);

CREATE TRIGGER update_redemption_requests_updated_at
  BEFORE UPDATE ON redemption_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
