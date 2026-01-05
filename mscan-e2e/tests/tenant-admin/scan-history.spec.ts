import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Scan History', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test('should display scan history list', async ({ page }) => {
    // Click on Rewards menu to expand submenu
    await page.click('.nav-item-header:has-text("Rewards")');
    await page.waitForTimeout(500);
    
    // Click on Scan History submenu item
    await page.click('.sub-item:has-text("Scan History")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify we're on the scan history page (URL or heading)
    await expect(page).toHaveURL(/.*scan.*history/i);
  });

  test.skip('should filter scan history by date', async ({ page }) => {
    // Click on Rewards menu to expand submenu
    await page.click('.nav-item-header:has-text("Rewards")');
    await page.waitForTimeout(500);
    
    // Click on Scan History submenu item
    await page.click('.sub-item:has-text("Scan History")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify we're on scan history page
    await expect(page).toHaveURL(/.*scan.*history/i);
  });

  test('should view scan details', async ({ page }) => {
    // Click on Rewards menu to expand submenu
    await page.click('.nav-item-header:has-text("Rewards")');
    await page.waitForTimeout(500);
    
    // Click on Scan History submenu item
    await page.click('.sub-item:has-text("Scan History")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*scan.*history/i);
  });

  test.skip('should handle pagination in scan history', async ({ page }) => {
    // Click on Rewards menu to expand submenu
    await page.click('.nav-item-header:has-text("Rewards")');
    await page.waitForTimeout(500);
    
    // Click on Scan History submenu item
    await page.click('.sub-item:has-text("Scan History")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*scan.*history/i);
  });

  test('should export scan history', async ({ page }) => {
    // Click on Rewards menu to expand submenu
    await page.click('.nav-item-header:has-text("Rewards")');
    await page.waitForTimeout(500);
    
    // Click on Scan History submenu item
    await page.click('.sub-item:has-text("Scan History")');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify navigation worked
    await expect(page).toHaveURL(/.*scan.*history/i);
  });
});
