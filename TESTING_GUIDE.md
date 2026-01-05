# Auto Coupon References - Testing & Deployment Guide

## Current Status

### ✅ Code Changes Completed

All code changes for the auto coupon references feature have been implemented:

1. **Database Migration** - Created but NOT executed yet
2. **Backend** - All endpoints updated
3. **Frontend** - UI updated to remove code type selection
4. **E2E Tests** - Created but login issues prevent automated testing

### ⚠️ Manual Steps Required

## Step 1: Run Database Migration

**CRITICAL:** The migration must be run before the feature will work.

```bash
cd mscan-server
psql -d mscan_db -f database/migrations/007_add_coupon_reference.sql
```

This adds:
- `coupon_reference` column to coupons table
- `get_next_coupon_reference()` function
- Indexes for efficient lookups

**Verify migration:**
```sql
\d coupons
-- Should show coupon_reference column

SELECT proname FROM pg_proc WHERE proname = 'get_next_coupon_reference';
-- Should return the function
```

## Step 2: Manual Testing (Recommended)

Since e2e auth is complex, test manually:

### Option A: Browser + Manual Test Script

1. **Login to the app:**
   - Go to: http://harsh.localhost:4200
   - Login as tenant admin (harsh@mscan.com)

2. **Get auth token:**
   - Open Dev Tools → Console
   - Run: `localStorage.getItem('tms_access_token') || localStorage.getItem('auth_token')`
   - Copy the token

3. **Run test script:**
   ```bash
   cd mscan-server
   TEST_AUTH_TOKEN="paste-token-here" node test-coupon-references.js
   ```

### Option B: UI Testing

1. Login to http://harsh.localhost:4200
2. Go to Create Coupon page
3. Notice: **NO code type dropdown anymore**
4. Create a batch of 5 coupons
5. View the created coupons
6. Verify each shows:
   - Random code: `2K4P-8NR3` (for scanning)
   - Reference: `CP-042` (for management)

### Option C: Direct API Testing

```bash
# 1. Get your token (see above)
TOKEN="your-token-here"

# 2. Get a verification app ID
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rewards/verification-apps

# 3. Create coupons (use app ID from step 2)
curl -X POST http://localhost:3000/api/rewards/coupons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "verification_app_id": "YOUR_APP_ID",
    "description": "Test Coupons",
    "discount_value": 10,
    "quantity": 5,
    "expiry_date": "2027-01-01T00:00:00.000Z"
  }'

# 4. Check the response - each coupon should have:
#    - coupon_code: "XXXX-XXXX" (random)
#    - coupon_reference: "CP-###" (sequential)
```

## Step 3: Verify Core Functionality

After running migration and creating coupons, verify:

### ✅ Checklist

- [ ] Migration 007 executed successfully
- [ ] Create single coupon → has both `coupon_code` and `coupon_reference`
- [ ] Create batch of 5 → all have sequential references (CP-001, CP-002, etc.)
- [ ] Create another batch → references continue (no gaps/overlaps)
- [ ] Coupon list shows reference field below code
- [ ] No code type dropdown in create form
- [ ] Range activation uses references (test with API if needed)

### Test Range Activation (Optional)

If you have coupons with references CP-001 to CP-050:

```bash
# Mark them as printed first (required for activation)
for id in coupon_id_1 coupon_id_2 ...; do
  curl -X POST http://localhost:3000/api/rewards/coupons/$id/print \
    -H "Authorization: Bearer $TOKEN"
done

# Activate range
curl -X POST http://localhost:3000/api/rewards/coupons/activate-range \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "from_reference": "CP-001",
    "to_reference": "CP-010",
    "activation_note": "Test activation"
  }'
```

## Step 4: E2E Tests (When Auth Is Fixed)

The e2e tests are written but cannot run due to login complexity:

```bash
cd mscan-e2e
npx playwright test tests/tenant-admin/coupon-reference-api.spec.ts
```

**Current Issue:** OTP-based login with subdomain routing is failing in test environment.

**Possible Solutions:**
1. Add a test-mode bypass for OTP
2. Use a dedicated test tenant with known credentials
3. Mock the auth endpoint in tests
4. Use API tokens instead of login flow

## What Works Now

With migration run, these endpoints are ready:

### Create Coupon (Auto-generates both fields)
```
POST /api/rewards/coupons
{
  "verification_app_id": "...",
  "description": "Test",
  "discount_value": 10,
  "quantity": 3,
  "expiry_date": "2027-01-01T00:00:00.000Z"
}

Response includes:
{
  "coupons": [
    {
      "coupon_code": "2K4P-8NR3",  // Random (for scanning)
      "coupon_reference": "CP-042",  // Sequential (for management)
      ...
    }
  ]
}
```

### Range Activation (Uses references)
```
POST /api/rewards/coupons/activate-range
{
  "from_reference": "CP-001",
  "to_reference": "CP-050",
  "activation_note": "Optional note"
}
```

### Range Deactivation (Uses references)
```
POST /api/rewards/coupons/deactivate-range
{
  "from_reference": "CP-001",
  "to_reference": "CP-050",
  "deactivation_reason": "Required reason"
}
```

## Breaking Changes

If any external systems are using the coupon endpoints:

1. **Range endpoints changed parameters:**
   - `from_code`/`to_code` → `from_reference`/`to_reference`

2. **Coupon objects now include:**
   - `coupon_reference` field (new)

3. **Removed fields (no longer used):**
   - `code_type`
   - `code_prefix`

## Files Changed

### Backend
- `database/migrations/007_add_coupon_reference.sql` (new)
- `src/controllers/rewards.controller.js` (4 methods)

### Frontend
- `src/app/models/rewards.model.ts`
- `src/app/components/rewards/coupon-create.component.ts`
- `src/app/components/rewards/coupon-create.component.html`
- `src/app/components/rewards/coupon-list.component.html`

### Tests
- `tests/tenant-admin/coupon-reference-api.spec.ts` (new, needs auth fix)
- `tests/tenant-admin/auto-coupon-references.spec.ts` (new, needs auth fix)
- `test-coupon-references.js` (manual test script)

## Next Steps

1. **Run migration 007** (most important!)
2. **Manual test** using browser or curl
3. **Fix e2e auth** if automated testing is needed
4. **Update any external integrations** using range endpoints
5. **Deploy to staging/production**

## Support

If issues occur:

1. Check migration ran: `SELECT * FROM coupon_code_sequences;`
2. Check function exists: `SELECT get_next_coupon_reference(1);`
3. Check server logs for errors
4. Verify frontend shows no code type dropdown
5. Test with manual script first before debugging e2e
