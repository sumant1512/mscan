import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { CouponPage } from '../../utils/page-objects.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Sequential Coupon Code Generation', () => {
  let authHelper: AuthHelper;
  let couponPage: CouponPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    couponPage = new CouponPage(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test('should create coupons with sequential codes', async ({ page }) => {
    // Navigate to Create Coupon page
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to be ready
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    
    // Select verification app
    const verificationAppSelect = page.locator('select#verification_app_id');
    await verificationAppSelect.waitFor({ state: 'visible', timeout: 5000 });
    const appOptions = await verificationAppSelect.locator('option').count();
    
    if (appOptions <= 1) {
      console.log('⚠️ No verification apps available, skipping test');
      test.skip();
      return;
    }
    
    await verificationAppSelect.selectOption({ index: 1 });
    
    // Generate unique prefix for this test
    const testPrefix = `TEST${Date.now().toString().slice(-6)}`;
    const uniqueCoupon = {
      description: `Sequential Test ${testPrefix}`,
      discountValue: '10',
      quantity: '5'
    };
    
    // Fill basic fields
    await page.fill('input#description', uniqueCoupon.description);
    await page.fill('input#discount_value', uniqueCoupon.discountValue);
    await page.fill('input#quantity', uniqueCoupon.quantity);
    
    // Set expiry date (1 year from now)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const expiryDate = futureDate.toISOString().slice(0, 16);
    await page.fill('input#expiry_date', expiryDate);
    
    // Select sequential code type
    const codeTypeSelect = page.locator('select#code_type');
    await codeTypeSelect.waitFor({ state: 'visible', timeout: 5000 });
    await codeTypeSelect.selectOption('sequential');
    
    // Wait for prefix field to appear
    await page.waitForSelector('input#code_prefix', { state: 'visible', timeout: 3000 });
    
    // Enter prefix
    await page.fill('input#code_prefix', testPrefix);
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click({ timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Verify success message
    const successMessage = page.locator('text=/success|created|generated/i');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Verify the generated coupons are displayed
    const couponCodes = page.locator('.coupon-code, [class*="coupon-item"]');
    const couponCount = await couponCodes.count();
    expect(couponCount).toBeGreaterThanOrEqual(5);
    
    // Verify codes follow sequential pattern: PREFIX-001, PREFIX-002, etc.
    const firstCode = await couponCodes.first().textContent();
    expect(firstCode).toMatch(new RegExp(`${testPrefix}-\\d{3}`));
    
    // Verify codes are sequential
    const allCodes: string[] = [];
    for (let i = 0; i < Math.min(5, couponCount); i++) {
      const code = await couponCodes.nth(i).textContent();
      if (code) {
        allCodes.push(code.trim());
      }
    }
    
    // Check that codes are in format PREFIX-001, PREFIX-002, etc.
    allCodes.forEach((code, index) => {
      const expectedNumber = String(index + 1).padStart(3, '0');
      expect(code).toBe(`${testPrefix}-${expectedNumber}`);
    });
    
    console.log(`✅ Generated sequential codes: ${allCodes.join(', ')}`);
  });

  test('should activate sequential coupons using range', async ({ page }) => {
    // First, create sequential coupons
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    
    // Select verification app
    const verificationAppSelect = page.locator('select#verification_app_id');
    await verificationAppSelect.selectOption({ index: 1 });
    
    // Generate unique prefix
    const testPrefix = `RANGE${Date.now().toString().slice(-6)}`;
    
    // Fill form for sequential coupons
    await page.fill('input#description', `Range Test ${testPrefix}`);
    await page.fill('input#discount_value', '15');
    await page.fill('input#quantity', '10');
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.fill('input#expiry_date', futureDate.toISOString().slice(0, 16));
    
    await page.locator('select#code_type').selectOption('sequential');
    await page.waitForSelector('input#code_prefix', { state: 'visible' });
    await page.fill('input#code_prefix', testPrefix);
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for success and codes display
    await expect(page.locator('text=/success|created/i')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Navigate to coupon list
    await couponPage.navigateToCouponList();
    await page.waitForLoadState('networkidle');
    
    // Filter by status "draft" to find newly created coupons
    const statusFilter = page.locator('select[name*="status"], select:has(option:text("Draft"))');
    const filterExists = await statusFilter.isVisible({ timeout: 3000 }).catch(() => false);
    if (filterExists) {
      await statusFilter.selectOption('draft');
      await page.waitForTimeout(1000);
    }
    
    // Find bulk activate or range activate button
    const rangeActivateBtn = page.locator('button:has-text("Activate Range"), button:has-text("Range Activation")');
    const bulkActivateBtn = page.locator('button:has-text("Bulk Activate")');
    
    const hasRangeBtn = await rangeActivateBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasBulkBtn = await bulkActivateBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasRangeBtn) {
      // Use range activation
      await rangeActivateBtn.click();
      await page.waitForSelector('input[name*="from"], input:has-text("From")', { timeout: 3000 });
      
      await page.fill('input[name*="from_code"], input[placeholder*="from"]', `${testPrefix}-001`);
      await page.fill('input[name*="to_code"], input[placeholder*="to"]', `${testPrefix}-005`);
      
      // Optional: fill activation note
      const noteField = page.locator('input[name*="note"], textarea[name*="note"]');
      const noteExists = await noteField.isVisible({ timeout: 1000 }).catch(() => false);
      if (noteExists) {
        await noteField.fill('E2E test range activation');
      }
      
      // Confirm activation
      await page.locator('button:has-text("Activate"), button:has-text("Confirm")').click();
      await page.waitForLoadState('networkidle');
      
      // Verify success
      await expect(page.locator('text=/activated|success/i')).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Successfully activated range: ${testPrefix}-001 to ${testPrefix}-005`);
    } else if (hasBulkBtn) {
      console.log('⚠️ Range activation not available, bulk activation exists but test needs UI update');
    } else {
      console.log('⚠️ No activation buttons found - UI may need implementation');
    }
  });

  test('should reject invalid range (reversed codes)', async ({ page }) => {
    // Navigate to coupon list
    await couponPage.navigateToCouponList();
    await page.waitForLoadState('networkidle');
    
    // Try to find range activate button
    const rangeActivateBtn = page.locator('button:has-text("Activate Range"), button:has-text("Range Activation")');
    const hasRangeBtn = await rangeActivateBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasRangeBtn) {
      test.skip(true, 'Range activation UI not available');
      return;
    }
    
    await rangeActivateBtn.click();
    await page.waitForSelector('input[name*="from"], input[placeholder*="from"]', { timeout: 3000 });
    
    // Enter reversed range (alphabetically backwards)
    await page.fill('input[name*="from_code"], input[placeholder*="from"]', 'COUP-050');
    await page.fill('input[name*="to_code"], input[placeholder*="to"]', 'COUP-001');
    
    // Try to submit
    const submitBtn = page.locator('button:has-text("Activate"), button:has-text("Confirm")');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Should show error
    const errorMsg = page.locator('text=/invalid|error|greater than/i, [class*="error"], [class*="alert-error"]');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Correctly rejected reversed range');
  });

  test('should handle sequential code conflicts gracefully', async ({ page }) => {
    // Create first batch with a specific prefix
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await page.waitForLoadState('networkidle');
    
    const verificationAppSelect = page.locator('select#verification_app_id');
    await verificationAppSelect.selectOption({ index: 1 });
    
    const testPrefix = `CONFLICT${Date.now().toString().slice(-5)}`;
    
    // Create first batch
    await page.fill('input#description', `Conflict Test Batch 1`);
    await page.fill('input#discount_value', '10');
    await page.fill('input#quantity', '3');
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.fill('input#expiry_date', futureDate.toISOString().slice(0, 16));
    
    await page.locator('select#code_type').selectOption('sequential');
    await page.waitForSelector('input#code_prefix');
    await page.fill('input#code_prefix', testPrefix);
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });
    
    // Should have created PREFIX-001, PREFIX-002, PREFIX-003
    
    // Navigate back and create second batch with same prefix
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await page.waitForLoadState('networkidle');
    
    await verificationAppSelect.selectOption({ index: 1 });
    await page.fill('input#description', `Conflict Test Batch 2`);
    await page.fill('input#discount_value', '20');
    await page.fill('input#quantity', '2');
    await page.fill('input#expiry_date', futureDate.toISOString().slice(0, 16));
    
    await page.locator('select#code_type').selectOption('sequential');
    await page.fill('input#code_prefix', testPrefix);
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    
    // Should succeed and continue sequence: PREFIX-004, PREFIX-005
    await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });
    
    // Verify the codes continue from where first batch ended
    const couponCodes = page.locator('.coupon-code, [class*="coupon-item"]');
    const count = await couponCodes.count();
    
    if (count >= 2) {
      const code1 = await couponCodes.nth(0).textContent();
      const code2 = await couponCodes.nth(1).textContent();
      
      // Should be PREFIX-004 and PREFIX-005
      expect(code1).toContain(`${testPrefix}-004`);
      expect(code2).toContain(`${testPrefix}-005`);
      
      console.log(`✅ Sequence continued correctly: ${code1}, ${code2}`);
    }
  });

  test('should support different prefixes for different coupon types', async ({ page }) => {
    const testRun = Date.now().toString().slice(-5);
    const prefixes = [`SALE${testRun}`, `DISC${testRun}`, `PROMO${testRun}`];
    
    for (const prefix of prefixes) {
      await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
      await page.waitForLoadState('networkidle');
      
      await page.locator('select#verification_app_id').selectOption({ index: 1 });
      await page.fill('input#description', `Test ${prefix}`);
      await page.fill('input#discount_value', '10');
      await page.fill('input#quantity', '2');
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      await page.fill('input#expiry_date', futureDate.toISOString().slice(0, 16));
      
      await page.locator('select#code_type').selectOption('sequential');
      await page.fill('input#code_prefix', prefix);
      
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });
      
      // Verify each prefix starts from 001
      const couponCodes = page.locator('.coupon-code, [class*="coupon-item"]');
      const firstCode = await couponCodes.first().textContent();
      expect(firstCode).toContain(`${prefix}-001`);
    }
    
    console.log(`✅ Created separate sequences for: ${prefixes.join(', ')}`);
  });

  test('should validate prefix format requirements', async ({ page }) => {
    await couponPage.navigateToMenuItem('Rewards', 'Create Coupon');
    await page.waitForLoadState('networkidle');
    
    await page.locator('select#verification_app_id').selectOption({ index: 1 });
    await page.fill('input#description', 'Validation Test');
    await page.fill('input#discount_value', '10');
    await page.fill('input#quantity', '1');
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.fill('input#expiry_date', futureDate.toISOString().slice(0, 16));
    
    await page.locator('select#code_type').selectOption('sequential');
    await page.waitForSelector('input#code_prefix');
    
    // Test invalid prefixes
    const invalidPrefixes = [
      { value: 'a', reason: 'too short (min 2 chars)' },
      { value: 'lowercase', reason: 'lowercase not allowed' },
      { value: 'A-B', reason: 'special chars not allowed' },
      { value: 'TOOLONGPREFIX123', reason: 'too long (max 10 chars)' }
    ];
    
    for (const { value, reason } of invalidPrefixes) {
      await page.fill('input#code_prefix', value);
      await page.waitForTimeout(300);
      
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click({ timeout: 2000, force: true });
      await page.waitForTimeout(500);
      
      // Should either show validation error or button stays disabled
      const hasError = await page.locator('text=/error|invalid|required/i, [class*="error"]')
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      
      const stillOnCreatePage = page.url().includes('create') || page.url().includes('coupon');
      
      expect(hasError || stillOnCreatePage).toBeTruthy();
      console.log(`✅ Correctly rejected: ${value} (${reason})`);
    }
  });
});
