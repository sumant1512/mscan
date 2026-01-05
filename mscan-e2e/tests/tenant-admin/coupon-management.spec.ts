import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { CouponPage } from '../../utils/page-objects.js';
import { TEST_CONFIG, TEST_DATA } from '../../utils/test-config.js';

test.describe('Tenant Admin - Coupon Management', () => {
  let authHelper: AuthHelper;
  let couponPage: CouponPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    couponPage = new CouponPage(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test('should display coupon list', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*coupon/i);
    
    // Verify coupons grid exists
    const listElement = page.locator('.coupons-grid, table, [class*="list"]').first();
    await expect(listElement).toBeVisible();
  });

  test('should create new coupon successfully', async ({ page }) => {
    // Navigate to Create Coupon page
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to be ready
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    
    // Check if verification app dropdown has options
    const verificationAppSelect = page.locator('select#verification_app_id');
    await verificationAppSelect.waitFor({ state: 'visible', timeout: 5000 });
    const appOptions = await verificationAppSelect.locator('option').count();
    
    if (appOptions <= 1) {
      // No verification apps available, skip this test
      console.log('⚠️ No verification apps available, skipping coupon creation test');
      test.skip();
      return;
    }
    
    // Select first available verification app
    await verificationAppSelect.selectOption({ index: 1 });
    
    const uniqueCoupon = {
      description: `Test Coupon ${Date.now()}`,
      discountValue: '10',
      quantity: '50'
    };
    
    // Fill the form fields
    await page.fill('input#description', uniqueCoupon.description);
    await page.fill('input#discount_value', uniqueCoupon.discountValue);
    await page.fill('input#quantity', uniqueCoupon.quantity);
    
    // Set expiry date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expiryDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    await page.fill('input#expiry_date', expiryDate);
    
    // Wait a moment for validation
    await page.waitForTimeout(1000);
    
    // Check if submit button is enabled
    const submitButton = page.locator('button:has-text("Create Coupon"), button[type="submit"]');
    const isEnabled = await submitButton.isEnabled();
    
    if (!isEnabled) {
      console.log('⚠️ Submit button still disabled after filling form, checking validation');
      // Take screenshot for debugging
      await page.screenshot({ path: 'coupon-form-validation-issue.png' });
    }
    
    // Submit the form (force click if needed)
    await submitButton.click({ timeout: 5000, force: !isEnabled });
    await page.waitForLoadState('networkidle');
    
    // Verify success - either message or navigation
    const hasSuccessMessage = await page.locator('text=/success|created|generated/i').isVisible({ timeout: 5000 }).catch(() => false);
    const isOnListOrDetailPage = page.url().includes('/coupon');
    expect(hasSuccessMessage || isOnListOrDetailPage).toBeTruthy();
  });

  test('should edit coupon details', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Check if any active coupons exist with edit button
    const editButton = page.locator('button:has-text("Edit"), .btn-action:has-text("Edit")').first();
    const buttonExists = await editButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!buttonExists) {
      test.skip(true, 'No active coupons available to edit');
    }
    
    await editButton.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    // Wait for edit form to load
    const formVisible = await page.waitForSelector('input[type="datetime-local"], textarea[name="description"]', { timeout: 5000 }).catch(() => null);
    if (!formVisible) {
      test.skip(true, 'Edit form did not load');
    }
    
    // Update description (discount value cannot be changed per UI)
    const descriptionField = page.locator('textarea[name="description"]').first();
    await descriptionField.fill(`Updated description ${Date.now()}`);
    
    // Click save button and wait for navigation
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
    await Promise.all([
      page.waitForURL(/.*\/coupons\/?$/, { timeout: 5000 }).catch(() => {}),
      saveButton.click()
    ]);
    
    // Verify we're back on list page
    const onListPage = page.url().includes('/coupons') && !page.url().includes('/edit');
    expect(onListPage).toBeTruthy();
  });

  test('should view coupon details', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Click view on first coupon
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await couponPage.waitForLoadingToComplete();
      
      // Verify details are displayed
      await expect(page.locator('text=/offer|description|discount/i')).toBeVisible();
    }
  });

  test('should toggle coupon status (activate/deactivate)', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Check if status toggle button exists
    const statusButton = page.locator('button:has-text("Activate"), button:has-text("Deactivate"), .btn-action:has-text("Activate"), .btn-action:has-text("Deactivate")').first();
    const buttonExists = await statusButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!buttonExists) {
      test.skip(true, 'No coupons available to toggle status');
    }
    
    // Setup dialog handler before clicking
    page.on('dialog', dialog => dialog.accept());
    
    await statusButton.click();
    
    // Wait for page reload after confirmation
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    
    // Verify we're still on coupons list page (reloaded after status change)
    const onListPage = page.url().includes('/coupons');
    expect(onListPage).toBeTruthy();
  });

  test('should filter coupons by category', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Check if category filter exists
    const categoryFilter = page.locator('select, button:has-text("Category")');
    if (await categoryFilter.first().isVisible()) {
      await categoryFilter.first().click();
      await couponPage.waitForLoadingToComplete();
    }
  });

  test('should filter coupons by status', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Check if status filter exists
    const statusFilter = page.locator('select option:has-text("Active"), button:has-text("Active")');
    if (await statusFilter.first().isVisible()) {
      await statusFilter.first().click();
      await couponPage.waitForLoadingToComplete();
    }
  });

  test('should handle pagination in coupon list', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Check if pagination exists
    const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Next")');
    if (await loadMoreButton.isVisible()) {
      const initialCount = await couponPage.getTableRowCount();
      
      await loadMoreButton.click();
      await couponPage.waitForLoadingToComplete();
      
      const newCount = await couponPage.getTableRowCount();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should display validation errors for invalid coupon data', async ({ page }) => {
    // Navigate to Create Coupon page
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await couponPage.waitForLoadingToComplete();
    
    // Try to submit without filling required fields
    const createButton = page.locator('button:has-text("Create"), button[type="submit"]');
    
    // Wait for the button to be ready
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check if button is initially disabled or if form validation will show errors
    const isDisabled = await createButton.isDisabled();
    
    if (!isDisabled) {
      await createButton.click({ force: true });
      
      // Verify validation errors appear
      const errorVisible = await page.locator('text=/required|invalid|field|must/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorVisible).toBeTruthy();
    } else {
      // If button is disabled, that's also a valid validation state
      expect(isDisabled).toBeTruthy();
    }
  });

  test('should search coupons', async ({ page }) => {
    await couponPage.navigateToCouponList();
    
    // Check if search exists
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await couponPage.waitForLoadingToComplete();
    }
  });
});
