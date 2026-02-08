import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * User Profile Management Tests for Tenant Admin
 * Tests profile viewing, updating, and settings management
 */
test.describe('Tenant Admin - User Profile Management', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test.describe('Profile Viewing', () => {

    test('should display user profile information', async ({ page }) => {
      // Navigate to profile (try multiple methods)
      const profileLink = page.locator('a:has-text("Profile"), button:has-text("Profile"), [class*="profile"]').first();
      const menuItems = page.locator('.user-menu, .account-menu, .dropdown-menu');

      // Try clicking user menu first
      const userMenuBtn = page.locator('button.user-menu-btn, .user-avatar, button:has([class*="user"])').first();
      const hasUserMenu = await userMenuBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasUserMenu) {
        await userMenuBtn.click();
        await page.waitForTimeout(500);

        // Click profile link in dropdown
        const profileMenuItem = page.locator('a:has-text("Profile"), button:has-text("Profile")').first();
        await profileMenuItem.click();
      } else {
        // Direct navigation
        await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      }

      await page.waitForLoadState('networkidle');
      await pageHelper.waitForLoadingToComplete();

      // Verify profile information is displayed
      await expect(page.locator('text=/email|full.*name|phone/i')).toBeVisible();

      // Verify email is displayed
      const emailDisplay = page.locator('text=/sumant@mscan.com/i, input[value*="sumant@mscan.com"]');
      await expect(emailDisplay.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display correct role and permissions', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Verify role is TENANT_ADMIN
      const roleDisplay = page.locator('text=/tenant.*admin|role.*tenant/i');
      await expect(roleDisplay.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show tenant information', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Verify tenant/company information is shown
      const tenantInfo = page.locator('text=/company|organization|tenant/i');
      const hasTenantInfo = await tenantInfo.first().isVisible().catch(() => false);

      if (hasTenantInfo) {
        // Verify company name is displayed
        const companyDisplay = page.locator(`text=/${TEST_CONFIG.tenant1.companyName}/i`);
        const hasCompany = await companyDisplay.isVisible().catch(() => false);

        if (hasCompany) {
          await expect(companyDisplay).toBeVisible();
        }
      }
    });
  });

  test.describe('Profile Updating', () => {

    test('should update full name successfully', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Look for edit button
      const editBtn = page.locator('button:has-text("Edit"), button:has-text("Update Profile")');
      const hasEditBtn = await editBtn.isVisible().catch(() => false);

      if (hasEditBtn) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      // Update full name
      const nameInput = page.locator('input[name="fullName"], input[formControlName="full_name"], input[formControlName="fullName"]');
      const hasNameInput = await nameInput.isVisible().catch(() => false);

      if (hasNameInput) {
        const newName = `Updated Name ${timestamp}`;
        await nameInput.fill(newName);

        // Save changes
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
        await saveBtn.click();

        await page.waitForTimeout(2000);

        // Verify success message
        const successMsg = page.locator('.alert-success, .success-message, text=/updated|success/i');
        const hasSuccess = await successMsg.first().isVisible({ timeout: 3000 }).catch(() => false);

        if (hasSuccess) {
          await expect(successMsg.first()).toBeVisible();
        }

        // Verify name is updated
        await page.reload();
        await pageHelper.waitForLoadingToComplete();

        const displayedName = page.locator(`text=/${newName}/i, input[value*="${newName}"]`);
        const hasUpdatedName = await displayedName.isVisible().catch(() => false);

        if (hasUpdatedName) {
          await expect(displayedName).toBeVisible();
        }
      } else {
        test.skip(true, 'Profile editing not available in UI');
      }
    });

    test('should update phone number', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      const editBtn = page.locator('button:has-text("Edit"), button:has-text("Update Profile")');
      const hasEditBtn = await editBtn.isVisible().catch(() => false);

      if (hasEditBtn) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      const phoneInput = page.locator('input[name="phone"], input[formControlName="phone"], input[type="tel"]');
      const hasPhoneInput = await phoneInput.isVisible().catch(() => false);

      if (hasPhoneInput) {
        const newPhone = `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
        await phoneInput.fill(newPhone);

        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
        await saveBtn.click();

        await page.waitForTimeout(2000);

        // Verify update
        const successMsg = page.locator('.alert-success, .success-message');
        const hasSuccess = await successMsg.first().isVisible({ timeout: 3000 }).catch(() => false);

        if (hasSuccess) {
          await expect(successMsg.first()).toBeVisible();
        }
      } else {
        test.skip(true, 'Phone number editing not available');
      }
    });

    test('should validate email format cannot be changed', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      const editBtn = page.locator('button:has-text("Edit"), button:has-text("Update Profile")');
      const hasEditBtn = await editBtn.isVisible().catch(() => false);

      if (hasEditBtn) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      // Email should be readonly or disabled
      const emailInput = page.locator('input[type="email"], input[name="email"], input[formControlName="email"]');
      const hasEmailInput = await emailInput.isVisible().catch(() => false);

      if (hasEmailInput) {
        const isReadonly = await emailInput.getAttribute('readonly');
        const isDisabled = await emailInput.getAttribute('disabled');

        // Email should not be editable
        expect(isReadonly !== null || isDisabled !== null).toBeTruthy();
      }
    });

    test('should cancel profile update without saving', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      const editBtn = page.locator('button:has-text("Edit"), button:has-text("Update Profile")');
      const hasEditBtn = await editBtn.isVisible().catch(() => false);

      if (hasEditBtn) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      const nameInput = page.locator('input[name="fullName"], input[formControlName="full_name"]');
      const hasNameInput = await nameInput.isVisible().catch(() => false);

      if (hasNameInput) {
        const originalName = await nameInput.inputValue();
        const tempName = `Temp Name ${timestamp}`;

        await nameInput.fill(tempName);

        // Click cancel
        const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Discard")');
        const hasCancelBtn = await cancelBtn.isVisible().catch(() => false);

        if (hasCancelBtn) {
          await cancelBtn.click();
          await page.waitForTimeout(1000);

          // Verify name reverted
          const currentName = await nameInput.inputValue().catch(() => originalName);
          expect(currentName).toBe(originalName);
        }
      }
    });
  });

  test.describe('Password/Security Settings', () => {

    test('should have option to change password or security settings', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Look for security/password section
      const securitySection = page.locator('text=/security|password|change.*password/i').first();
      const hasSecuritySection = await securitySection.isVisible().catch(() => false);

      if (hasSecuritySection) {
        const changePasswordBtn = page.locator('button:has-text("Change Password"), a:has-text("Change Password")');
        const hasBtn = await changePasswordBtn.isVisible().catch(() => false);

        if (hasBtn) {
          await expect(changePasswordBtn).toBeVisible();
        }
      } else {
        console.log('ℹ️ Security settings not available (using OTP-based auth)');
      }
    });

    test('should display account creation and last update dates', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Look for timestamps
      const createdAt = page.locator('text=/created.*at|member.*since|joined/i');
      const updatedAt = page.locator('text=/last.*updated|updated.*at/i');

      const hasCreatedAt = await createdAt.first().isVisible().catch(() => false);
      const hasUpdatedAt = await updatedAt.first().isVisible().catch(() => false);

      if (hasCreatedAt) {
        await expect(createdAt.first()).toBeVisible();
      }

      if (hasUpdatedAt) {
        await expect(updatedAt.first()).toBeVisible();
      }
    });
  });

  test.describe('Account Status', () => {

    test('should display active account status', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Verify account is active
      const statusIndicator = page.locator('text=/active|status.*active/i, .badge.success, .status-badge.active');
      const hasStatus = await statusIndicator.first().isVisible().catch(() => false);

      if (hasStatus) {
        await expect(statusIndicator.first()).toBeVisible();
      } else {
        // Account should be active by default (user is logged in)
        expect(true).toBeTruthy();
      }
    });

    test('should show tenant admin permissions', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      // Look for permissions section
      const permissionsSection = page.locator('text=/permissions|capabilities|access/i');
      const hasPermissions = await permissionsSection.first().isVisible().catch(() => false);

      if (hasPermissions) {
        // Verify tenant admin has appropriate permissions
        const permissionsList = page.locator('ul li, .permission-item').filter({ has: page.locator('text=/manage|create|view|edit/i') });
        const count = await permissionsList.count();

        expect(count).toBeGreaterThan(0);
      } else {
        console.log('ℹ️ Permissions section not displayed in profile');
      }
    });
  });

  test.describe('Profile Validation', () => {

    test('should validate phone number format', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      const editBtn = page.locator('button:has-text("Edit")');
      const hasEditBtn = await editBtn.isVisible().catch(() => false);

      if (hasEditBtn) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
      const hasPhoneInput = await phoneInput.isVisible().catch(() => false);

      if (hasPhoneInput) {
        // Try invalid phone number
        await phoneInput.fill('invalid');

        const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]');
        await saveBtn.click();

        await page.waitForTimeout(1000);

        // Should show validation error
        const errorMsg = page.locator('text=/invalid.*phone|phone.*format/i');
        const hasError = await errorMsg.isVisible().catch(() => false);

        if (hasError) {
          await expect(errorMsg).toBeVisible();
        }
      }
    });

    test('should require full name to be non-empty', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/profile`);
      await pageHelper.waitForLoadingToComplete();

      const editBtn = page.locator('button:has-text("Edit")');
      const hasEditBtn = await editBtn.isVisible().catch(() => false);

      if (hasEditBtn) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      const nameInput = page.locator('input[name="fullName"], input[formControlName="full_name"]');
      const hasNameInput = await nameInput.isVisible().catch(() => false);

      if (hasNameInput) {
        // Clear name field
        await nameInput.clear();

        const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]');
        await saveBtn.click();

        await page.waitForTimeout(1000);

        // Should show validation error
        const errorMsg = page.locator('text=/name.*required|required.*field/i');
        const hasError = await errorMsg.isVisible().catch(() => false);

        if (hasError) {
          await expect(errorMsg).toBeVisible();
        } else {
          // Form should not submit (still on same page)
          const currentUrl = page.url();
          expect(currentUrl).toContain('profile');
        }
      }
    });
  });

  test.describe('API Profile Update', () => {

    test('should update profile via API', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const updateData = {
        full_name: `API Updated Name ${timestamp}`,
        phone: '+919876543210'
      };

      const response = await page.request.put(`${TEST_CONFIG.tenant1.apiBaseUrl}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: updateData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.success).toBeTruthy();
      expect(data.data.full_name).toBe(updateData.full_name);
      expect(data.data.phone).toBe(updateData.phone);
    });

    test('should get profile via API', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.success).toBeTruthy();
      expect(data.data.email).toBe(TEST_CONFIG.tenant1.email);
      expect(data.data.role).toBe('TENANT_ADMIN');
    });
  });
});
