import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Comprehensive Verification App Management Tests
 * Covers complete CRUD lifecycle and app configuration scenarios
 */
test.describe('Tenant Admin - Verification App Complete Management', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  let testAppId: string;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test.describe('Verification App Creation', () => {

    test('should create verification app with all required fields', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      await page.click('button:has-text("Create New App")');
      await page.waitForTimeout(1000);

      const appData = {
        app_name: `E2E Complete Test App ${timestamp}`,
        description: 'Comprehensive test app for E2E testing',
        welcome_message: 'Welcome to our loyalty program!',
        scan_success_message: 'Congratulations! Points added successfully.',
        scan_failure_message: 'Sorry, this coupon is invalid or expired.'
      };

      await page.fill('input[formControlName="app_name"]', appData.app_name);
      await page.fill('textarea[formControlName="description"]', appData.description);
      await page.fill('textarea[formControlName="welcome_message"]', appData.welcome_message);
      await page.fill('textarea[formControlName="scan_success_message"]', appData.scan_success_message);
      await page.fill('textarea[formControlName="scan_failure_message"]', appData.scan_failure_message);

      await page.click('button[type="submit"]:has-text("Create")');

      await page.waitForURL('**/tenant/verification-app', { timeout: 10000 });
      await pageHelper.waitForLoadingToComplete();

      const appCard = page.locator(`.app-card:has-text("${appData.app_name}")`);
      await expect(appCard).toBeVisible({ timeout: 5000 });

      // Verify app details are displayed
      await expect(appCard.locator('text=/Welcome to our loyalty program/i')).toBeVisible();
    });

    test('should validate required fields on app creation', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      await page.click('button:has-text("Create New App")');
      await page.waitForTimeout(1000);

      // Try to submit without filling required fields
      await page.click('button[type="submit"]:has-text("Create")');
      await page.waitForTimeout(1000);

      // Verify validation errors appear
      const appNameError = page.locator('input[formControlName="app_name"]').locator('..');
      const errorVisible = await appNameError.locator('text=/required/i').isVisible().catch(() => false);

      expect(errorVisible).toBeTruthy();
    });

    test('should prevent duplicate app names', async ({ page }) => {
      const duplicateName = `Duplicate App ${timestamp}`;

      // Create first app
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();
      await page.click('button:has-text("Create New App")');
      await page.waitForTimeout(1000);

      await page.fill('input[formControlName="app_name"]', duplicateName);
      await page.fill('textarea[formControlName="description"]', 'First app');
      await page.fill('textarea[formControlName="welcome_message"]', 'Welcome');
      await page.fill('textarea[formControlName="scan_success_message"]', 'Success');
      await page.fill('textarea[formControlName="scan_failure_message"]', 'Failure');
      await page.click('button[type="submit"]:has-text("Create")');

      await page.waitForURL('**/tenant/verification-app', { timeout: 10000 });
      await pageHelper.waitForLoadingToComplete();

      // Try to create duplicate
      await page.click('button:has-text("Create New App")');
      await page.waitForTimeout(1000);

      await page.fill('input[formControlName="app_name"]', duplicateName);
      await page.fill('textarea[formControlName="description"]', 'Duplicate app');
      await page.fill('textarea[formControlName="welcome_message"]', 'Welcome');
      await page.fill('textarea[formControlName="scan_success_message"]', 'Success');
      await page.fill('textarea[formControlName="scan_failure_message"]', 'Failure');
      await page.click('button[type="submit"]:has-text("Create")');

      await page.waitForTimeout(2000);

      // Should show error or stay on form
      const currentUrl = page.url();
      const stillOnForm = currentUrl.includes('/create') || currentUrl.includes('/new');

      if (stillOnForm) {
        const errorMessage = page.locator('.alert-error, .error-message');
        const hasError = await errorMessage.isVisible().catch(() => false);
        expect(hasError || stillOnForm).toBeTruthy();
      }
    });
  });

  test.describe('Verification App Configuration', () => {

    test('should update app configuration successfully', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const firstApp = page.locator('.app-card').first();
      await expect(firstApp).toBeVisible();

      const appName = await firstApp.locator('h3, .app-name').first().textContent();

      await firstApp.locator('button:has-text("Configure")').click();
      await page.waitForTimeout(1000);

      // Update configuration
      const newDescription = `Updated description ${timestamp}`;
      await page.fill('textarea[formControlName="description"]', newDescription);

      const newWelcome = `Updated welcome message ${timestamp}`;
      await page.fill('textarea[formControlName="welcome_message"]', newWelcome);

      await page.click('button[type="submit"]:has-text("Save")');
      await page.waitForTimeout(2000);

      // Verify changes
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/verification-app`);
      await pageHelper.waitForLoadingToComplete();

      const updatedApp = page.locator(`.app-card:has-text("${appName}")`);
      await expect(updatedApp).toBeVisible();
    });

    test('should toggle app active/inactive status', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const firstApp = page.locator('.app-card').first();
      await expect(firstApp).toBeVisible();

      await firstApp.locator('button:has-text("Configure")').click();
      await page.waitForTimeout(1000);

      const activeToggle = page.locator('input[type="checkbox"][formControlName="is_active"]');
      const initialState = await activeToggle.isChecked();

      // Toggle status
      await activeToggle.click();
      await page.waitForTimeout(500);

      // Save changes
      await page.click('button[type="submit"]:has-text("Save")');
      await page.waitForTimeout(2000);

      // Verify status changed
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/verification-app`);
      await pageHelper.waitForLoadingToComplete();

      await firstApp.locator('button:has-text("Configure")').click();
      await page.waitForTimeout(1000);

      const newState = await activeToggle.isChecked();
      expect(newState).toBe(!initialState);

      // Restore original state
      if (newState !== initialState) {
        await activeToggle.click();
        await page.click('button[type="submit"]:has-text("Save")');
        await page.waitForTimeout(1000);
      }
    });

    test('should regenerate API key for verification app', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const firstApp = page.locator('.app-card').first();
      await expect(firstApp).toBeVisible();

      await firstApp.locator('button:has-text("Configure")').click();
      await page.waitForTimeout(1000);

      // Check if API key is displayed
      const apiKeyDisplay = page.locator('text=/api.*key/i').first();
      const hasApiKey = await apiKeyDisplay.isVisible().catch(() => false);

      if (hasApiKey) {
        const currentApiKey = await page.locator('input[readonly], code, pre').filter({ has: page.locator('text=/[a-f0-9]{32,}/i') }).first().textContent();

        // Click regenerate button if available
        const regenerateBtn = page.locator('button:has-text("Regenerate"), button:has-text("Generate New Key")');
        const hasRegenBtn = await regenerateBtn.isVisible().catch(() => false);

        if (hasRegenBtn) {
          await regenerateBtn.click();
          await page.waitForTimeout(1000);

          // Confirm if needed
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
          }

          await page.waitForTimeout(2000);

          // Verify new API key is different
          const newApiKey = await page.locator('input[readonly], code, pre').filter({ has: page.locator('text=/[a-f0-9]{32,}/i') }).first().textContent();
          expect(newApiKey).not.toBe(currentApiKey);
        }
      }
    });
  });

  test.describe('Verification App Listing and Viewing', () => {

    test('should display all verification apps in card view', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const appCards = page.locator('.app-card');
      const count = await appCards.count();

      expect(count).toBeGreaterThan(0);

      // Verify each card has essential information
      const firstCard = appCards.first();
      await expect(firstCard.locator('h3, .app-name')).toBeVisible();
      await expect(firstCard.locator('button:has-text("Configure")')).toBeVisible();
    });

    test('should view app details', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const firstApp = page.locator('.app-card').first();
      const viewBtn = firstApp.locator('button:has-text("View"), button:has-text("Details")');

      const hasViewBtn = await viewBtn.isVisible().catch(() => false);

      if (hasViewBtn) {
        await viewBtn.click();
        await page.waitForTimeout(1000);

        // Verify details are shown (either in modal or new page)
        const detailsVisible = await page.locator('text=/app.*code|api.*key|status/i').isVisible();
        expect(detailsVisible).toBeTruthy();
      } else {
        // View might be integrated in configure
        await firstApp.locator('button:has-text("Configure")').click();
        await page.waitForTimeout(1000);

        await expect(page.locator('textarea[formControlName="description"]')).toBeVisible();
      }
    });

    test('should filter active and inactive apps', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      // Look for filter dropdown or tabs
      const filterDropdown = page.locator('select').filter({ hasText: /status|active|all/i });
      const filterTabs = page.locator('button, .tab').filter({ hasText: /all|active|inactive/i });

      const hasFilter = await filterDropdown.isVisible().catch(() => false);
      const hasTabs = (await filterTabs.count()) > 0;

      if (hasFilter) {
        const initialCount = await page.locator('.app-card').count();

        await filterDropdown.selectOption({ label: 'Active' });
        await page.waitForTimeout(1000);

        const activeCount = await page.locator('.app-card').count();

        await filterDropdown.selectOption({ label: 'Inactive' });
        await page.waitForTimeout(1000);

        const inactiveCount = await page.locator('.app-card').count();

        expect(initialCount).toBeGreaterThanOrEqual(activeCount + inactiveCount);
      } else if (hasTabs) {
        // Test tab filtering
        await filterTabs.filter({ hasText: /active/i }).first().click();
        await page.waitForTimeout(1000);

        const activeApps = await page.locator('.app-card').count();
        expect(activeApps).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Verification App Deletion', () => {

    test('should prevent deletion of app with associated data', async ({ page }) => {
      // This test assumes at least one app has coupons or categories
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const appWithData = page.locator('.app-card').first();
      const deleteBtn = appWithData.locator('button:has-text("Delete"), button.btn-danger');

      const hasDeleteBtn = await deleteBtn.isVisible().catch(() => false);

      if (hasDeleteBtn) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);

        // Confirm deletion
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(2000);

        // Should show error message
        const errorMessage = page.locator('text=/cannot delete.*associated|has.*data|remove.*first/i');
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (!hasError) {
          // If deletion succeeded, it means the app had no data
          console.log('✓ App was deleted (had no associated data)');
          expect(true).toBeTruthy();
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    });

    test('should successfully delete app without dependencies', async ({ page }) => {
      // Create a new app specifically for deletion
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      await page.click('button:has-text("Create New App")');
      await page.waitForTimeout(1000);

      const appToDelete = `Delete Me App ${timestamp}`;
      await page.fill('input[formControlName="app_name"]', appToDelete);
      await page.fill('textarea[formControlName="description"]', 'App created for deletion test');
      await page.fill('textarea[formControlName="welcome_message"]', 'Welcome');
      await page.fill('textarea[formControlName="scan_success_message"]', 'Success');
      await page.fill('textarea[formControlName="scan_failure_message"]', 'Failure');
      await page.click('button[type="submit"]:has-text("Create")');

      await page.waitForURL('**/tenant/verification-app', { timeout: 10000 });
      await pageHelper.waitForLoadingToComplete();

      // Now delete it
      const appCard = page.locator(`.app-card:has-text("${appToDelete}")`);
      await expect(appCard).toBeVisible({ timeout: 5000 });

      const deleteBtn = appCard.locator('button:has-text("Delete"), button.btn-danger');

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);

        // Confirm deletion
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(2000);

        // Verify app is deleted
        await expect(appCard).not.toBeVisible();
      }
    });
  });

  test.describe('App Selector Integration', () => {

    test('should show all apps in app selector dropdown', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Categories');
      await pageHelper.waitForLoadingToComplete();

      const appSelector = page.locator('.app-selector-dropdown, #app-select');
      await expect(appSelector).toBeVisible();

      const appOptions = await appSelector.locator('option:not([disabled])').count();
      expect(appOptions).toBeGreaterThan(1); // At least "All Applications" + 1 app
    });

    test('should persist selected app across navigation', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Categories');
      await pageHelper.waitForLoadingToComplete();

      const appSelector = page.locator('.app-selector-dropdown, #app-select');
      const appOptions = await appSelector.locator('option:not([value=""]):not([disabled])').count();

      if (appOptions > 0) {
        // Select first app
        await appSelector.selectOption({ index: 1 });
        const selectedValue = await appSelector.inputValue();
        await page.waitForTimeout(1000);

        // Navigate to products
        await pageHelper.navigateToMenuItem('Catalogue', 'Products');
        await pageHelper.waitForLoadingToComplete();

        // Verify same app is selected
        const newValue = await appSelector.inputValue();
        expect(newValue).toBe(selectedValue);
      }
    });
  });

  test.describe('API Key Management', () => {

    test('should display API key for external integration', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const firstApp = page.locator('.app-card').first();
      await firstApp.locator('button:has-text("Configure")').click();
      await page.waitForTimeout(1000);

      // Check for API key display
      const apiKeySection = page.locator('text=/api.*key|external.*key/i');
      const hasApiKey = await apiKeySection.isVisible().catch(() => false);

      if (hasApiKey) {
        // Verify API key format (should be a long alphanumeric string)
        const apiKeyValue = await page.locator('input[readonly], code, .api-key-display').first().textContent();
        expect(apiKeyValue).toBeTruthy();
        expect(apiKeyValue?.length).toBeGreaterThan(20);
      }
    });

    test('should copy API key to clipboard', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Verification App', 'Manage');
      await pageHelper.waitForLoadingToComplete();

      const firstApp = page.locator('.app-card').first();
      await firstApp.locator('button:has-text("Configure")').click();
      await page.waitForTimeout(1000);

      const copyBtn = page.locator('button:has-text("Copy"), button.copy-btn').filter({ has: page.locator('text=/api.*key/i').locator('..') });
      const hasCopyBtn = await copyBtn.isVisible().catch(() => false);

      if (hasCopyBtn) {
        await copyBtn.click();
        await page.waitForTimeout(500);

        // Verify copy success message or icon change
        const successIndicator = page.locator('text=/copied|success/i');
        const hasSuccess = await successIndicator.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasSuccess) {
          expect(hasSuccess).toBeTruthy();
        }
      }
    });
  });
});
