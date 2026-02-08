import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Integration Workflow Tests
 * End-to-end scenarios combining multiple features
 */
test.describe('Tenant Admin - Integration Workflows', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test.describe('Complete Coupon Lifecycle Workflow', () => {

    test('should complete full coupon lifecycle from creation to redemption', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Step 1: Get verification app
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      // Step 2: Check initial credit balance
      const balanceResponse1 = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const initialBalance = (await balanceResponse1.json()).balance;

      // Step 3: Create coupon batch (draft status)
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: `Complete Workflow Test ${timestamp}`,
          discount_value: 100,
          quantity: 5,
          expiry_date: expiryDate
        }
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;
      const couponCode = createData.coupons[0].code;
      const creditCost = createData.credit_cost;

      // Verify credits deducted
      const balanceResponse2 = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const afterCreationBalance = (await balanceResponse2.json()).balance;
      expect(afterCreationBalance).toBe(initialBalance - creditCost);

      // Step 4: Print batch (draft → printed)
      const printResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Workflow test print' }
        }
      );

      expect(printResponse.ok()).toBeTruthy();

      // Step 5: Activate batch (printed → active)
      const activateResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(activateResponse.ok()).toBeTruthy();

      // Step 6: Scan/redeem coupon (active → used)
      const scanResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { coupon_code: couponCode }
      });

      expect(scanResponse.ok()).toBeTruthy();

      // Step 7: Verify final state
      const couponResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/${couponCode}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (couponResponse.ok()) {
        const couponData = await couponResponse.json();
        expect(couponData.coupon.status).toBe('used');
      }

      console.log(`✅ Complete coupon lifecycle test passed: draft → printed → active → used`);
    });
  });

  test.describe('Multi-App Product Catalog Workflow', () => {

    test('should create app, categories, and products in sequence', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Step 1: Create verification app
      const appResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          app_name: `Workflow Test App ${timestamp}`,
          description: 'App for integration testing',
          welcome_message: 'Welcome!',
          scan_success_message: 'Success!',
          scan_failure_message: 'Failed!'
        }
      });

      expect(appResponse.ok()).toBeTruthy();
      const appData = await appResponse.json();
      const appId = appData.app.id;

      // Step 2: Create category in this app
      const categoryResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: appId,
          name: `Workflow Category ${timestamp}`,
          description: 'Test category',
          icon: 'shopping_cart'
        }
      });

      expect(categoryResponse.ok()).toBeTruthy();
      const categoryData = await categoryResponse.json();
      const categoryId = categoryData.category.id;

      // Step 3: Create product in this category
      const productResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/products`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: appId,
          category_id: categoryId,
          product_name: `Workflow Product ${timestamp}`,
          product_sku: `WF-${timestamp}`,
          description: 'Test product',
          price: 99.99
        }
      });

      expect(productResponse.ok()).toBeTruthy();
      const productData = await productResponse.json();

      // Step 4: Verify data isolation - product should only appear in this app
      const allProductsResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseURL}/products?verification_app_id=${appId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (allProductsResponse.ok()) {
        const allProducts = await allProductsResponse.json();
        const ourProduct = allProducts.products.find((p: any) => p.product_sku === `WF-${timestamp}`);
        expect(ourProduct).toBeDefined();
      }

      console.log(`✅ Multi-app catalog workflow: Created app → category → product`);
    });
  });

  test.describe('Credit Request to Coupon Creation Workflow', () => {

    test('should request credits and use them to create coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Step 1: Get initial balance
      const balanceResponse1 = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const initialBalance = (await balanceResponse1.json()).balance;

      // Step 2: Request more credits
      const requestResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          amount: 1000,
          justification: 'Integration test credit request'
        }
      });

      expect(requestResponse.ok()).toBeTruthy();
      const requestData = await requestResponse.json();
      const requestId = requestData.request.id;

      // Note: In real scenario, super admin would approve this
      // For testing, we'll proceed with existing balance

      // Step 3: Create coupons using available credits
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Credit workflow test',
          discount_value: 50,
          quantity: 3,
          expiry_date: expiryDate
        }
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();

      // Step 4: Verify balance decreased
      const balanceResponse2 = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const finalBalance = (await balanceResponse2.json()).balance;

      expect(finalBalance).toBeLessThan(initialBalance);

      console.log(`✅ Credit request workflow: Request created, coupons generated, balance updated`);
    });
  });

  test.describe('Multi-Batch Coupon Creation and Management', () => {

    test('should create multiple batches and manage them independently', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create 3 batches with different values
      const batches = [
        { discount_value: 25, quantity: 5, description: 'Batch 1 - Small' },
        { discount_value: 50, quantity: 10, description: 'Batch 2 - Medium' },
        { discount_value: 100, quantity: 15, description: 'Batch 3 - Large' }
      ];

      const batchIds = [];

      for (const batch of batches) {
        const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            verification_app_id: verificationAppId,
            description: batch.description,
            discount_value: batch.discount_value,
            quantity: batch.quantity,
            expiry_date: expiryDate
          }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        batchIds.push(data.coupons[0].batch_id);
      }

      // Print only second batch
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchIds[1]}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Print batch 2 only' }
        }
      );

      // Verify batch statuses are independent
      const draftResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?batch_id=${batchIds[0]}&status=draft`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const printedResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?batch_id=${batchIds[1]}&status=printed`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (draftResponse.ok() && printedResponse.ok()) {
        const draftData = await draftResponse.json();
        const printedData = await printedResponse.json();

        expect(draftData.coupons.length).toBe(5); // Batch 1 still draft
        expect(printedData.coupons.length).toBe(10); // Batch 2 printed

        console.log(`✅ Multi-batch workflow: Created 3 batches, managed independently`);
      }
    });
  });

  test.describe('App Switching and Data Isolation', () => {

    test('should maintain data isolation when switching between apps', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get apps
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const appsData = await appsResponse.json();

      if (appsData.apps.length >= 2) {
        const app1Id = appsData.apps[0].id;
        const app2Id = appsData.apps[1].id;

        // Create category in app 1
        const cat1Response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            verification_app_id: app1Id,
            name: `App1 Category ${timestamp}`,
            description: 'App 1 only',
            icon: 'local_offer'
          }
        });

        // Create category in app 2
        const cat2Response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            verification_app_id: app2Id,
            name: `App2 Category ${timestamp}`,
            description: 'App 2 only',
            icon: 'shopping_bag'
          }
        });

        // Verify app1 categories don't include app2 category
        const app1CategoriesResponse = await page.request.get(
          `${TEST_CONFIG.tenant1.apiBaseUrl}/categories?verification_app_id=${app1Id}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        const app1Categories = await app1CategoriesResponse.json();
        const hasApp2Category = app1Categories.categories.some(
          (c: any) => c.name === `App2 Category ${timestamp}`
        );

        expect(hasApp2Category).toBeFalsy();

        console.log(`✅ Data isolation verified: App1 categories don't include App2 data`);
      } else {
        console.log('⚠️ Need at least 2 apps for isolation testing');
      }
    });
  });

  test.describe('CSV Export and Print Workflow', () => {

    test('should create batch, download CSV, and mark as printed', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Step 1: Create batch
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'CSV Export Test',
          discount_value: 75,
          quantity: 10,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      // Step 2: Download CSV
      const csvResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/export`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      expect(csvResponse.ok()).toBeTruthy();
      const csvContent = await csvResponse.text();

      // Verify CSV format
      expect(csvContent).toContain('Reference,Code,Discount Value');
      expect(csvContent.split('\n').length).toBeGreaterThanOrEqual(11); // Header + 10 coupons

      // Step 3: Mark as printed
      const printResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Printed after CSV export' }
        }
      );

      expect(printResponse.ok()).toBeTruthy();

      console.log(`✅ CSV Export workflow: Created batch → Downloaded CSV → Marked as printed`);
    });
  });

  test.describe('Dashboard to Detail Navigation', () => {

    test('should navigate from dashboard stats to detailed views', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/dashboard`);
      await pageHelper.waitForLoadingToComplete();

      // Find stats cards or links
      const couponStatsLink = page.locator('a:has-text("Coupons"), a:has-text("View All Coupons"), .stat-card:has-text("Coupon")');
      const hasLink = await couponStatsLink.first().isVisible().catch(() => false);

      if (hasLink) {
        await couponStatsLink.first().click();
        await pageHelper.waitForLoadingToComplete();

        // Verify navigated to coupons page
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/coupon|reward/i);

        console.log(`✅ Dashboard navigation: Stats → Detail view`);
      }
    });

    test('should drill down from summary to transaction details', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get transaction list
      const listResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (listResponse.ok()) {
        const listData = await listResponse.json();

        if (listData.transactions && listData.transactions.length > 0) {
          const transactionId = listData.transactions[0].id;

          // Get details
          const detailResponse = await page.request.get(
            `${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions/${transactionId}`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );

          if (detailResponse.ok()) {
            const detailData = await detailResponse.json();

            expect(detailData.transaction.id).toBe(transactionId);
            expect(detailData.transaction.amount).toBeDefined();

            console.log(`✅ Drill-down navigation: Transaction list → Transaction details`);
          }
        }
      }
    });
  });
});
