-- ============================================================
-- Migration: Print as action (not a lifecycle status)
-- ============================================================
-- Printing a coupon is now a side-action that logs print history
-- (printed_at, printed_count) without changing the coupon status.
--
-- Lifecycle after this migration:
--   draft → active → used / expired / exhausted / inactive
--
-- Existing 'printed' status rows are preserved for backward
-- compatibility; they can still be activated normally.
-- ============================================================

-- 1. Update the status-transition trigger
CREATE OR REPLACE FUNCTION validate_coupon_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
        -- draft can go directly to active (printing is a side-action)
        IF OLD.status = 'draft' AND NEW.status NOT IN ('active', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from draft to %', NEW.status;
        END IF;
        -- printed kept for backward compatibility with existing rows
        IF OLD.status = 'printed' AND NEW.status NOT IN ('active', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from printed to %', NEW.status;
        END IF;
        IF OLD.status = 'active' AND NEW.status NOT IN ('used', 'inactive', 'expired', 'exhausted') THEN
            RAISE EXCEPTION 'Invalid transition from active to %', NEW.status;
        END IF;
        IF OLD.status = 'used' AND NEW.status NOT IN ('used', 'inactive') THEN
            RAISE EXCEPTION 'Invalid transition from used to %', NEW.status;
        END IF;
    END IF;

    IF NEW.status = 'active' AND OLD.status IN ('draft', 'printed') THEN
        NEW.activated_at = COALESCE(NEW.activated_at, CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. (Optional) Backfill: move any 'printed' coupons back to 'draft'
--    so the new flow is clean. Only run if you want to reset them.
--    Comment out if you want to keep existing 'printed' status rows.
--
-- UPDATE coupons SET status = 'draft' WHERE status = 'printed';

-- Done.
SELECT 'Migration applied: print is now a metadata action, not a lifecycle step' AS result;
