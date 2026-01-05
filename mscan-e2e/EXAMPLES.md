/**
 * Example Test Template
 * Copy this template to create new tests
 */

import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../utils/helpers';
import { TEST_CONFIG } from '../utils/test-config';

test.describe('Your Feature Name', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    
    // Login as needed
    // await authHelper.loginAsSuperAdmin();
    // OR
    // await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test('should perform basic action', async ({ page }) => {
    // Navigate
    await pageHelper.navigateToMenuItem('Menu Item');
    
    // Wait for page to load
    await pageHelper.waitForLoadingToComplete();
    
    // Verify page elements
    await expect(page.locator('h1')).toContainText('Expected Text');
  });

  test('should create new item', async ({ page }) => {
    // Navigate to list
    await pageHelper.navigateToMenuItem('Items');
    
    // Click create button
    await pageHelper.clickButton('Create Item');
    await pageHelper.waitForLoadingToComplete();
    
    // Fill form
    await pageHelper.fillFieldByLabel('Name', 'Test Item');
    await pageHelper.fillFieldByLabel('Description', 'Test Description');
    
    // Submit form
    await pageHelper.clickButton('Submit');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify success
    await pageHelper.waitForSuccessMessage();
    await pageHelper.verifyTableContainsText('Test Item');
  });

  test('should handle validation errors', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Items');
    await pageHelper.clickButton('Create Item');
    
    // Submit empty form
    await pageHelper.clickButton('Submit');
    
    // Verify validation error
    await expect(page.locator('text=/required|invalid/i')).toBeVisible();
  });

  test('should edit existing item', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Items');
    
    // Click edit on first row
    await pageHelper.clickTableRowAction('Test Item', 'Edit');
    await pageHelper.waitForLoadingToComplete();
    
    // Update field
    await pageHelper.fillFieldByLabel('Name', 'Updated Item');
    
    // Save
    await pageHelper.clickButton('Save');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify success
    await pageHelper.waitForSuccessMessage();
  });

  test('should delete item', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Items');
    
    // Click delete
    await pageHelper.clickTableRowAction('Test Item', 'Delete');
    
    // Confirm
    await pageHelper.clickButton('Confirm');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify deleted
    await pageHelper.waitForSuccessMessage();
  });

  test('should filter items', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Items');
    
    // Use search/filter
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Test');
    await pageHelper.waitForLoadingToComplete();
    
    // Verify filtered results
    const rowCount = await pageHelper.getTableRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should handle pagination', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Items');
    
    const initialCount = await pageHelper.getTableRowCount();
    
    // Click next page or load more
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Load More")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await pageHelper.waitForLoadingToComplete();
      
      const newCount = await pageHelper.getTableRowCount();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });
});

/**
 * Advanced Example: API Response Validation
 */
test.describe('API Response Validation', () => {
  test('should validate API responses', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
    
    // Listen to API responses
    const apiResponses: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const json = await response.json();
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            data: json
          });
        } catch (e) {
          // Not JSON response
        }
      }
    });
    
    // Perform action that triggers API call
    await page.click('nav a:has-text("Tenants")');
    await page.waitForLoadState('networkidle');
    
    // Validate API response structure
    const tenantsResponse = apiResponses.find(r => r.url.includes('/tenants'));
    if (tenantsResponse) {
      expect(tenantsResponse.status).toBe(200);
      expect(tenantsResponse.data).toHaveProperty('success', true);
      expect(tenantsResponse.data).toHaveProperty('data');
    }
  });
});

/**
 * Advanced Example: Multi-step Workflow
 */
test.describe('Complete User Journey', () => {
  test('should complete end-to-end user journey', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const pageHelper = new PageHelper(page);
    
    // Step 1: Login
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    
    // Step 2: Create coupon
    await pageHelper.navigateToMenuItem('Coupons');
    await pageHelper.clickButton('Create Coupon');
    await pageHelper.fillFieldByLabel('Offer Title', 'Journey Test Offer');
    await pageHelper.clickButton('Create');
    await pageHelper.waitForSuccessMessage();
    
    // Step 3: Register customer
    await pageHelper.navigateToMenuItem('Register Customer');
    await pageHelper.fillFieldByLabel('First Name', 'Test');
    await pageHelper.fillFieldByLabel('Last Name', 'Customer');
    await pageHelper.fillFieldByLabel('Email', 'test@example.com');
    await pageHelper.clickButton('Register');
    await pageHelper.waitForSuccessMessage();
    
    // Step 4: Verify dashboard updates
    await pageHelper.navigateToDashboard();
    await expect(page.locator('text=/coupon|customer/i')).toBeVisible();
  });
});
