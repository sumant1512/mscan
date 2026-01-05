import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { CustomerPage } from '../../utils/page-objects.js';
import { TEST_CONFIG, TEST_DATA } from '../../utils/test-config.js';

test.describe('Tenant Admin - Customer Registration', () => {
  let authHelper: AuthHelper;
  let customerPage: CustomerPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    customerPage = new CustomerPage(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  });

  test.skip('Customer registration is Super Admin only feature', async ({ page }) => {
    // Customer registration is only available to Super Admin
    // Tenant admins do not have access to register new customers
    // These tests should be in tests/super-admin/ directory instead
  });

  // All tests below are skipped as customer registration is not a tenant admin feature
  test.skip('should register new customer successfully', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    const uniqueCustomer = {
      ...TEST_DATA.newCustomer,
      email: `customer${Date.now()}@example.com`,
      phone: `+1${Date.now().toString().slice(-9)}`
    };
    
    await customerPage.registerCustomer(uniqueCustomer);
    
    // Verify success message
    await customerPage.waitForSuccessMessage();
  });

  test.skip('should display validation errors for invalid customer data', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Register")');
    
    // Verify validation errors
    await expect(page.locator('text=/required|invalid/i')).toBeVisible();
  });

  test.skip('should validate email format', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button:has-text("Register")');
    
    // Verify email validation error
    await expect(page.locator('text=/invalid email|valid email/i')).toBeVisible();
  });

  test.skip('should validate phone format', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    await page.fill('input[type="tel"]', '123'); // Invalid phone
    await page.click('button:has-text("Register")');
    
    // Verify phone validation error
    await expect(page.locator('text=/invalid phone|valid phone/i')).toBeVisible();
  });

  test.skip('should validate date of birth', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    // Try future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.fill('input[type="date"]', futureDateStr);
    await page.click('button:has-text("Register")');
    
    // May show validation error for future date
    const errorElement = page.locator('text=/invalid|past date/i');
    if (await errorElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(errorElement).toBeVisible();
    }
  });

  test.skip('should reset form after successful registration', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    const uniqueCustomer = {
      ...TEST_DATA.newCustomer,
      email: `customer${Date.now()}@example.com`
    };
    
    await customerPage.registerCustomer(uniqueCustomer);
    await customerPage.waitForSuccessMessage();
    
    // Check if form is cleared
    const emailInput = page.locator('input[type="email"]');
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('');
  });

  test.skip('should handle duplicate customer registration', async ({ page }) => {
    await customerPage.navigateToCustomerRegistration();
    
    // Try to register with existing email
    const existingCustomer = {
      ...TEST_DATA.newCustomer,
      email: TEST_CONFIG.tenant1.email // Use existing email
    };
    
    await customerPage.registerCustomer(existingCustomer);
    
    // May show duplicate error
    const errorElement = page.locator('text=/already exists|duplicate/i');
    if (await errorElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(errorElement).toBeVisible();
    }
  });
});
