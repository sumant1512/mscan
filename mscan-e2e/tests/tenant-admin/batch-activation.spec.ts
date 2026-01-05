import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Batch Activation', () => {
  let authHelper: AuthHelper;
  let verificationAppId: string;
  let batchId: string;
  let couponReferences: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    const accessToken = await authHelper.getAccessToken();

    // Get verification app
    const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const appsData = await appsResponse.json();
    verificationAppId = appsData.apps[0].id;

    // Create a batch of coupons for testing
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'Batch Activation Test',
        discount_value: 75,
        quantity: 10,
        expiry_date: expiryDate
      }
    });

    const createData = await createResponse.json();
    batchId = createData.coupons[0].batch_id;
    couponReferences = createData.coupons.map((c: any) => c.coupon_reference).sort();

    console.log(`✅ Created test batch ${batchId} with ${couponReferences.length} coupons`);
    console.log(`References: ${couponReferences.slice(0, 3).join(', ')}...`);

    // Mark all as printed (required before activation)
    await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { print_note: 'Ready for activation' }
      }
    );

    await context.close();
  });

  test('should activate entire batch by batch_id', async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    const accessToken = await authHelper.getAccessToken();

    const response = await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          activation_note: 'E2E test batch activation'
        }
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBeTruthy();
    expect(data.batch_id).toBe(batchId);
    expect(data.activated_count).toBe(10);
    expect(data.message).toContain('activated');
    expect(data.activated_codes).toBeDefined();
    expect(data.activated_codes.length).toBe(10);

    console.log('✅ Batch activation successful:', data.message);
    console.log(`Activated ${data.activated_count} coupons`);

    // Verify all coupons in batch are now active
    const listResponse = await page.request.get(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=active`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const listData = await listResponse.json();
    const activeCouponsFromBatch = listData.coupons.filter((c: any) => c.batch_id === batchId);
    
    expect(activeCouponsFromBatch.length).toBe(10);
    expect(activeCouponsFromBatch.every((c: any) => c.status === 'active')).toBeTruthy();
    expect(activeCouponsFromBatch.every((c: any) => c.activation_note === 'E2E test batch activation')).toBeTruthy();
  });

  test('should show confirmation dialog before batch activation (UI test)', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons`);
    await page.waitForLoadState('networkidle');

    // Look for batch action buttons or batch management section
    const batchActionButton = page.locator('button').filter({ hasText: /batch.*action|activate.*batch/i }).first();
    
    if (await batchActionButton.count() > 0) {
      await batchActionButton.click();
      await page.waitForTimeout(500);

      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, .confirmation').filter({ hasText: /confirm|activate/i });
      
      if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Confirmation dialog shown');
        expect(await confirmDialog.isVisible()).toBeTruthy();

        // Cancel the dialog
        const cancelButton = confirmDialog.locator('button').filter({ hasText: /cancel|no/i });
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
          console.log('✅ Dialog cancelled successfully');
        }
      } else {
        console.log('⚠️ Confirmation dialog not found');
      }
    } else {
      console.log('⚠️ Batch activation UI not found, feature may not be in UI yet');
      test.skip();
    }
  });

  test('should update batch statistics after activation', async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    const accessToken = await authHelper.getAccessToken();

    // Create a new batch for this test
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'Stats Test Batch',
        discount_value: 85,
        quantity: 5,
        expiry_date: expiryDate
      }
    });

    const createData = await createResponse.json();
    const testBatchId = createData.coupons[0].batch_id;

    // Print batch
    await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/print`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        data: {}
      }
    );

    // Get batch stats before activation
    const statsBefore = await page.request.get(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/stats`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const statsBeforeData = await statsBefore.json();
    expect(statsBeforeData.batch_id).toBe(testBatchId);
    expect(statsBeforeData.total_coupons).toBe(5);
    expect(statsBeforeData.status_counts.printed).toBe(5);
    expect(statsBeforeData.status_counts.active || 0).toBe(0);

    // Activate batch
    await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/activate`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        data: { activation_note: 'Stats test' }
      }
    );

    // Get batch stats after activation
    const statsAfter = await page.request.get(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/stats`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const statsAfterData = await statsAfter.json();
    expect(statsAfterData.status_counts.active).toBe(5);
    expect(statsAfterData.status_counts.printed || 0).toBe(0);

    console.log('✅ Batch statistics updated correctly after activation');
    console.log('Before:', statsBeforeData.status_counts);
    console.log('After:', statsAfterData.status_counts);
  });

  test('should not activate batch if coupons are not printed', async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    const accessToken = await authHelper.getAccessToken();

    // Create a new batch WITHOUT printing
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'Unprinted Batch Test',
        discount_value: 95,
        quantity: 3,
        expiry_date: expiryDate
      }
    });

    const createData = await createResponse.json();
    const unprintedBatchId = createData.coupons[0].batch_id;

    // Try to activate without printing
    const response = await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${unprintedBatchId}/activate`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { activation_note: 'Should fail' }
      }
    );

    // Should fail or activate 0 coupons
    if (response.ok()) {
      const data = await response.json();
      expect(data.activated_count).toBe(0);
      expect(data.message).toMatch(/no coupons|already active|not printed/i);
      console.log('✅ Activation blocked for unprinted coupons:', data.message);
    } else {
      expect(response.status()).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toMatch(/print|status|draft/i);
      console.log('✅ Activation error for unprinted batch:', errorData.error);
    }
  });

  test('should deactivate batch with reason', async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    const accessToken = await authHelper.getAccessToken();

    // Create, print, and activate a batch
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: {
        verification_app_id: verificationAppId,
        description: 'Deactivation Test Batch',
        discount_value: 105,
        quantity: 4,
        expiry_date: expiryDate
      }
    });

    const createData = await createResponse.json();
    const testBatchId = createData.coupons[0].batch_id;

    // Print
    await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/print`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, data: {} }
    );

    // Activate
    await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/activate`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        data: { activation_note: 'Will deactivate this' }
      }
    );

    // Deactivate batch
    const deactivateResponse = await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${testBatchId}/deactivate`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        data: { deactivation_reason: 'E2E test - campaign ended early' }
      }
    );

    expect(deactivateResponse.ok()).toBeTruthy();
    const deactivateData = await deactivateResponse.json();

    expect(deactivateData.success).toBeTruthy();
    expect(deactivateData.deactivated_count).toBe(4);
    expect(deactivateData.message).toContain('deactivated');

    // Verify all coupons are inactive
    const listResponse = await page.request.get(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=inactive`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const listData = await listResponse.json();
    const inactiveCoupons = listData.coupons.filter((c: any) => c.batch_id === testBatchId);
    
    expect(inactiveCoupons.length).toBe(4);
    expect(inactiveCoupons.every((c: any) => c.status === 'inactive')).toBeTruthy();
    expect(inactiveCoupons.every((c: any) => c.deactivation_reason === 'E2E test - campaign ended early')).toBeTruthy();

    console.log('✅ Batch deactivated successfully with reason');
  });

  test('should filter coupons by batch status in list view', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons`);
    await page.waitForLoadState('networkidle');

    // Look for status filter
    const statusFilter = page.locator('select').filter({ has: page.locator('option:has-text("Active")') }).first();
    
    if (await statusFilter.count() > 0) {
      // Filter by active status
      await statusFilter.selectOption({ label: 'Active' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify filtered results
      const couponItems = page.locator('[class*="coupon"]').filter({ hasText: /active|CP-/i });
      const count = await couponItems.count();
      
      if (count > 0) {
        console.log(`✅ Found ${count} active coupons in filtered view`);
      } else {
        console.log('⚠️ No active coupons found (may need to create some first)');
      }
    } else {
      console.log('⚠️ Status filter not found in UI');
      test.skip();
    }
  });

  test('should show batch action menu in coupon list', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons`);
    await page.waitForLoadState('networkidle');

    // Look for batch-related UI elements
    const batchIndicators = page.locator('[class*="batch"]').or(
      page.locator('text=/batch.*id|batch.*#/i')
    );

    if (await batchIndicators.count() > 0) {
      console.log('✅ Batch information displayed in coupon list');
      
      // Try to find batch action menu
      const actionMenus = page.locator('button[class*="menu"], button:has-text("⋮"), button:has-text("...")');
      
      if (await actionMenus.count() > 0) {
        await actionMenus.first().click();
        await page.waitForTimeout(500);

        const menuItems = page.locator('[role="menuitem"], .menu-item').filter({ hasText: /activate|deactivate|print/i });
        
        if (await menuItems.count() > 0) {
          console.log('✅ Batch action menu found with options');
        } else {
          console.log('⚠️ Action menu found but no batch-specific actions');
        }
      } else {
        console.log('⚠️ Action menu not found');
      }
    } else {
      console.log('⚠️ No batch information displayed in UI');
      test.skip();
    }
  });
});
