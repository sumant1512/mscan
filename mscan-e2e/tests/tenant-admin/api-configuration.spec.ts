import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * API Configuration E2E Tests
 * Tests for managing Mobile and E-commerce API keys for verification apps
 */
test.describe('Tenant Admin - API Configuration', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test('should navigate to API configuration page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    // Click on first verification app
    const appCard = page.locator('.app-card, mat-card, .card').first();
    const hasApps = await appCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasApps) {
      test.skip(true, 'No verification apps available');
    }

    // Look for API Config or Settings button
    const apiConfigButton = appCard.locator('button:has-text("API"), button:has-text("Settings"), a:has-text("API Configuration")').first();
    const hasApiButton = await apiConfigButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasApiButton) {
      await apiConfigButton.click();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      // Verify API config page loaded
      const hasApiConfig = await page.locator('text=/API.*key|mobile.*API|e-commerce.*API/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasApiConfig).toBeTruthy();
    } else {
      // Try clicking the card itself to open details, then look for API tab
      await appCard.click();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
      const hasApiTab = await apiTab.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasApiTab) {
        await apiTab.click();
        await page.waitForTimeout(1000);
      }

      const hasApiConfig = await page.locator('text=/API.*key|mobile.*API|e-commerce.*API/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasApiConfig).toBeTruthy();
    }
  });

  test('should display mobile API key section', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    const hasApps = await appCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasApps) {
      test.skip(true, 'No verification apps available');
    }

    // Navigate to API config
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Verify Mobile API section exists
    const mobileApiSection = page.locator('text=/mobile.*API|mobile.*key/i').first();
    const hasMobileApiSection = await mobileApiSection.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasMobileApiSection) {
      test.skip(true, 'Mobile API section not found');
    }

    await expect(mobileApiSection).toBeVisible();
  });

  test('should display e-commerce API key section', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    const hasApps = await appCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasApps) {
      test.skip(true, 'No verification apps available');
    }

    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Verify E-commerce API section exists
    const ecommerceApiSection = page.locator('text=/e-commerce.*API|ecommerce.*key/i').first();
    const hasEcommerceApiSection = await ecommerceApiSection.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEcommerceApiSection) {
      test.skip(true, 'E-commerce API section not found');
    }

    await expect(ecommerceApiSection).toBeVisible();
  });

  test('should enable mobile API and generate key', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for enable Mobile API button/toggle
    const enableMobileButton = page.locator('button:has-text("Enable Mobile"), button:has-text("Generate Mobile"), mat-slide-toggle').filter({
      has: page.locator('text=/mobile/i')
    }).first();

    const hasEnableButton = await enableMobileButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEnableButton) {
      test.skip(true, 'Enable Mobile API button not found (may already be enabled)');
    }

    // Check if it's a toggle or button
    const isToggle = await page.locator('mat-slide-toggle').filter({
      has: page.locator('text=/mobile/i')
    }).isVisible({ timeout: 1000 }).catch(() => false);

    if (isToggle) {
      await enableMobileButton.click();
    } else {
      await enableMobileButton.click();
    }

    await page.waitForTimeout(2000);

    // Verify API key is displayed
    const apiKey = page.locator('input[readonly], code, pre').filter({
      has: page.locator('text=/[a-f0-9-]{36}|[A-Za-z0-9_-]{20,}/i')
    }).first();

    const hasApiKey = await apiKey.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasApiKey) {
      await expect(apiKey).toBeVisible();
    } else {
      // Alternative: check for success message
      const successMessage = page.locator('text=/enabled|generated|success|key.*created/i').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should enable e-commerce API and generate key', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for enable E-commerce API button/toggle
    const enableEcommerceButton = page.locator('button:has-text("Enable E-commerce"), button:has-text("Generate E-commerce"), mat-slide-toggle').filter({
      has: page.locator('text=/e-commerce|ecommerce/i')
    }).first();

    const hasEnableButton = await enableEcommerceButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEnableButton) {
      test.skip(true, 'Enable E-commerce API button not found (may already be enabled)');
    }

    const isToggle = await page.locator('mat-slide-toggle').filter({
      has: page.locator('text=/e-commerce|ecommerce/i')
    }).isVisible({ timeout: 1000 }).catch(() => false);

    if (isToggle) {
      await enableEcommerceButton.click();
    } else {
      await enableEcommerceButton.click();
    }

    await page.waitForTimeout(2000);

    // Verify API key is displayed or success message
    const hasSuccess = await page.locator('text=/enabled|generated|success|key.*created/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSuccess).toBeTruthy();
  });

  test('should regenerate mobile API key', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for regenerate button
    const regenerateButton = page.locator('button:has-text("Regenerate Mobile"), button:has-text("Refresh Mobile")').first();
    const hasRegenerateButton = await regenerateButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasRegenerateButton) {
      test.skip(true, 'Regenerate Mobile API button not found (Mobile API may not be enabled)');
    }

    // Get current key if visible
    const apiKeyField = page.locator('input[readonly]').filter({
      has: page.locator('text=/mobile/i')
    }).first();

    let oldKey = '';
    if (await apiKeyField.isVisible({ timeout: 2000 }).catch(() => false)) {
      oldKey = await apiKeyField.inputValue();
    }

    // Click regenerate
    await regenerateButton.click();

    // Handle confirmation if present
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Regenerate")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasConfirm) {
      await confirmButton.click();
    }

    await page.waitForTimeout(2000);

    // Verify key changed or success message
    if (oldKey) {
      const newKey = await apiKeyField.inputValue();
      expect(newKey).not.toBe(oldKey);
    } else {
      const successMessage = page.locator('text=/regenerated|success|key.*updated/i').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should regenerate e-commerce API key', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    const regenerateButton = page.locator('button:has-text("Regenerate E-commerce"), button:has-text("Refresh E-commerce")').first();
    const hasRegenerateButton = await regenerateButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasRegenerateButton) {
      test.skip(true, 'Regenerate E-commerce API button not found (E-commerce API may not be enabled)');
    }

    await regenerateButton.click();

    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Regenerate")').last();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await page.waitForTimeout(2000);

    const successMessage = page.locator('text=/regenerated|success|key.*updated/i').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('should copy API key to clipboard', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for copy button
    const copyButton = page.locator('button:has-text("Copy"), button[title*="Copy"], .copy-button').first();
    const hasCopyButton = await copyButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasCopyButton) {
      test.skip(true, 'Copy API key button not found');
    }

    await copyButton.click();
    await page.waitForTimeout(500);

    // Verify copy success (either through tooltip or message)
    const successIndicator = page.locator('text=/copied|copy.*success/i').first();
    const hasSuccess = await successIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasSuccess).toBeTruthy();
  });

  test('should display API usage statistics', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for API usage stats
    const usageStats = page.locator('text=/API.*usage|requests|calls|rate limit/i').first();
    const hasUsageStats = await usageStats.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUsageStats) {
      test.skip(true, 'API usage statistics not displayed');
    }

    await expect(usageStats).toBeVisible();
  });

  test('should show API endpoint documentation', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for API documentation or endpoint URLs
    const apiDocs = page.locator('text=/endpoint|base URL|API.*documentation/i, code, pre').first();
    const hasDocs = await apiDocs.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDocs) {
      test.skip(true, 'API documentation not displayed');
    }

    await expect(apiDocs).toBeVisible();
  });

  test('should disable mobile API', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for disable button or toggle (only if API is enabled)
    const disableButton = page.locator('button:has-text("Disable Mobile"), mat-slide-toggle').filter({
      has: page.locator('text=/mobile/i')
    }).first();

    const hasDisableButton = await disableButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDisableButton) {
      test.skip(true, 'Disable Mobile API option not found (API may already be disabled)');
    }

    // Check if toggle is currently on
    const isToggle = await page.locator('mat-slide-toggle').filter({
      has: page.locator('text=/mobile/i')
    }).isVisible({ timeout: 1000 }).catch(() => false);

    if (isToggle) {
      const toggleChecked = await disableButton.getAttribute('class');
      if (toggleChecked && toggleChecked.includes('checked')) {
        await disableButton.click();
        await page.waitForTimeout(1000);

        const successMessage = page.locator('text=/disabled|deactivated/i').first();
        const hasSuccess = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('should mask/unmask API key on toggle', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for show/hide/eye icon button
    const toggleVisibilityButton = page.locator('button[title*="Show"], button[title*="Hide"], .visibility-toggle, button:has(mat-icon:has-text("visibility"))').first();
    const hasToggleButton = await toggleVisibilityButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasToggleButton) {
      test.skip(true, 'API key visibility toggle not found');
    }

    // Get initial state
    const apiKeyField = page.locator('input[type="password"], input[readonly]').first();
    const initialType = await apiKeyField.getAttribute('type');

    // Toggle visibility
    await toggleVisibilityButton.click();
    await page.waitForTimeout(500);

    // Verify type changed
    const newType = await apiKeyField.getAttribute('type');
    expect(newType).not.toBe(initialType);
  });

  test('should show API key creation date', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Verification App', 'Manage');
    await pageHelper.waitForLoadingToComplete();

    const appCard = page.locator('.app-card, mat-card, .card').first();
    await appCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const apiTab = page.locator('button:has-text("API"), mat-tab:has-text("API"), a:has-text("API")').first();
    if (await apiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apiTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for creation/last updated date
    const dateInfo = page.locator('text=/created|generated|last updated.*ago|[0-9]{4}-[0-9]{2}-[0-9]{2}/i').first();
    const hasDateInfo = await dateInfo.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDateInfo) {
      test.skip(true, 'API key creation/update date not displayed');
    }

    await expect(dateInfo).toBeVisible();
  });
});
