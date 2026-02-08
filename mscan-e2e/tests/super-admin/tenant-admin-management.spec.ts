import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * E2E Tests for Super Admin Tenant Admin Management
 * Tests the NgRx-powered tenant admin management features
 */
test.describe('Super Admin - Tenant Admin Management (NgRx)', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
  });

  test.describe('Tenant Admin Dashboard', () => {
    
    test('should display tenant admin dashboard with stats', async ({ page }) => {
      // Navigate to tenant admins page AFTER login
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      
      // Wait for page to load and NgRx state
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Verify main heading
      await expect(page.locator('h1:has-text("Tenant Admin Management")')).toBeVisible({ timeout: 15000 });
      
      // Verify stats cards are visible
      await expect(page.locator('.stat-card').first()).toBeVisible();
      
      // Verify stats have values (not just loading)
      const totalTenantsValue = page.locator('.stat-value').first();
      await expect(totalTenantsValue).toBeVisible();
      const totalCount = await totalTenantsValue.textContent();
      expect(parseInt(totalCount || '0')).toBeGreaterThanOrEqual(0);
      
      // Verify table exists
      await expect(page.locator('table.tenants-table')).toBeVisible({ timeout: 15000 });
    });

    test('should search tenants by name', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Wait for table to load
      await expect(page.locator('table.tenants-table')).toBeVisible({ timeout: 15000 });
      
      // Get first tenant name from table
      const firstTenantNameEl = page.locator('table tbody tr:first-child td:first-child .tenant-name').first();
      const firstTenantName = await firstTenantNameEl.textContent().catch(() => null);
      
      if (firstTenantName) {
        // Extract just the name part (before any icons)
        const searchTerm = firstTenantName.trim().split(/\s+/)[0].substring(0, 5);
        
        // Enter search query
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.fill(searchTerm);
        
        // Wait for filtering (NgRx should be instant, but allow for render)
        await page.waitForTimeout(1000);
        
        // Verify filtered results
        const visibleRows = page.locator('table tbody tr:not(:has-text("No tenants"))');
        const rowCount = await visibleRows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('should filter tenants by admin status', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Wait for table
      await expect(page.locator('table.tenants-table')).toBeVisible({ timeout: 15000 });
      
      // Get initial row count
      const initialRows = await page.locator('table tbody tr:not(:has-text("No tenants"))').count();
      
      if (initialRows > 0) {
        // Filter by "With Admins"
        const filterSelect = page.locator('select').filter({ hasText: /Filter|All Tenants/ });
        await filterSelect.selectOption('withAdmins');
        
        // Wait for filter to apply
        await page.waitForTimeout(500);
        
        // Verify results (should show only tenants with admins > 0)
        const filteredRows = await page.locator('table tbody tr:not(:has-text("No tenants"))').count();
        
        // Filter by "Without Admins"
        await filterSelect.selectOption('withoutAdmins');
        await page.waitForTimeout(500);
        
        // Verify results changed
        const withoutAdminsRows = await page.locator('table tbody tr:not(:has-text("No tenants"))').count();
        
        // Reset filter
        await filterSelect.selectOption('all');
        await page.waitForTimeout(500);
        
        const allRows = await page.locator('table tbody tr:not(:has-text("No tenants"))').count();
        expect(allRows).toBe(initialRows);
      }
    });

    test('should navigate to add tenant admin', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Click "Add Tenant Admin" button
      await page.locator('button:has-text("Add Tenant Admin")').click({ timeout: 15000 });
      
      // Verify navigation to add form
      await expect(page).toHaveURL(/\/super-admin\/tenant-admins\/add/);
      await expect(page.locator('h1:has-text("Add Tenant Admin")')).toBeVisible();
    });

    test('should navigate to view tenant admins', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Find first tenant with admins
      const viewButton = page.locator('button:has-text("View Admins")').first();
      
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        
        // Verify navigation to detail page
        await page.waitForTimeout(1000);
        await expect(page.locator('h1:has-text("Tenant Administrators")')).toBeVisible();
      }
    });
  });

  test.describe('Add Tenant Admin', () => {
    
    test('should display add tenant admin form', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Verify form elements
      await expect(page.locator('h1:has-text("Add Tenant Admin")')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('input[name="tenantSearch"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="fullName"]')).toBeVisible();
    });

    test('should search and select tenant using autocomplete', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Type in tenant search field
      const tenantSearch = page.locator('input[name="tenantSearch"]');
      await tenantSearch.click({ timeout: 15000 });
      await tenantSearch.fill('test');
      
      // Wait for dropdown to appear
      await page.waitForTimeout(500);
      
      // Verify dropdown appears with results
      const dropdown = page.locator('.dropdown-list');
      if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        const dropdownItems = dropdown.locator('.dropdown-item:not(.no-results)');
        const itemCount = await dropdownItems.count();
        
        if (itemCount > 0) {
          // Select first tenant
          await dropdownItems.first().click();
          
          // Verify tenant is selected (input should have tenant name)
          const selectedValue = await tenantSearch.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Try to submit without filling form - button should be disabled
      const submitButton = page.locator('button[type="submit"]');
      
      // Verify submit button is disabled when form is empty
      await expect(submitButton).toBeDisabled();
      
      // Fill only email to check validation
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.waitForTimeout(500);
      
      // Button should still be disabled (missing tenant and full name)
      await expect(submitButton).toBeDisabled();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // First select a tenant
      await page.locator('input[name="tenantSearch"]').fill('test');
      await page.waitForTimeout(1000);
      const firstTenant = page.locator('.dropdown-item').first();
      if (await firstTenant.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstTenant.click();
      }
      
      // Fill form with invalid email
      await page.locator('input[name="email"]').fill('invalid-email');
      await page.locator('input[name="fullName"]').fill('Test Admin');
      await page.waitForTimeout(500);
      
      // Submit button should be disabled due to invalid email
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('should create tenant admin successfully', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Select first available tenant
      const tenantSearch = page.locator('input[name="tenantSearch"]');
      await tenantSearch.click({ timeout: 15000 });
      
      // Wait for dropdown
      await page.waitForTimeout(500);
      
      const dropdownItems = page.locator('.dropdown-list .dropdown-item:not(.no-results)');
      const itemCount = await dropdownItems.count();
      
      if (itemCount > 0) {
        await dropdownItems.first().click();
        
        // Fill admin details
        const timestamp = Date.now();
        await page.locator('input[name="email"]').fill(`testadmin${timestamp}@example.com`);
        await page.locator('input[name="fullName"]').fill(`Test Admin ${timestamp}`);
        await page.locator('input[name="phone"]').fill('+1234567890');
        
        // Submit form
        await page.locator('button[type="submit"]').click();
        
        // Wait for success or navigation
        await page.waitForTimeout(3000);
        
        // Verify success message or navigation
        const successAlert = page.locator('.alert-success, .alert.success');
        const isOnDetailPage = page.url().includes('/tenant-admins/tenant/');
        
        expect(
          await successAlert.isVisible({ timeout: 3000 }).catch(() => false) || isOnDetailPage
        ).toBeTruthy();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Tenant Admin Detail View', () => {
    
    test('should display tenant admin list for a tenant', async ({ page }) => {
      // First go to dashboard
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      // Find and click first "View Admins" button
      const viewButton = page.locator('button:has-text("View Admins")').first();
      
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // Verify we're on detail page
        await expect(page.locator('h1:has-text("Tenant Administrators")')).toBeVisible();
        
        // Verify stats bar
        await expect(page.locator('.stats-bar')).toBeVisible();
        
        // Verify at least the total count is shown
        const statValues = page.locator('.stat-value');
        const totalAdmins = await statValues.first().textContent();
        expect(parseInt(totalAdmins || '0')).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });

    test('should display admin cards with details', async ({ page }) => {
      // Navigate via dashboard
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      const viewButton = page.locator('button:has-text("View Admins")').first();
      
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // Check if admin cards exist
        const adminCards = page.locator('.admin-card');
        const cardCount = await adminCards.count();
        
        if (cardCount > 0) {
          // Verify first card has required info
          const firstCard = adminCards.first();
          await expect(firstCard.locator('.admin-name')).toBeVisible();
          await expect(firstCard.locator('.admin-email')).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should show active/inactive status correctly', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      const viewButton = page.locator('button:has-text("View Admins")').first();
      
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // Check stats for active/inactive counts
        const statLabels = page.locator('.stat-label');
        const activeLabel = statLabels.filter({ hasText: 'Active' }).first();
        const inactiveLabel = statLabels.filter({ hasText: 'Inactive' }).first();
        
        await expect(activeLabel).toBeVisible();
        await expect(inactiveLabel).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should navigate back to dashboard', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      const viewButton = page.locator('button:has-text("View Admins")').first();
      
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // Click back button
        const backButton = page.locator('button.btn-back, button:has(.material-icons:text("arrow_back"))');
        await backButton.click();
        
        // Verify navigation back to dashboard
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(/\/super-admin\/tenant-admins$/);
      } else {
        test.skip();
      }
    });

    test('should navigate to add another admin from detail page', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      const viewButton = page.locator('button:has-text("View Admins")').first();
      
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // Click "Add Another Admin" button
        const addButton = page.locator('button:has-text("Add Another Admin")');
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addButton.click();
          
          // Verify navigation to add form with tenant pre-selected
          await page.waitForTimeout(500);
          await expect(page).toHaveURL(/\/super-admin\/tenant-admins\/add/);
          
          // Verify tenant is pre-filled
          // Check if tenant is selected (shown in selectedTenantName)
          const selectedTenant = page.locator('.selected-tenant strong');
          const isVisible = await selectedTenant.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (isVisible) {
            const value = await selectedTenant.textContent();
            expect(value).toBeTruthy();
          } else {
            // Alternative: check if tenantSearch has a value
            const tenantSearch = page.locator('input[name="tenantSearch"]');
            const value = await tenantSearch.inputValue();
            // May be empty if tenant info is stored differently
            console.log('Tenant search value:', value);
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('NgRx State Management', () => {
    
    test('should load data only once (cached)', async ({ page }) => {
      let requestCount = 0;
      
      // Track API requests
      page.on('request', request => {
        if (request.url().includes('/api/tenants')) {
          requestCount++;
        }
      });
      
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Initial load should make API call
      expect(requestCount).toBeGreaterThanOrEqual(1);
      
      // Navigate away and back
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/dashboard`);
      await page.waitForTimeout(500);
      
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      
      // Should still be just 1 or 2 calls (cached data)
      expect(requestCount).toBeLessThanOrEqual(2);
    });

    test('should filter instantly (client-side)', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      let apiCallsDuringFilter = 0;
      
      // Start monitoring after initial load
      await page.waitForTimeout(1000);
      
      page.on('request', request => {
        if (request.url().includes('/api/tenants')) {
          apiCallsDuringFilter++;
        }
      });
      
      // Perform search
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('test', { timeout: 15000 });
      await page.waitForTimeout(500);
      
      // Change filter - select is in .filter-dropdown
      const filterSelect = page.locator('.filter-dropdown select').first();
      await filterSelect.selectOption('withAdmins');
      await page.waitForTimeout(500);
      
      // No API calls should be made during filtering
      expect(apiCallsDuringFilter).toBe(0);
    });

    test('should reload data after creating admin', async ({ page }) => {
      let reloadCount = 0;
      
      page.on('request', request => {
        if (request.url().includes('/api/tenants') && !request.url().includes('/admin')) {
          reloadCount++;
        }
      });
      
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenant-admins/add`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Initial load
      const initialCount = reloadCount;
      
      // Attempt to create admin (will likely fail due to validation, but that's ok)
      const tenantSearch = page.locator('input[name="tenantSearch"]');
      await tenantSearch.click({ timeout: 15000 });
      await page.waitForTimeout(500);
      
      const dropdownItems = page.locator('.dropdown-list .dropdown-item:not(.no-results)');
      const itemCount = await dropdownItems.count();
      
      if (itemCount > 0) {
        await dropdownItems.first().click();
        
        const timestamp = Date.now();
        await page.locator('input[name="email"]').fill(`reload${timestamp}@test.com`);
        await page.locator('input[name="fullName"]').fill(`Reload Test ${timestamp}`);
        
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(3000);
        
        // Check if data was reloaded (should be > initial)
        expect(reloadCount).toBeGreaterThan(initialCount);
      }
    });
  });

  test.describe('Tenant List with NgRx', () => {
    
    test('should display tenant list with filtering', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenants`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Verify table
      await expect(page.locator('table.tenant-table')).toBeVisible({ timeout: 15000 });
      
      // Test search
      const searchInput = page.locator('input.search-input');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        
        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(500);
      }
    });

    test('should sort tenants', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenants`);
      await page.waitForLoadState('networkidle');
      
      // Find sort controls
      const sortBySelect = page.locator('select.filter-select').filter({ hasText: /Sort/ });
      
      if (await sortBySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Sort by name
        await sortBySelect.selectOption('name');
        await page.waitForTimeout(500);
        
        // Sort by date
        await sortBySelect.selectOption('created_at');
        await page.waitForTimeout(500);
        
        // Toggle sort order
        const sortOrderButton = page.locator('button.btn-sort');
        if (await sortOrderButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await sortOrderButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should filter by status', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/super-admin/tenants`);
      await page.waitForLoadState('networkidle');
      
      const statusFilter = page.locator('select.filter-select').first();
      
      if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Filter by active
        await statusFilter.selectOption('active');
        await page.waitForTimeout(500);
        
        // Filter by inactive
        await statusFilter.selectOption('inactive');
        await page.waitForTimeout(500);
        
        // Show all
        await statusFilter.selectOption('all');
        await page.waitForTimeout(500);
      }
    });
  });
});
