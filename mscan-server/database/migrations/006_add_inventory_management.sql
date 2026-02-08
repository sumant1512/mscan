-- Migration: 006_add_inventory_management.sql
-- Purpose: Add stock/inventory management features to products
-- Created: January 2025

-- 1. Add stock-related columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50) DEFAULT 'in_stock';

-- Add check constraints
ALTER TABLE products
  ADD CONSTRAINT check_stock_quantity_positive CHECK (stock_quantity >= 0),
  ADD CONSTRAINT check_low_stock_threshold_positive CHECK (low_stock_threshold >= 0),
  ADD CONSTRAINT check_stock_status CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued'));

-- Add index for stock queries
CREATE INDEX IF NOT EXISTS idx_products_stock_status
ON products (stock_status)
WHERE track_inventory = true;

COMMENT ON COLUMN products.stock_quantity IS 'Current available stock quantity';
COMMENT ON COLUMN products.low_stock_threshold IS 'Threshold for low stock alerts';
COMMENT ON COLUMN products.track_inventory IS 'Whether to track inventory for this product';
COMMENT ON COLUMN products.allow_backorder IS 'Allow orders when out of stock';
COMMENT ON COLUMN products.stock_status IS 'Current stock status: in_stock, low_stock, out_of_stock, discontinued';

-- 2. Create stock_movements table for inventory tracking
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
ON stock_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant
ON stock_movements (tenant_id, created_at DESC);

COMMENT ON TABLE stock_movements IS 'Audit log for all stock/inventory changes';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type: restock, sale, adjustment, reservation, return';
COMMENT ON COLUMN stock_movements.reference_type IS 'Related entity: order, coupon_scan, manual, etc.';

-- 3. Create webhooks table for event notifications
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_app_id UUID NOT NULL REFERENCES verification_apps(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  webhook_url TEXT NOT NULL,
  secret_key VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_app_event
ON webhooks (verification_app_id, event_type)
WHERE is_active = true;

COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON COLUMN webhooks.event_type IS 'Event types: low_stock, out_of_stock, product_updated, order_created, etc.';
COMMENT ON COLUMN webhooks.secret_key IS 'Secret key for webhook signature validation';

-- 4. Create webhook_logs table for delivery tracking
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_status VARCHAR(50) NOT NULL,
  attempts INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook
ON webhook_logs (webhook_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status
ON webhook_logs (delivery_status, created_at DESC);

COMMENT ON TABLE webhook_logs IS 'Logs for webhook delivery attempts';
COMMENT ON COLUMN webhook_logs.delivery_status IS 'Status: pending, success, failed, retrying';

-- 5. Create function to automatically update stock_status
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_inventory = true THEN
    IF NEW.stock_quantity <= 0 THEN
      NEW.stock_status = 'out_of_stock';
    ELSIF NEW.stock_quantity <= NEW.low_stock_threshold THEN
      NEW.stock_status = 'low_stock';
    ELSE
      NEW.stock_status = 'in_stock';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock status updates
DROP TRIGGER IF EXISTS trigger_update_stock_status ON products;
CREATE TRIGGER trigger_update_stock_status
  BEFORE INSERT OR UPDATE OF stock_quantity, low_stock_threshold, track_inventory
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_status();

COMMENT ON FUNCTION update_product_stock_status() IS 'Automatically updates stock_status based on quantity and threshold';

-- 6. Create function to log stock movements
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity AND NEW.track_inventory = true THEN
    INSERT INTO stock_movements (
      product_id,
      tenant_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      notes
    ) VALUES (
      NEW.id,
      NEW.tenant_id,
      CASE
        WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'restock'
        WHEN NEW.stock_quantity < OLD.stock_quantity THEN 'deduction'
        ELSE 'adjustment'
      END,
      ABS(NEW.stock_quantity - OLD.stock_quantity),
      OLD.stock_quantity,
      NEW.stock_quantity,
      'Automatic stock movement log'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock movement logging
DROP TRIGGER IF EXISTS trigger_log_stock_movement ON products;
CREATE TRIGGER trigger_log_stock_movement
  AFTER UPDATE OF stock_quantity
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_movement();

COMMENT ON FUNCTION log_stock_movement() IS 'Automatically logs stock movements when quantity changes';

-- 7. Analyze tables
ANALYZE products;
ANALYZE stock_movements;
ANALYZE webhooks;
ANALYZE webhook_logs;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Inventory management features added successfully';
  RAISE NOTICE 'Tables created: stock_movements, webhooks, webhook_logs';
  RAISE NOTICE 'Columns added to products: stock_quantity, low_stock_threshold, track_inventory, allow_backorder, stock_status';
  RAISE NOTICE 'Triggers created: auto stock status update, auto stock movement logging';
  RAISE NOTICE 'Indexes created: 4';
END $$;
