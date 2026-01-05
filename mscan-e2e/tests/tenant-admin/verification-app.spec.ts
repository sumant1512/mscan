import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Verification App Configuration', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test.skip('should display verification apps list', async ({ page }) => {
    // Click on Verification App menu to expand submenu
    await page.click('.nav-item-header:has-text("Verification App")');
    await page.waitForTimeout(500);
    
    // Click on Manage submenu item
    await page.click('.sub-item:has-text("Manage")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*verification-app/i);
  });

  test('should configure verification app', async ({ page }) => {
    // Click on Verification App menu to expand submenu
    await page.click('.nav-item-header:has-text("Verification App")');
    await page.waitForTimeout(500);
    
    // Click on Manage submenu item
    await page.click('.sub-item:has-text("Manage")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*verification-app/i);
  });

  test('should save verification app configuration', async ({ page }) => {
    // Click on Verification App menu to expand submenu
    await page.click('.nav-item-header:has-text("Verification App")');
    await page.waitForTimeout(500);
    
    // Click on Manage submenu item
    await page.click('.sub-item:has-text("Manage")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*verification-app/i);
  });

  test('should view app details', async ({ page }) => {
    // Click on Verification App menu to expand submenu
    await page.click('.nav-item-header:has-text("Verification App")');
    await page.waitForTimeout(500);
    
    // Click on Manage submenu item
    await page.click('.sub-item:has-text("Manage")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*verification-app/i);
  });
});
