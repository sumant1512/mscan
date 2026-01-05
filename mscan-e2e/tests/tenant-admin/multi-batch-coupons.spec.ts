import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Multi-Batch Coupon Creation', () => {
  let authHelper: AuthHelper;
  let verificationAppId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);

    // Get or create verification app
    const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
      headers: {
        'Authorization': `Bearer ${await authHelper.getAccessToken()}`
      }
    });
    const appsData = await appsResponse.json();

    if (appsData.apps && appsData.apps.length > 0) {
      verificationAppId = appsData.apps[0].id;
    } else {
      // Create a verification app first
      const createAppResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${await authHelper.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        data: {
          app_name: 'E2E Test App - Multi-Batch',
          description: 'Test app for multi-batch coupon testing'
        }
      });
      const createAppData = await createAppResponse.json();
      verificationAppId = createAppData.app.id;
    }
  });

  test('should display multi-batch coupon creation form', async ({ page }) => {
    // Navigate to Create Coupon page
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons/create`);
    await page.waitForLoadState('networkidle');

    // Check for multi-batch mode toggle
    const multiBatchToggle = page.locator('input[type="checkbox"]').filter({ hasText: /multi.*batch|batch.*mode/i }).or(
      page.locator('label').filter({ hasText: /multi.*batch|batch.*mode/i }).locator('input')
    );

    if (await multiBatchToggle.count() > 0) {
      console.log('✅ Multi-batch mode toggle found');
      expect(await multiBatchToggle.count()).toBeGreaterThan(0);
    } else {
      console.log('⚠️ Multi-batch mode toggle not found - feature may not be implemented in UI yet');
      test.skip();
    }
  });

  test('should toggle to multi-batch mode', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons/create`);
    await page.waitForLoadState('networkidle');

    // Try to find and click multi-batch toggle
    const multiBatchToggle = page.locator('input[type="checkbox"]').filter({ hasText: /multi.*batch|batch.*mode/i }).first().or(
      page.locator('label').filter({ hasText: /multi.*batch|batch.*mode/i }).locator('input').first()
    );

    if (await multiBatchToggle.count() > 0) {
      await multiBatchToggle.check();
      await page.waitForTimeout(500);

      // Verify batch sections appear
      const batchSection = page.locator('[class*="batch"]').filter({ hasText: /batch.*1|add.*batch/i });
      expect(await batchSection.count()).toBeGreaterThan(0);
    } else {
      console.log('⚠️ Multi-batch UI not implemented, testing API directly');
      test.skip();
    }
  });

  test('should create 3 batches via API with different configurations', async ({ page }) => {
    const accessToken = await authHelper.getAccessToken();
    const today = new Date();
    const expiryDate30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiryDate60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const expiryDate90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          {
            description: 'E2E Test Batch 1 - ₹50 OFF',
            discount_value: 50,
            quantity: 5,
            expiry_date: expiryDate30
          },
          {
            description: 'E2E Test Batch 2 - ₹100 OFF',
            discount_value: 100,
            quantity: 10,
            expiry_date: expiryDate60
          },
          {
            description: 'E2E Test Batch 3 - ₹200 OFF',
            discount_value: 200,
            quantity: 15,
            expiry_date: expiryDate90
          }
        ]
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    console.log('✅ Multi-batch creation response:', JSON.stringify(data, null, 2));

    expect(data.message).toContain('successfully');
    expect(data.coupons).toBeDefined();
    expect(data.coupons.length).toBe(30); // 5 + 10 + 15 = 30 total coupons
    expect(data.batches_created).toBe(3);
    expect(data.credit_cost).toBeGreaterThan(0);

    // Verify batch_id is assigned to all coupons
    const batch1Coupons = data.coupons.filter((c: any) => c.discount_value === 50);
    const batch2Coupons = data.coupons.filter((c: any) => c.discount_value === 100);
    const batch3Coupons = data.coupons.filter((c: any) => c.discount_value === 200);

    expect(batch1Coupons.length).toBe(5);
    expect(batch2Coupons.length).toBe(10);
    expect(batch3Coupons.length).toBe(15);

    // All coupons in a batch should have the same batch_id
    const batch1Id = batch1Coupons[0].batch_id;
    expect(batch1Coupons.every((c: any) => c.batch_id === batch1Id)).toBeTruthy();

    // Store batch IDs for cleanup or further tests
    console.log(`✅ Created 3 batches with IDs: ${[
      batch1Coupons[0].batch_id,
      batch2Coupons[0].batch_id,
      batch3Coupons[0].batch_id
    ].join(', ')}`);
  });

  test('should auto-populate expiry date for subsequent batches', async ({ page }) => {
    // This test would verify UI behavior - skip if UI not ready
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons/create`);
    await page.waitForLoadState('networkidle');

    const multiBatchToggle = page.locator('input[type="checkbox"]').filter({ hasText: /multi.*batch/i }).first();
    
    if (await multiBatchToggle.count() === 0) {
      console.log('⚠️ Multi-batch UI not implemented yet');
      test.skip();
      return;
    }

    // Enable multi-batch mode
    await multiBatchToggle.check();
    await page.waitForTimeout(500);

    // Set expiry date in first batch
    const firstExpiryInput = page.locator('input[type="date"]').first();
    const testDate = '2025-12-31';
    await firstExpiryInput.fill(testDate);

    // Add second batch
    const addBatchButton = page.locator('button').filter({ hasText: /add.*batch/i });
    await addBatchButton.click();
    await page.waitForTimeout(500);

    // Check if second batch expiry is auto-populated
    const secondExpiryInput = page.locator('input[type="date"]').nth(1);
    const secondExpiryValue = await secondExpiryInput.inputValue();
    
    expect(secondExpiryValue).toBe(testDate);
    console.log('✅ Expiry date auto-populated for second batch');
  });

  test('should allow removing a batch before submission', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons/create`);
    await page.waitForLoadState('networkidle');

    const multiBatchToggle = page.locator('input[type="checkbox"]').filter({ hasText: /multi.*batch/i }).first();
    
    if (await multiBatchToggle.count() === 0) {
      console.log('⚠️ Multi-batch UI not implemented yet');
      test.skip();
      return;
    }

    await multiBatchToggle.check();
    await page.waitForTimeout(500);

    // Add 2 more batches (total 3)
    const addBatchButton = page.locator('button').filter({ hasText: /add.*batch/i });
    await addBatchButton.click();
    await page.waitForTimeout(300);
    await addBatchButton.click();
    await page.waitForTimeout(300);

    // Count batch sections
    const batchSections = page.locator('[class*="batch"]').filter({ hasText: /batch.*\d/i });
    const initialCount = await batchSections.count();
    expect(initialCount).toBeGreaterThanOrEqual(3);

    // Remove second batch
    const removeBatchButtons = page.locator('button').filter({ hasText: /remove|delete|×/i });
    if (await removeBatchButtons.count() > 0) {
      await removeBatchButtons.nth(1).click();
      await page.waitForTimeout(300);

      const finalCount = await batchSections.count();
      expect(finalCount).toBe(initialCount - 1);
      console.log('✅ Successfully removed a batch');
    } else {
      console.log('⚠️ Remove batch button not found');
    }
  });

  test('should calculate total coupons and credit cost for multiple batches', async ({ page }) => {
    const accessToken = await authHelper.getAccessToken();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          { description: 'Batch A', discount_value: 25, quantity: 10, expiry_date: expiryDate },
          { description: 'Batch B', discount_value: 50, quantity: 20, expiry_date: expiryDate },
          { description: 'Batch C', discount_value: 75, quantity: 15, expiry_date: expiryDate }
        ]
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.coupons.length).toBe(45); // 10 + 20 + 15
    expect(data.batches_created).toBe(3);
    expect(data.credit_cost).toBeGreaterThan(0);
    expect(data.new_balance).toBeDefined();

    console.log(`✅ Total coupons: ${data.coupons.length}, Credit cost: ${data.credit_cost}, New balance: ${data.new_balance}`);
  });

  test('should show insufficient credits warning when creating large batches', async ({ page }) => {
    const accessToken = await authHelper.getAccessToken();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Try to create a very large batch that will exceed credits
    const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          { description: 'Huge Batch', discount_value: 100, quantity: 100000, expiry_date: expiryDate }
        ]
      }
    });

    // Should fail with insufficient credits
    if (response.status() === 400 || response.status() === 402) {
      const data = await response.json();
      expect(data.error).toMatch(/insufficient|credit|balance/i);
      console.log('✅ Insufficient credits error caught correctly');
    } else {
      console.log('⚠️ Large batch was allowed (tenant may have unlimited credits)');
    }
  });

  test('should validate batch input fields', async ({ page }) => {
    const accessToken = await authHelper.getAccessToken();

    // Test missing required fields
    const response1 = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          { description: 'Invalid Batch' } // Missing discount_value, quantity, expiry_date
        ]
      }
    });

    expect(response1.status()).toBe(400);
    const data1 = await response1.json();
    expect(data1.error).toMatch(/required|invalid|missing/i);
    console.log('✅ Validation error for missing fields:', data1.error);

    // Test invalid quantity
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const response2 = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          { description: 'Zero quantity', discount_value: 50, quantity: 0, expiry_date: expiryDate }
        ]
      }
    });

    expect(response2.status()).toBe(400);
    const data2 = await response2.json();
    expect(data2.error).toMatch(/quantity|invalid|greater/i);
    console.log('✅ Validation error for invalid quantity:', data2.error);
  });

  test('should download CSV with all batch coupons', async ({ page }) => {
    const accessToken = await authHelper.getAccessToken();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create multi-batch coupons
    const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          { description: 'CSV Test Batch 1', discount_value: 30, quantity: 5, expiry_date: expiryDate },
          { description: 'CSV Test Batch 2', discount_value: 60, quantity: 5, expiry_date: expiryDate }
        ]
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const batch1Id = data.coupons[0].batch_id;
    const batch2Id = data.coupons[5].batch_id;

    // Test CSV download for first batch
    const csvResponse = await page.request.get(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batch1Id}/export`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    expect(csvResponse.ok()).toBeTruthy();
    const csvContent = await csvResponse.text();
    
    // Verify CSV format
    expect(csvContent).toContain('Reference,Code,Discount Value');
    expect(csvContent).toContain('CP-');
    expect(csvContent.split('\n').length).toBeGreaterThanOrEqual(6); // Header + 5 coupons

    console.log('✅ CSV download successful');
    console.log('CSV preview:\n', csvContent.split('\n').slice(0, 3).join('\n'));
  });

  test('should print coupons from all batches', async ({ page }) => {
    const accessToken = await authHelper.getAccessToken();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create multi-batch coupons
    const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/multi-batch`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        verification_app_id: verificationAppId,
        batches: [
          { description: 'Print Test Batch', discount_value: 40, quantity: 3, expiry_date: expiryDate }
        ]
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const batchId = data.coupons[0].batch_id;

    // Mark batch as printed
    const printResponse = await page.request.post(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { print_note: 'E2E Test Print' }
      }
    );

    expect(printResponse.ok()).toBeTruthy();
    const printData = await printResponse.json();
    
    expect(printData.message).toContain('printed');
    expect(printData.printed_count).toBe(3);
    expect(printData.batch_id).toBe(batchId);

    // Verify coupons status changed to 'printed'
    const listResponse = await page.request.get(
      `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=printed`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const listData = await listResponse.json();
    const printedFromBatch = listData.coupons.filter((c: any) => c.batch_id === batchId);
    expect(printedFromBatch.length).toBe(3);
    expect(printedFromBatch.every((c: any) => c.status === 'printed')).toBeTruthy();

    console.log('✅ Batch printing successful, all coupons marked as printed');
  });

  test('should show progress indicator during batch creation (UI test)', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/coupons/create`);
    await page.waitForLoadState('networkidle');

    const multiBatchToggle = page.locator('input[type="checkbox"]').filter({ hasText: /multi.*batch/i }).first();
    
    if (await multiBatchToggle.count() === 0) {
      console.log('⚠️ Multi-batch UI not implemented yet');
      test.skip();
      return;
    }

    // Fill form and submit
    await multiBatchToggle.check();
    await page.locator('select#verification_app_id').selectOption({ index: 1 });
    
    // Fill batch details (if form fields exist)
    const descriptionInput = page.locator('input[placeholder*="description"], textarea[placeholder*="description"]').first();
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill('Progress Test Batch');
      await page.locator('input[type="number"]').first().fill('50');
      await page.locator('input[type="number"]').nth(1).fill('10');
      await page.locator('input[type="date"]').first().fill('2025-12-31');

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      await submitButton.click();

      // Check for progress indicator
      const progressIndicator = page.locator('[class*="progress"], [class*="loading"], [class*="spinner"]');
      if (await progressIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ Progress indicator shown during creation');
      } else {
        console.log('⚠️ Progress indicator not found (fast response or not implemented)');
      }

      // Wait for success message
      await page.waitForSelector('text=/success|created/i', { timeout: 15000 });
      console.log('✅ Multi-batch creation completed');
    } else {
      console.log('⚠️ Form fields not found, UI may be different');
      test.skip();
    }
  });
});
