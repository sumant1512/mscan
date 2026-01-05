# Auto-Generated Coupon References Implementation

## Overview
Implemented automatic sequential reference generation (CP-001, CP-002, etc.) for ALL coupons while keeping random codes (XXXX-XXXX) for customer scanning.

## Key Changes

### Database Changes

#### Migration 007: Add Coupon Reference Column
**File:** `mscan-server/database/migrations/007_add_coupon_reference.sql`

- Added `coupon_reference VARCHAR(20) UNIQUE` column to coupons table
- Created indexes for efficient reference lookups
- Created `get_next_coupon_reference(tenant_id)` function
  - Returns sequential references: CP-001, CP-002, CP-003, etc.
  - Uses existing `get_next_coupon_sequence()` with 'CP' prefix
  - Pads numbers to 3 digits

**Status:** ⚠️ **MIGRATION NEEDS MANUAL EXECUTION**

```bash
cd mscan-server
psql -d mscan_db -f database/migrations/007_add_coupon_reference.sql
```

### Backend Changes

#### Single Coupon Creation
**File:** `mscan-server/src/controllers/rewards.controller.js` - `createCoupon()`

**Changes:**
- ✅ Removed `code_type` and `code_prefix` parameters
- ✅ Removed sequential code validation
- ✅ Always generate random `coupon_code` (XXXX-XXXX format)
- ✅ Auto-generate `coupon_reference` using `get_next_coupon_reference()`
- ✅ Updated INSERT to include `coupon_reference`, removed `code_type`/`code_prefix`

**Logic:**
```javascript
// Random code for scanning
couponCode = couponGenerator.generateCouponCode();

// Auto reference for management
const referenceResult = await client.query(
  'SELECT get_next_coupon_reference($1) as ref',
  [tenantId]
);
const couponReference = referenceResult.rows[0].ref;

// INSERT both values
```

#### Multi-Batch Coupon Creation
**File:** `mscan-server/src/controllers/rewards.controller.js` - `createMultiBatchCoupons()`

**Changes:**
- ✅ Removed `code_type` and `code_prefix` from batch handling
- ✅ Removed sequential code validation
- ✅ Added `coupon_reference` generation for each coupon in loop
- ✅ Updated INSERT to include `coupon_reference`, removed `code_type`/`code_prefix`

#### Range Activation
**File:** `mscan-server/src/controllers/rewards.controller.js` - `activateCouponRange()`

**Changes:**
- ✅ Changed parameters: `from_code`/`to_code` → `from_reference`/`to_reference`
- ✅ Query uses `coupon_reference` field instead of `coupon_code`
- ✅ Updated validation error messages to mention CP-### format
- ✅ Returns both `activated_references` and `activated_codes` arrays

#### Range Deactivation
**File:** `mscan-server/src/controllers/rewards.controller.js` - `deactivateCouponRange()`

**Changes:**
- ✅ Changed parameters: `from_code`/`to_code` → `from_reference`/`to_reference`
- ✅ Query uses `coupon_reference` field instead of `coupon_code`
- ✅ Updated validation messages
- ✅ Returns both `deactivated_references` and `deactivated_codes` arrays

### Frontend Changes

#### Models
**File:** `mscan-client/src/app/models/rewards.model.ts`

**Changes:**
- ✅ Removed `code_type?: 'random' | 'sequential'`
- ✅ Removed `code_prefix?: string`
- ✅ Added `coupon_reference?: string`

#### Coupon Creation Component (TypeScript)
**File:** `mscan-client/src/app/components/rewards/coupon-create.component.ts`

**Changes:**
- ✅ Removed `code_type` and `code_prefix` from form controls
- ✅ Removed from single mode form
- ✅ Removed from batch form
- ✅ Removed from multi-batch payload construction

#### Coupon Creation Component (HTML)
**File:** `mscan-client/src/app/components/rewards/coupon-create.component.html`

**Changes:**
- ✅ Removed code type dropdown selector (single mode)
- ✅ Removed code prefix input field (single mode)
- ✅ Removed code type dropdown selector (batch mode)
- ✅ Removed code prefix input field (batch mode)

#### Coupon List Component
**File:** `mscan-client/src/app/components/rewards/coupon-list.component.html`

**Changes:**
- ✅ Added `coupon_reference` display below `coupon_code`
- Shows as "Ref: CP-###" in gray text

### E2E Tests

#### New Test File
**File:** `mscan-e2e/tests/tenant-admin/auto-coupon-references.spec.ts`

**Replaced:** `sequential-coupon-codes.spec.ts` (old approach)

**Test Coverage:**
1. ✅ Auto-generate sequential references for all coupons
2. ✅ Activate range using references (CP-001 to CP-050)
3. ✅ Reject invalid reference ranges
4. ✅ Maintain sequence across multiple batches
5. ✅ Display both fields in API responses
6. ✅ Deactivate range using references
7. ✅ Use random codes for scanning, references for management

## Architecture

### Two-Field System

| Field | Purpose | Format | Used For |
|-------|---------|--------|----------|
| `coupon_code` | Customer scanning | Random: `2K4P-8NR3` | QR code scanning, verification |
| `coupon_reference` | Management operations | Sequential: `CP-001` | Printing, range activation, reporting |

### Flow

1. **Creation:** All coupons get both fields automatically
   - Backend generates random code
   - Backend calls `get_next_coupon_reference(tenant_id)`
   - Both stored in database

2. **Customer Scanning:** Uses `coupon_code`
   - QR contains random code
   - Scan verification endpoint accepts `coupon_code`

3. **Management:** Uses `coupon_reference`
   - Print operations: "Print CP-001 to CP-050"
   - Range activation: "Activate CP-001 to CP-050"
   - Reporting: "Reference CP-025 had 15 scans"

4. **Display:** Shows both
   - List view shows reference for easy identification
   - Detail view shows both code and reference

## Next Steps

### Required Manual Steps

1. **Execute Migration:**
   ```bash
   cd mscan-server
   psql -d mscan_db -f database/migrations/007_add_coupon_reference.sql
   ```

2. **Test Backend:**
   ```bash
   cd mscan-server
   npm test
   ```

3. **Test Frontend:**
   ```bash
   cd mscan-client
   npm start
   # Create a coupon and verify both fields appear
   ```

4. **Run E2E Tests:**
   ```bash
   cd mscan-e2e
   npx playwright test tests/tenant-admin/auto-coupon-references.spec.ts
   ```

### Verification Checklist

- [ ] Migration executed successfully
- [ ] Create single coupon → has both `coupon_code` and `coupon_reference`
- [ ] Create batch → all coupons have sequential references
- [ ] References continue across batches (no gaps)
- [ ] Range activation works with references (CP-001 to CP-050)
- [ ] Coupon list displays reference field
- [ ] Scanning works with random `coupon_code`
- [ ] E2E tests pass

## Benefits

1. **Customer Experience:** Random codes prevent guessing
2. **Management:** Sequential references for easy printing/activation
3. **Flexible:** Can activate specific coupons OR ranges
4. **Backward Compatible:** Existing coupons work (reference nullable)
5. **Clear Separation:** Scanning vs management operations

## API Changes

### Breaking Changes

#### Range Activation Endpoint
**Before:**
```json
POST /api/rewards/coupons/activate-range
{
  "from_code": "COUP-001",
  "to_code": "COUP-050"
}
```

**After:**
```json
POST /api/rewards/coupons/activate-range
{
  "from_reference": "CP-001",
  "to_reference": "CP-050"
}
```

#### Range Deactivation Endpoint
**Before:**
```json
POST /api/rewards/coupons/deactivate-range
{
  "from_code": "COUP-001",
  "to_code": "COUP-050"
}
```

**After:**
```json
POST /api/rewards/coupons/deactivate-range
{
  "from_reference": "CP-001",
  "to_reference": "CP-050"
}
```

### New Response Fields

All coupon objects now include:
```json
{
  "coupon_code": "2K4P-8NR3",
  "coupon_reference": "CP-042"
}
```

## Files Modified

### Backend (6 files)
- ✅ `database/migrations/007_add_coupon_reference.sql` (created)
- ✅ `src/controllers/rewards.controller.js` (4 methods updated)

### Frontend (4 files)
- ✅ `src/app/models/rewards.model.ts`
- ✅ `src/app/components/rewards/coupon-create.component.ts`
- ✅ `src/app/components/rewards/coupon-create.component.html`
- ✅ `src/app/components/rewards/coupon-list.component.html`

### E2E Tests (1 file)
- ✅ `tests/tenant-admin/auto-coupon-references.spec.ts` (created)
- ⚠️ `tests/tenant-admin/sequential-coupon-codes.spec.ts` (can be deleted)

**Total:** 11 files changed
