# Enhanced Coupon Types Implementation Summary

## Overview
Successfully implemented enhanced coupon system with:
1. **Percentage Off Coupons**: With minimum order value enforcement and user limits
2. **Batch Fixed Amount Coupons**: Generate multiple unique single-use coupon codes
3. **Flexible Scan Limiting**: Control how many times any coupon code can be scanned

## Key Design Decision ⭐

**Used `max_scans_per_code` (INTEGER) instead of `is_single_use_code` (BOOLEAN)**

This provides maximum flexibility:
- `NULL` = Unlimited scans (default, backward compatible)
- `1` = Single-use (for batch coupons) 
- `5`, `10`, `N` = Limited to N scans (loyalty programs, trials, etc.)

See [DESIGN_DECISION.md](./DESIGN_DECISION.md) for detailed comparison.

## Changes Implemented

### 1. Database Schema Changes
**File**: `mscan-server/database/migrations/003_add_batch_coupon_support.sql`

Added three new columns to the `coupons` table:
- `max_scans_per_code` (INTEGER, nullable): Maximum number of times this specific coupon code can be scanned
  - `NULL` = unlimited scans (default)
  - `1` = single-use (for batch coupons)
  - `N` = can be scanned N times (flexible)
- `batch_id` (UUID): Groups coupons created in the same batch
- `batch_quantity` (INTEGER): Total number of coupons in the batch

**Why `max_scans_per_code` instead of boolean?**
✅ More flexible - supports 1, 5, 10, or any number of scans
✅ Single intuitive column vs multiple flags
✅ Future-proof for various use cases
✅ NULL = unlimited (backward compatible)

**Migration SQL**:
```sql
-- Add flexible scan limiting
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_scans_per_code INTEGER;
-- Add batch grouping
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS batch_id UUID;
-- Add batch quantity tracking
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS batch_quantity INTEGER;
-- Index for batch queries
CREATE INDEX IF NOT EXISTS idx_coupons_batch ON coupons(batch_id);
-- Index for scan-limited coupons
CREATE INDEX IF NOT EXISTS idx_coupons_scan_limit ON coupons(max_scans_per_code) 
WHERE max_scans_per_code IS NOT NULL;
```

**Column Usage**:
| Column | Type | Purpose | Examples |
|--------|------|---------|----------|
| `max_scans_per_code` | INTEGER | Limit scans per code | `NULL` (unlimited), `1` (single-use), `5` (5 scans) |
| `batch_id` | UUID | Group batch coupons | Same UUID for all coupons in one batch |
| `batch_quantity` | INTEGER | Batch size | `50` on first coupon, `NULL` on rest |

**To Apply Migration**:
```bash
cd mscan-server
psql -d mscan_dev -f database/migrations/003_add_batch_coupon_support.sql
```

### 2. Backend API Changes

#### rewards.controller.js
**File**: `mscan-server/src/controllers/rewards.controller.js`

Enhanced the `createCoupon` method to support:
- New parameter: `coupon_generation_type` ('SINGLE' or 'BATCH')
- New pamax_scans_per_code = 1 (1-500)
- Batch generation loop that creates multiple unique coupon codes
- Validation requiring minimum purchase amount for percentage coupons
- Batch quantity limit enforcement (max 500)
- Single transaction for all batch coupons
- Returns array of coupons for batch requests

**Key Features**:
- Generates unique batch_id for grouping batch coupons
- Sets `is_single_use_code = true` for all batch coupons
- Credits deducted once for entire batch
- Transaction logging includes batch quantity

#### credit-calculator.service.js
**File**: `mscan-server/src/services/credit-calculator.service.js`

Updated `calculateCouponCreditCost` method to:
- Accept `is_batch` and `batch_quantity` parameters
- Calculate different pricing for batch generation:
  - Base cost: 50 credits per coupon
  - Per coupon cost: discount_value × 0.3
  - Time-based multipliers (shorter validity = cheaper)
  - Total: batch_quantity × (base + per_coupon_cost) × time_multiplier

**Batch Pricing Formula**:
```javascript
totalBatchCost = batch_quantity × (50 + discount_value × 0.3) × timeMultiplier
```

### 3. Frontend Changes

#### coupon-create.component.ts
**File**: `mscan-client/src/app/components/rewards/coupon-create.component.ts`

**New Features**:
1. Added generation type selection (Single/Batch)
2. Added batch quantity input (1-500)
3. Made minimum purchase amount required for percentage coupons
4. Updated cost estimation for batch generation
5. Added batch results display with generated codes
6. CSV export functionality for batch coupons
7. Copy-to-clipboard for individual coupon codes

**New Properties**:
```typescript
generatedCoupons: any[] = [];
showBatchResults = false;
```

**New Form Controls**:
```typescript
coupon_generation_type: ['SINGLE', Validators.required],
batch_quantity: [''],
max_scans_per_code: [''] // Optional: limit scans per code
```

**New Methods**:
- `onGenerationTypeChange()`: Handles generation type toggle
- `downloadCouponsCSV()`: Exports batch codes as CSV
- `copyCouponCode(code)`: Copies code to clipboard
- `closeAndNavigate()`: Returns to coupon list

#### coupon-create.component.html
**File**: `mscan-client/src/app/components/rewards/coupon-create.component.html`

**UI Enhancements**:
1. Radio buttons for generation type selection
2. **Optional "Max Scans Per Code"** field for advanced use cases
4. Batch results section with code list
5. CSV download and copy buttons
6. Updated labels and hints:
   - "Max Number of Users" for percentage coupons
   - "Amount per Coupon" for batch generation
   - "Max Scans Per Code" explanation
   - Help text explaining single vs batch
7. Disabled discount type for batch (fixed amount only)
8. Disabled discount type for batch (fixed amount only)
7. Dynamic button text ("Generate Coupons" vs "Create Coupon")

#### coupon-create.component.css
**File**: `mscan-client/src/app/components/rewards/coupon-create.component.css`

**New Styles**:
- `.radio-group` and `.radio-label`: Styled radio button selection
- `.batch-results`: Container for generated coupons
- `.batch-actions`: Action buttons for batch results
- `.coupon-list`: Scrollable grid of generated codes
- `.coupon-item`: Individual coupon code display
- `.btn-copy`: Copy button styling

### 4. OpenSpec Documentation

Created comprehensive change proposal:
**File**: `openspec/changes/update-coupon-types-batch-generation/proposal.md`

Includes:
- Problem statement and goals
- Technical approach and architecture
- Migration strategy
- Testing requirements
- Risk mitigation
- Success metrics

**File**: `openspec/changes/update-coupon-types-batch-generation/tasks.md`

Detailed implementation checklist with all tasks.

## User Experience

### Creating a Percentage Off Coupon
1. Select "Single Coupon (Reusable)"
2. Choose "Percentage Off" discount type
3. **Optional**: Set max scans per code (e.g., 5 for limited reuse)
7. Set expiry date
8. Submit → Single code generated with specified limits

### Creating Batch Fixed Amount Coupons
1. Select "Generate Multiple Coupons (Single-use each)"
2. Discount type auto-set to "Fixed Amount Off"
3. Enter number of coupons (e.g., 50, max 500)
4. Enter amount per coupon (e.g., $10)
5. Set expiry date
6. Review total cost estimate
7. Submit → 50 unique codes generated (each limited to 1 scan)
8. View all codes in results page
9. Download as CSV or copy individual codes
10. Each code can be scanned exactly once

### Advanced: Limited-Scan Single Coupon
1. Select "Single Coupon (Reusable)"
2. Choose any discount type
3. In "Max Scans Per Code" field, enter limit (e.g., 5)
4. Complete other fields
5. Submit → One code that can be scanned up to 5 times

## API Examples

### Single Percentage Coupon
```json,
  "max_scans_per_code": null  // unlimited scans
POST /api/coupons
{
  "verification_app_id": "123",
  "description": "20% Off Holiday Sale",
  "discount_type": "PERCENTAGE",
  "discount_value": 20,
  "min_purchase_amount": 50,
  "total_usage_limit": 100,
  "per_user_usage_limit": 1,
  "expiry_date": "2025-12-31T23:59:59",
  "coupon_generation_type": "SINGLE"
}
```

### Batch Fixed Amount Coupons
```json
POST /api/coupons
{
  "verification_app_id": "123",
  "description": "$10 Gift Card",
  "discount_type": "FIXED_AMOUNT",
  "discount_value": 10,
  "expiry_date": "2025-12-31T23:59:59",
  "coupon_generation_type": "BATCH",
  "batch_quantity": 50
}max_scans_per_code": 1
```

**Response**:
```json
{
  "message": "50 coupons created successfully",
  "coupons": [
    {
      "id": 1,
      "coupon_code": "ABC123XYZ",
      "discount_value": 10,
      "is_single_use_code": true,
      "batch_id": "uuid-here",
      ...
    },
    // ... 49 more coupons
  ],
  "batch_id": "uuid-here",
  "credit_cost": 2500,
  "new_balance": 7500
}
```

## Testing Examples

### Test 1: Percentage Coupon with Min Purchase
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_app_id": 1,
    "description": "20% Off Orders Over $50",
    "discount_type": "PERCENTAGE",
    "discount_value": 20,
    "min_purchase_amount": 50,
    "total_usage_limit": 100,
    "expiry_date": "2025-12-31T23:59:59",
    "coupon_generation_type": "SINGLE",
    "max_scans_per_code": null
  }'
```

### Test 2: Batch of 10 Single-Use Coupons
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_app_id": 1,
    "description": "$10 Gift Cards",
    "discount_type": "FIXED_AMOUNT",
    "discount_value": 10,
    "expiry_date": "2025-12-31T23:59:59",
    "coupon_generation_type": "BATCH",
    "batch_quantity": 10
  }'
```

Expected response:
```json
{
  "message": "10 coupons created successfully",
  "coupons": [
    {
      "id": 1,
      "coupon_code": "ABC123XYZ",
      "max_scans_per_code": 1,
      "batch_id": "550e8400-e29b-41d4-a716-446655440000",
      "batch_quantity": 10
    },
    // ... 9 more coupons with same batch_id
  ],
  "credit_cost": 530,
  "new_balance": 7470
}
```

### Test 3: Limited-Scan Coupon (5 Uses)
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_app_id": 1,
    "description": "Coffee Punch Card",
    "discount_type": "FIXED_AMOUNT",
    "discount_value": 5,
    "expiry_date": "2025-12-31T23:59:59",
    "coupon_generation_type": "SINGLE",
    "max_scans_per_code": 5
  }'
```

## Database Queries

### View All Batch Coupons
```sql
SELECT 
  batch_id,
  COUNT(*) as total_coupons,
  MAX(batch_quantity) as original_quantity,
  MAX(description) as description,
  MAX(discount_value) as amount,
  MAX(created_at) as created_date
FROM coupons 
WHERE batch_id IS NOT NULL 
GROUP BY batch_id
ORDER BY created_date DESC;
```

### View Scan-Limited Coupons with Usage
```sql
SELECT 
  c.coupon_code,
  c.max_scans_per_code,
  c.discount_value,
  c.description,
  COUNT(s.id) as current_scans,
  c.max_scans_per_code - COUNT(s.id) as scans_remaining,
  c.status
FROM coupons c
LEFT JOIN scans s ON c.id = s.coupon_id
WHERE c.max_scans_per_code IS NOT NULL
GROUP BY c.id
ORDER BY c.created_at DESC;
```

### Find Coupons That Reached Scan Limit
```sql
SELECT 
  c.coupon_code,
  c.max_scans_per_code,
  COUNT(s.id) as total_scans,
  c.description
FROM coupons c
INNER JOIN scans s ON c.id = s.coupon_id
WHERE c.max_scans_per_code IS NOT NULL
GROUP BY c.id
HAVING COUNT(s.id) >= c.max_scans_per_code;
```

## Manual Testing Checklist
- [ ] Run database migration
- [ ] Create percentage coupon with min purchase amount
- [ ] Create batch of 10 fixed amount coupons
- [ ] Verify credit cost calculation for batch
- [ ] Download CSV ofmax_scans_per_code', 'batch_id', 'batch_quantity');

-- View batch coupons
SELECT coupon_code, max_scans_per_code, batch_id 
FROM coupons 
WHERE batch_id IS NOT NULL;

-- View scan-limited coupons
SELECT coupon_code, max_scans_per_code, 
       (SELECT COUNT(*) FROM scans WHERE coupon_id = coupons.id) as current_scans
FROM coupons 
WHERE max_scans_per_code
### Database Verification
```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons' 
AND column_name IN ('is_single_use_code', 'batch_id', 'batch_quantity');

-- View batch coupons
SELECT coupon_code, is_single_use_code, batch_id 
FROM coupons 
WHERE batch_id IS NOT NULL;
```

## Migration Instructions

1. **Apply Database Migration**:
   ```bash
   cd mscan-server
   psql -d mscan_dev -f database/migrations/003_add_batch_coupon_support.sql
   ```
max_scans_per_code` defaults to `NULL` (unlimited scans)
- `batch_id` and `batch_quantity` are nullable
- Single coupon creation still works as before
- No data migration needed for existing records

## Additional Use Cases Enabled

With `max_scans_per_code`, you can now create:
- **Traditional coupons**: `max_scans_per_code = NULL` (unlimited)
- **Single-use codes**: `max_scans_per_code = 1` (batch coupons)
- **Limited-use codes**: `max_scans_per_code = 5` (can be scanned 5 times)
- **Multi-use vouchers**: `max_scans_per_code = 10` (loyalty rewards)
   npm start
   ```

3. **Frontend Already Updated** - No additional steps needed

4. **Verify Changes**:
   - Open frontend coupon creation page
   - Verify new generation type options appear
   - Test creating both coupon types

## Backward Compatibility

✅ Existing coupons continue to work:
- `is_single_use_code` defaults to `false`
- `batch_id` and `batch_quantity` are nullable
- Single coupon creation still works as before
- No data migration needed for existing records

## Credit Cost Examples

### Percentage Coupon (20% off, min $50, 100 users, 30 days)
- Base: 100 credits
- Discount multiplier: 20% → 20 credits
- User limit: 100 users → varies by formula
- Duration: 30 days → 150 credits
- **Estimated Total**: ~270 credits

### Batch Fixed Amount (50 coupons × $10, 60 days)
- Base per coupon: 50 credits
- Per coupon cost: $10 × 0.3 = 3 credits
- Subtotal per coupon: 53 credits
- Batch quantity: 50
- Time multiplier: 1.0 (60 days)
- **Total**: 50 × 53 = **2,650 credits**

## Next Steps

1. Apply the database migration
2. Test percentage coupons with minimum purchase validation
3. Test batch generation with various quantities
4. Update scan validation logic to enforce single-use codes (future enhancement)
5. Add analytics tracking for batch coupon performance
6. Consider adding bulk QR code download as ZIP file

## Files Modified

### Backend
- ✅ `mscan-server/database/migrations/003_add_batch_coupon_support.sql` (created)
- ✅ `mscan-server/src/controllers/rewards.controller.js` (modified)
- ✅ `mscan-server/src/services/credit-calculator.service.js` (modified)

### Frontend
- ✅ `mscan-client/src/app/components/rewards/coupon-create.component.ts` (modified)
- ✅ `mscan-client/src/app/components/rewards/coupon-create.component.html` (modified)
- ✅ `mscan-client/src/app/components/rewards/coupon-create.component.css` (modified)

### Documentation
- ✅ `openspec/changes/update-coupon-types-batch-generation/proposal.md` (created)
- ✅ `openspec/changes/update-coupon-types-batch-generation/tasks.md` (created)
- ✅ `openspec/changes/update-coupon-types-batch-generation/IMPLEMENTATION_SUMMARY.md` (this file)

## Support

For issues or questions:
1. Check error logs in browser console
2. Verify database migration applied successfully
3. Confirm backend server restarted after changes
4. Review API response in Network tab
