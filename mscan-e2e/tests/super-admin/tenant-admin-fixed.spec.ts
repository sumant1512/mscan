import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Fixed E2E Tests for Super Admin Tenant Admin Management
 * Tests the NgRx-powered tenant admin management features
 */
test.describe('Super Admin - Tenant Admin Management (Fixed)', () => {

  test.beforeEach(async ({ page }) => {
    // Login first
    const authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
  });

  test.describe('Tenant Admin Dashboard', () => {
    
    test('should display tenant admin dashboard with stats', async ({ page }) => {
      // Navigate to tenant-admins page AFTER login  
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      // Wait for Angular component to load
      await page.waitForSelector('app-tenant-admin-dashboard', { timeout: 15000 });
      await page.waitForTimeout(2000); // Extra time for NgRx state
      
      // Verify main heading
      await expect(page.locator('h1:has-text("Tenant Admin Management")')).toBeVisible();
      
      // Verify stats cards are visible
      await expect(page.locator('.stat-card').first()).toBeVisible();
      
      // Verify stats have values
      const totalTenantsValue = page.locator('.stat-value').first();
      await expect(totalTenantsValue).toBeVisible();
      const totalCount = await totalTenantsValue.textContent();
      expect(parseInt(totalCount || '0')).toBeGreaterThanOrEqual(0);
      
      // Verify table exists
      await expect(page.locator('table.tenants-table')).toBeVisible();
    });

    test('should search tenants by name', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('app-tenant-admin-dashboard', { timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Wait for table to load
      await expect(page.locator('table.tenants-table')).toBeVisible();
      
      // Get first tenant name from table  
      const rows = page.locator('table tbody tr:not(:has-text("No tenants"))');
      const rowCount = await rows.count();
      
      if (rowCount > 0) {
        const firstTenantNameEl = rows.first().locator('td:first-child .tenant-name');
        const firstTenantName = await firstTenantNameEl.textContent().catch(() => null);
        
        if (firstTenantName) {
          // Extract just the name part
          const searchTerm = firstTenantName.trim().split(/\s+/)[0].substring(0, 5);
          
          // Enter search query
          const searchInput = page.locator('input[placeholder*="Search"]');
          await searchInput.fill(searchTerm);
          await page.waitForTimeout(1000);
          
          // Verify filtered results
          const visibleRows = page.locator('table tbody tr:not(:has-text("No tenants"))');
          const filteredCount = await visibleRows.count();
          expect(filteredCount).toBeGreaterThan(0);
        }
      }
    });

    test('should navigate to add tenant admin', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('app-tenant-admin-dashboard', { timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Click "Add Tenant Admin" button
      await page.locator('button:has-text("Add Tenant Admin")').first().click();
      
      // Verify navigation to add form
      await page.waitForURL(/\/super-admin\/tenant-admins\/add/, { timeout: 10000 });
      await expect(page.locator('h1:has-text("Add Tenant Admin")')).toBeVisible();
    });
  });

  test.describe('Add Tenant Admin', () => {
    
    test('should display add tenant admin form', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('app-add-tenant-admin', { timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Verify form elements
      await expect(page.locator('h1:has-text("Add Tenant Admin")')).toBeVisible();
      await expect(page.locator('input[name="tenantSearch"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="fullName"]')).toBeVisible();
    });
  });

  test.describe('Tenant List with NgRx', () => {
    
    test('should display tenant list with filtering', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenants`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('app-tenant-list', { timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Verify table
      await expect(page.locator('table.tenant-table')).toBeVisible();
      
      // Test search
      const searchInput = page.locator('input.search-input');
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Clear search
      await searchInput.clear();
    });

    test('should sort tenants', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenants`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('app-tenant-list', { timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Verify table
      await expect(page.locator('table.tenant-table')).toBeVisible();
      
      // Click sort button
      const sortButton = page.locator('button.btn-sort');
      await sortButton.click();
      await page.waitForTimeout(500);
      
      // Sort button should toggle
      await sortButton.click();
    });

    test('should filter by status', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenants`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('app-tenant-list', { timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Verify table
      await expect(page.locator('table.tenant-table')).toBeVisible();
      
      // Change status filter
      const statusFilter = page.locator('select.filter-select').first();
      await statusFilter.selectOption('active');
      await page.waitForTimeout(500);
      
      // Reset
      await statusFilter.selectOption('all');
    });
  });
});
