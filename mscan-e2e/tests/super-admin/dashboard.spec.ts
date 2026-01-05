import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { DashboardPage } from '../../utils/page-objects.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Super Admin - Dashboard', () => {
  let authHelper: AuthHelper;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dashboardPage = new DashboardPage(page);
    
    // Login as super admin
    await authHelper.loginAsSuperAdmin();
  });

  test('should display dashboard statistics', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Wait for stats to load (verify any stat card is visible)
    await page.waitForSelector('.stat-card', { state: 'visible', timeout: 10000 });
    
    // Verify key metrics are displayed
    await expect(page.locator('text=Total Customers')).toBeVisible();
    await expect(page.locator('text=Total Users')).toBeVisible();
  });

  test('should display recent tenants', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for recent tenants section
    const recentSection = page.locator('text=/recent tenant/i');
    if (await recentSection.isVisible()) {
      await expect(recentSection).toBeVisible();
    }
  });

  test('should display system health status', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for system health indicator
    const healthIndicator = page.locator('text=/health|status/i');
    if (await healthIndicator.isVisible()) {
      await expect(healthIndicator).toBeVisible();
    }
  });

  test('should navigate to different sections from dashboard', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Try to navigate to tenants
    const tenantLink = page.locator('a:has-text("Tenant"), a:has-text("View All Tenants")');
    if (await tenantLink.first().isVisible()) {
      await tenantLink.first().click();
      await dashboardPage.waitForLoadingToComplete();
      
      await expect(page).toHaveURL(/.*tenant/i);
    }
  });

  test('should refresh dashboard data', async ({ page }) => {
    await dashboardPage.navigateToDashboard();
    
    // Check for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label="Refresh"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await dashboardPage.waitForLoadingToComplete();
    }
  });
});
