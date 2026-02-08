import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Debug Tenant Admin Page', () => {
  
  test('check what appears on tenant-admins page', async ({ page }) => {
    const auth = new AuthHelper(page);
    await auth.loginAsSuperAdmin();
    
    await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give extra time for Angular to render
    
    // Take screenshot
    await page.screenshot({ path: 'debug-tenant-admins-page.png', fullPage: true });
    
    // Log the current URL
    console.log('Current URL:', page.url());
    
    // Log all h1 elements
    const h1Elements = await page.locator('h1').allTextContents();
    console.log('H1 elements found:', h1Elements);
    
    // Log all text on page
    const pageText = await page.locator('body').textContent();
    console.log('Page text (first 500 chars):', pageText?.substring(0, 500));
    
    // Check if Angular component is loaded
    const appRoot = await page.locator('app-root').count();
    console.log('app-root count:', appRoot);
    
    const tenantAdminDashboard = await page.locator('app-tenant-admin-dashboard').count();
    console.log('app-tenant-admin-dashboard count:', tenantAdminDashboard);
    
    // Check for any error messages
    const errors = await page.locator('.error, .alert-error').allTextContents();
    console.log('Errors found:', errors);
  });
});
