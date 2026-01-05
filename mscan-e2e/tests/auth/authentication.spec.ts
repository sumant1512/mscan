import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

// Auth tests should not use saved session - they test the login flow itself
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Tests', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('Super Admin Authentication', () => {
    test('should login successfully as super admin', async ({ page }) => {
      await authHelper.loginAsSuperAdmin();
      
      // Verify user is on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify token is stored
      const token = await authHelper.getStoredToken();
      expect(token).toBeTruthy();
    });

    test('should display error for invalid email', async ({ page }) => {
      await page.goto(TEST_CONFIG.superAdmin.baseUrl + '/login');
      
      await page.fill('input#email', 'invalid@example.com');
      await page.click('button:has-text("Send OTP")');
      
      // Wait for error message
      await page.waitForSelector('.error-message-box, .error-message', { 
        timeout: TEST_CONFIG.timeouts.medium 
      });
    });

    test('should display error for invalid OTP', async ({ page }) => {
      await page.goto(TEST_CONFIG.superAdmin.baseUrl + '/login');
      
      await page.fill('input#email', TEST_CONFIG.superAdmin.email);
      await page.click('button:has-text("Send OTP")');
      
      await page.waitForSelector('input#otp');
      await page.fill('input#otp', '000000');
      await page.click('button:has-text("Verify & Login")');
      
      // Wait for error message
      await page.waitForSelector('.error-message-box, .error-message', { 
        timeout: TEST_CONFIG.timeouts.medium 
      });
    });

    test('should logout successfully', async ({ page }) => {
      await authHelper.loginAsSuperAdmin();
      await authHelper.logout();
      
      // Verify redirected to login
      await expect(page).toHaveURL(/.*login/);
      
      // Verify tokens are cleared
      const token = await authHelper.getStoredToken();
      expect(token).toBeFalsy();
    });
  });

  test.describe('Tenant Admin Authentication', () => {
    // IMPORTANT: Tenant authentication requires subdomain routing for the backend middleware
    // The backend checks req.tenant which is only available when accessing via subdomain URLs
    // Example: harsh.localhost:4200 sets req.tenant for the "harsh" tenant
    // Without subdomain, tenant users cannot authenticate as backend rejects the request
    // To enable: Configure DNS/hosts and update test URLs to use subdomains
    
    test('should login successfully as tenant admin', async ({ page }) => {
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
      
      // Verify on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      expect(page.url()).toContain(TEST_CONFIG.tenant1.subdomain);
      
      // Verify token is stored
      const token = await authHelper.getStoredToken();
      expect(token).toBeTruthy();
      
      // Verify subdomain is stored
      const storedSubdomain = await page.evaluate(() => 
        (globalThis as any).localStorage.getItem('tms_tenant_subdomain')
      );
      expect(storedSubdomain).toBe(TEST_CONFIG.tenant1.subdomain);
    });

    test('should logout and stay on tenant subdomain', async ({ page }) => {
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
      await authHelper.logout();
      
      // Verify still on tenant subdomain
      expect(page.url()).toContain(TEST_CONFIG.tenant1.subdomain);
      await expect(page).toHaveURL(/.*login/);
    });

    test('should clear tokens on subdomain mismatch', async ({ page }) => {
      // Login to tenant1
      await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
      
      // Try to access tenant2
      await page.goto(TEST_CONFIG.tenant2.baseUrl + '/dashboard');
      
      // Should be redirected to login and tokens cleared
      await expect(page).toHaveURL(/.*login/);
      
      const token = await authHelper.getStoredToken();
      expect(token).toBeFalsy();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session after page reload', async ({ page }) => {
      await authHelper.loginAsSuperAdmin();
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/.*dashboard/);
      const token = await authHelper.getStoredToken();
      expect(token).toBeTruthy();
    });

    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      await page.goto(TEST_CONFIG.baseURL + '/dashboard');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });
  });
});
