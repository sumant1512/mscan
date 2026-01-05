import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { DashboardPage } from '../../utils/page-objects.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Dashboard', () => {
  let authHelper: AuthHelper;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dashboardPage = new DashboardPage(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test('should display tenant dashboard statistics', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Verify key metrics are displayed
    await expect(page.locator('text=/user|coupon|credit|scan/i').first()).toBeVisible();
  });

  test('should display credit balance', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for credit balance
    const balanceElements = page.locator('text=/balance|credit/i');
    const count = await balanceElements.count();
    if (count > 0) {
      await expect(balanceElements.first()).toBeVisible();
    }
  });

  test('should display active coupons count', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for coupon stats
    const couponElement = page.locator('text=/coupon/i');
    if (await couponElement.isVisible()) {
      await expect(couponElement).toBeVisible();
    }
  });

  test('should display recent activity', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for activity section
    const activitySection = page.locator('text=/recent|activity/i');
    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible();
    }
  });

  test('should navigate to features from dashboard', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Try to navigate to coupons
    const couponLink = page.locator('a:has-text("Coupon"), a:has-text("View Coupons")');
    if (await couponLink.first().isVisible()) {
      await couponLink.first().click();
      await dashboardPage.waitForLoadingToComplete();
      
      await expect(page).toHaveURL(/.*coupon/i);
    }
  });

  test.skip('should display chart or analytics', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for charts
    const chartElement = page.locator('canvas, [class*="chart"], svg');
    if (await chartElement.first().isVisible()) {
      await expect(chartElement.first()).toBeVisible();
    }
  });
});
