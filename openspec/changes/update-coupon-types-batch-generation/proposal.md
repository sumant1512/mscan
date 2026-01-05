# Change Proposal: Enhanced Coupon Types with Batch Generation

**Change ID**: `update-coupon-types-batch-generation`  
**Status**: Draft  
**Author**: AI Assistant  
**Date**: 2025-12-27

## Summary

Enhance the coupon creation system to support two distinct coupon types with different usage patterns:
1. **Percentage Off Coupons**: Single coupon with minimum order value and limited user redemptions
2. **Fixed Amount Batch Coupons**: Generate multiple unique coupons with single-use-per-code limitation

## Problem Statement

The current coupon system treats all coupons as reusable by the same code. However, business requirements demand:
- Percentage-based discounts that enforce minimum purchase amounts and limit the number of users
- Batch generation of unique fixed-amount coupons where each code can only be scanned once (like gift cards or vouchers)

## Goals

1. Support percentage-off coupons with minimum order value validation
2. Enable batch generation of multiple unique coupon codes in a single request
3. Enforce single-scan limitation per coupon code for batch-generated coupons
4. Maintain backward compatibility with existing coupon functionality
5. Update credit calculation to account for batch generation costs

## Non-Goals

- QR code design customization
- Time-based redemption windows (e.g., valid only on weekends)
- Conditional discounts based on product categories

## Proposed Changes

### 1. Database Schema Updates

**Add new column to `coupons` table:**
- `max_scans_per_code` (INTEGER, nullable): Maximum number of times this specific coupon code can be scanned
  - `NULL` = unlimited scans (default behavior for regular coupons)
  - `1` = single-use (for batch coupons)
  - `N` = can be scanned N times (flexible for various use cases)
- `batch_id` (UUID): Identifier to group coupons created in the same batch
- `batch_quantity` (INTEGER): Total number of coupons in the batch (stored only on master record)

**Benefits of `max_scans_per_code` approach:**
- More flexible than boolean flag
- Supports various scenarios: single-use (1), limited-use (5, 10, etc.), or unlimited (null)
- Single intuitive column instead of multiple flags
- Future-proof design for additional use cases

### 2. Backend API Changes

**Update POST /api/coupons endpoint:**
- Accept new parameter `coupon_generation_type`: 'SINGLE' or 'BATCH'
- For BATCH type:
  - Accept `batch_quantity` (number of unique codes to generate)
  - Generate multiple unique coupon codes
  - Set `max_scans_per_code = 1` for all batch coupons
  - Link all coupons with same `batch_id`
  - Return array of generated coupon codes
- For percentage coupons:
  - Validate `min_purchase_amount` is required
  - Validate `total_usage_limit` represents max number of users

**Credit cost calculation:**
- Base cost per coupon for batch generation
- Multiplier based on batch quantity
- Percentage coupons: cost based on discount value, duration, and user limit

### 3. Frontend Changes

**Update Coupon Create Form:**
- Add radio button to select coupon generation type (Single/Batch)
- For Percentage Off:
  - Make "Minimum Purchase Amount" required
  - Rename "Total Usage Limit" to "Max Number of Users"
  - Add help text explaining limitation
- For Fixed Amount Off with Batch type:
  - Show "Number of Coupons" input
  - Show "Amount per Coupon" input
  - Show estimated total cost for batch
  - Display success message with all generated codes
  - Provide download/export option for generated codes

### 4. Scan Validation Logic

**Update scan validation:**
- Check `max_scans_per_code`: If set, count existing scans for this specific coupon code and reject if limit reached
- For percentage coupons: Validate minimum purchase amount (if provided by scanner)
- For user-limited coupons: Track unique users and enforce `total_usage_limit`

**Scan validation flow:**
1. Check if coupon exists and is active
2. Check if expired
3. If `max_scans_per_code` is set:
   - Count scans for this coupon code: `SELECT COUNT(*) FROM scans WHERE coupon_id = ?`
   - If count >= `max_scans_per_code`, reject with "Code limit reached"
4. Check other validations (user limit, min purchase, etc.)
ALTER TABLE coupons ADD COLUMN batch_quantity INTEGER;
CREATE INDEX idx_coupons_batch ON coupons(batch_id);

-- max_scans_per_code: NULL = unlimited, 1 = single-use, N = N scans allowed

### Database Migration

```sql
-- Add new columns
ALTER TABLE coupons ADD COLUMN is_single_use_code BOOLEAN DEFAULT false;
ALTER TABLE coupons ADD COLUMN batch_id UUID;
ALTER TABLE coupons ADD COLUMN batch_quantity INTEGER;
   - Set batch_id and max_scans_per_code = 1h_id);
```

### Batch Generation Logic

1. Validate credit balance covers entire batch
2. Generate batch_id (UUID)
3. Loop to create N coupons:
   - Generate unique coupon code
   - Insert coupon record with shared parameters
   - Set batch_id and is_single_use_code flags
4. Store batch_quantity on first coupon record
5. Deduct credits in single transaction
6. Return all generated codes

### Cost Calculation Updates

```javascript
// Percentage coupon
if (discount_type === 'PERCENTAGE') {
  baseCost = 100;
  discountMultiplier = discount_value * 2;
  userLimitCost = total_usage_limit * 15;
  durationCost = daysValid * 5;
  total = baseCost + discountMultiplier + userLimitCost + durationCost;
}

// Batch fixed amount
if (discount_type === 'FIXED_AMOUNT' && generation_type === 'BATCH') {
  baseCost = 50;
  perCouponCost = discount_value * 0.3;
  batchMultiplier = batch_quantity * (baseCost + perCouponCost);
  total = batchMultiplier;
}
```

## User Experience

### Percentage Off Coupon Creation Flow

1. Select "Percentage Off" discount type
2. Enter discount percentage (e.g., 20%)
3. Enter minimum purchase amount (required) (e.g., $50)
4. Enter max number of users (e.g., 100 users)
5. Set expiry date
6. Review cost estimate
7. Submit → Single coupon code generated
8. Users scan code → System validates min purchase and user limit

### Batch Fixed Amount Coupon Creation Flow

1. Select "Fixed Amount Off" discount type
2. Select "Generate Multiple Coupons" option
3. Enter amount per coupon (e.g., $10)
4. Enter number of coupons to generate (e.g., 50)
5. Set expiry date
6. Review cost estimate (50 coupons × cost)
7. Submit → 50 unique codes generated
8. Download CSV with all codesmax_scans_per_code = NULL` means unlimited
9. Each code can be scanned exactly once

## Migration Strategy

1. Add new database columns (nullable initially)
2. Deploy backend wcan limit validation (1, 5, 10, unlimited)
3. Integration test for percentage coupon with min purchase validation
4. Integration test for batch coupon scan exhaustion
5. Integration test for limited-scan coupon (e.g., 5 scans max)
6. Credit calculation tests for batch pricing
7
## Testing Requirements

1. Unit tests for batch coupon generation
2. Unit tests for single-use validation
3. Integration test for percentage coupon with min purchase validation
4. Integration test for batch coupon scan exhaustion
5. Credit calculation tests for batch pricing
6. Concurrent batch generation test (avoid duplicate codes)

## Risks & Mitigations

**RBackward Compatibility

✅ Existing coupons continue to work:
- `max_scans_per_code` defaults to `NULL` (unlimited scans)
- `batch_id` and `batch_quantity` are nullable
- Single coupon creation still works as before
- No data migration needed for existing records
**Risk**: Users confused by new UI options  
**Mitigation**: Add clear help text, tooltips, and example values

## can limit enforcement: 0% of limited coupons scanned beyond their limit
- Percentage coupons correctly enforce minimum purchase amount
- Credit cost accurately reflects batch quantity
- Zero duplicate coupon codes generated
- Support for flexible scan limits (1, 5, 10, unlimited) (hide UI option)
2. Backend continues to support single coupon creation
3. Database columns are nullable, so no schema rollback needed

## Success Metrics

- Ability to generate batch coupons up to 500 codes
- Single-use enforcement: 0% of batch coupons scanned more than once
- Percentage coupons correctly enforce minimum purchase amount
- Credit cost accurately reflects batch quantity
- Zero duplicate coupon codes generated

## Open Questions

1. Should we support CSV upload for custom coupon codes in batch generation?
2. Should batch coupons support different amounts per code, or all same amount?
3. Do we need bulk export functionality for existing coupons?

## Approval

- [ ] Product Owner
- [ ] Technical Lead
- [ ] Security Review (if needed)
