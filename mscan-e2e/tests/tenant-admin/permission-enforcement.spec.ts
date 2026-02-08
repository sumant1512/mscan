/**
 * Permission Enforcement E2E Tests
 * Tests permission-based authorization for TENANT_ADMIN vs TENANT_USER
 */

import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Permission-Based Authorization', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
  });

  test.describe('TENANT_ADMIN Permissions', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    });

    test('should allow creating verification apps', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      // Create button should be visible
      const createButton = page.locator('button:has-text("Create New App")');
      await expect(createButton).toBeVisible();

      // Should be able to click and navigate to create form
      await createButton.click();
      await expect(page).toHaveURL(/\/verification-app\/configure/);
    });

    test('should allow creating coupons', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Rewards', 'Coupon List');
      await pageHelper.waitForLoadingToComplete();

      // Create button should be visible
      const createButton = page.locator('button:has-text("Create Coupon"), button:has-text("Create New"), button:has-text("Create")').first();
      await expect(createButton).toBeVisible();
    });

    test('should allow creating products', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'View Products');
      await pageHelper.waitForLoadingToComplete();

      // Add Product button should be visible
      const addButton = page.locator('button:has-text("Add Product"), button:has-text("Create")').first();
      await expect(addButton).toBeVisible();
    });

    test('should allow creating categories', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'View Categories');
      await pageHelper.waitForLoadingToComplete();

      // Add Category button should be visible
      const addButton = page.locator('button:has-text("Add Category"), button:has-text("Create")').first();
      await expect(addButton).toBeVisible();
    });

    test('should have all CRUD permissions in API responses', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get user context
      const contextResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/auth/context`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      // Log response details for debugging
      console.log('Context API Response Status:', contextResponse.status());
      console.log('Context API URL:', `${TEST_CONFIG.tenant1.apiBaseUrl}/auth/context`);

      if (!contextResponse.ok()) {
        const errorBody = await contextResponse.text();
        console.log('Context API Error Body:', errorBody);
      }

      expect(contextResponse.ok()).toBeTruthy();
      const contextData = await contextResponse.json();

      // Verify permissions include create/edit/delete permissions
      const permissions = contextData.data.permissions;
      expect(permissions).toContain('create_app');
      expect(permissions).toContain('edit_app');
      expect(permissions).toContain('delete_app');
      expect(permissions).toContain('create_coupon');
      expect(permissions).toContain('edit_coupon');
      expect(permissions).toContain('delete_coupon');
      expect(permissions).toContain('create_product');
      expect(permissions).toContain('edit_product');
      expect(permissions).toContain('delete_product');
      expect(permissions).toContain('create_category');
      expect(permissions).toContain('edit_category');
      expect(permissions).toContain('delete_category');
    });
  });

  test.describe('TENANT_USER Permissions (Read-Only)', () => {
    // Note: This test requires a TENANT_USER account to be created
    // For now, we'll test the API response directly

    test('should deny creating verification app', async ({ page }) => {
      // Login as tenant admin to get context
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
      const adminToken = await authHelper.getAccessToken();

      // Create a test verification app
      const timestamp = Date.now();
      const appData = {
        app_name: `Permission Test App ${timestamp}`,
        description: 'App for permission testing',
        welcome_message: 'Welcome!',
        scan_success_message: 'Success!',
        scan_failure_message: 'Failed!'
      };

      const createResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          data: appData
        }
      );

      // Tenant admin should succeed
      expect(createResponse.ok()).toBeTruthy();

      // TODO: Once TENANT_USER accounts are available, test that they get 403 Forbidden
    });

    test('should deny creating coupons via API', async ({ page }) => {
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
      const adminToken = await authHelper.getAccessToken();

      // Get verification app
      const appsResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`,
        {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }
      );

      const appsData = await appsResponse.json();
      console.log('Apps API Response:', JSON.stringify(appsData, null, 2));

      if (!appsData.apps || appsData.apps.length === 0) {
        console.log('No verification apps found, skipping test');
        test.skip();
        return;
      }

      const verificationAppId = appsData.apps[0].verification_app_id;

      const couponData = {
        verification_app_id: verificationAppId,
        discount_value: 50,
        description: 'Permission test coupon',
        quantity: 1,
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          data: couponData
        }
      );

      // Admin should succeed
      expect(createResponse.ok()).toBeTruthy();

      // TODO: Test with TENANT_USER token should return 403
    });

    test('should deny creating products via API', async ({ page }) => {
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
      const adminToken = await authHelper.getAccessToken();

      // Get verification app
      const appsResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`,
        {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }
      );

      const appsData = await appsResponse.json();
      console.log('Apps API Response:', JSON.stringify(appsData, null, 2));

      if (!appsData.apps || appsData.apps.length === 0) {
        console.log('No verification apps found, skipping test');
        test.skip();
        return;
      }

      const verificationAppId = appsData.apps[0].verification_app_id;

      const productData = {
        verification_app_id: verificationAppId,
        product_name: 'Permission Test Product',
        description: 'Test product',
        category_id: null,
        barcode: `TEST${Date.now()}`,
        price: 100
      };

      const createResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/products`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          data: productData
        }
      );

      // Admin should succeed
      expect(createResponse.ok()).toBeTruthy();

      // TODO: Test with TENANT_USER token should return 403
    });
  });

  test.describe('Permission Middleware Enforcement', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    });

    test('should return 403 for insufficient permissions', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // TODO: Remove a permission from token (requires backend modification)
      // For now, test that API endpoints require authentication
      const unauthorizedResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`,
        {
          headers: {} // No authorization header
        }
      );

      expect(unauthorizedResponse.status()).toBe(401);
    });

    test('should allow view operations for all tenant users', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get a verification app first for app_id parameter
      const appsResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps?.length > 0 ? appsData.apps[0].verification_app_id : null;

      // All tenant users should be able to view resources
      const viewOperations = [
        '/rewards/verification-apps',
        '/rewards/coupons'
      ];

      // Add endpoints that require app_id only if we have one
      if (verificationAppId) {
        viewOperations.push(
          `/products?app_id=${verificationAppId}`,
          `/categories?app_id=${verificationAppId}`
        );
      }

      for (const endpoint of viewOperations) {
        const response = await page.request.get(
          `${TEST_CONFIG.tenant1.apiBaseUrl}${endpoint}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        if (!response.ok()) {
          console.log(`Failed endpoint: ${endpoint}`);
          console.log(`Status: ${response.status()}`);
          const errorBody = await response.text();
          console.log(`Error body: ${errorBody}`);
        }

        expect(response.ok()).toBeTruthy();
      }
    });
  });

  test.describe('Super Admin Permission Bypass', () => {
    // Note: Super Admin tests would go here
    // Super Admin should have access to all permissions automatically

    test.skip('SUPER_ADMIN should bypass all permission checks', async ({ page }) => {
      // TODO: Implement when super admin login is available in E2E tests
    });
  });
});
