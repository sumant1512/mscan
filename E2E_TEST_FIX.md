# E2E Test Fix: Tenant Management Tests

**Date**: 2025-12-31  
**Fixed Tests**: 4 failing tests in `tests/super-admin/tenant-management.spec.ts`

## Problem

Tests were failing because they relied on a hardcoded tenant named "harsh" that doesn't exist in the database:

```typescript
// ❌ Old approach - hardcoded tenant name
await tenantPage.editTenant(TEST_CONFIG.tenant1.companyName, updatedData);
// TEST_CONFIG.tenant1.companyName = "harsh"
```

**Error**: `TimeoutError: locator.waitFor: Timeout 5000ms exceeded. - waiting for locator('tr:has-text("harsh")') to be visible`

## Root Cause

- The test config references `harsh` tenant which was either:
  - Never seeded in the database
  - Deleted during previous test runs
  - Lost during database reset

- Tests created new tenants with timestamps (e.g., `Test Company 1767128864532`) but the edit/view/status tests still looked for "harsh"

## Solution

Updated tests to **dynamically use the first available tenant** from the table instead of hardcoding tenant names:

### Changes Made:

#### 1. Edit Tenant Test
```typescript
// ✅ New approach - dynamic tenant selection
const firstTenantRow = page.locator('table tbody tr').first();
const tenantNameElement = firstTenantRow.locator('td').nth(1);
const tenantName = await tenantNameElement.textContent();

if (!tenantName || tenantName.trim() === '') {
  test.skip();
  return;
}

await tenantPage.editTenant(tenantName.trim(), updatedData);
```

#### 2. View Tenant Test
```typescript
// Get first tenant dynamically
const firstTenantRow = page.locator('table tbody tr').first();
const tenantName = await firstTenantRow.locator('td').nth(1).textContent();

await tenantPage.clickTableRowAction(tenantName.trim(), 'View');
```

#### 3. Toggle Status Test
```typescript
// Dynamic tenant selection with fallback
const firstTenantRow = page.locator('table tbody tr').first();
const tenantName = await firstTenantRow.locator('td').nth(1).textContent();

const row = page.locator(`tr:has-text("${tenantName.trim()}")`);
const statusButton = row.locator('button[title*="activate"], button[title*="Activate"], button[title*="deactivate"], button[title*="Deactivate"]');
```

#### 4. Filter Test
```typescript
// Use first tenant for search term
const firstTenantRow = page.locator('table tbody tr').first();
const tenantName = await firstTenantRow.locator('td').nth(1).textContent();
const searchTerm = tenantName.trim().split(' ')[0]; // Use first word

await searchInput.fill(searchTerm);
await tenantPage.verifyTableContainsText(searchTerm);
```

## Benefits

1. **Resilient Tests**: No dependency on specific test data
2. **Idempotent**: Tests work regardless of database state
3. **Graceful Degradation**: Tests skip if no data available
4. **Maintainable**: No need to manually seed "harsh" tenant

## Test Results

**Before**: 4 failed, 59 passed  
**After**: 8 passed (0 failures)

```
✓ should display tenant list
✓ should create new tenant successfully
✓ should edit tenant details
✓ should view tenant details
✓ should toggle tenant status
✓ should display validation errors for invalid tenant data
✓ should filter tenant list
✓ should handle pagination in tenant list
```

## Alternative Solutions Considered

### Option 1: Seed "harsh" tenant in global-setup.ts
- ❌ Adds complexity to setup
- ❌ Requires database write in global setup
- ❌ Could conflict with tenant creation test

### Option 2: Create "harsh" tenant in beforeEach hook
- ❌ Slows down every test
- ❌ Clutters test data
- ❌ Risk of duplicate tenant errors

### Option 3: Use dynamic tenant selection (Chosen)
- ✅ No setup required
- ✅ Works with any existing data
- ✅ Tests remain independent
- ✅ Most resilient approach

## Next Steps

Consider updating the test config to remove the hardcoded "harsh" tenant references since they're no longer needed:

```typescript
// TODO: Clean up unused test config
tenant1: {
  subdomain: 'harsh',        // ← Not needed anymore
  companyName: 'harsh',      // ← Not needed anymore
  email: 'harsh@mscan.com',  // ← Still used for tenant-admin tests
  ...
}
```

The `email` is still needed for tenant-admin login tests, but `companyName` and `subdomain` can be removed or updated.
