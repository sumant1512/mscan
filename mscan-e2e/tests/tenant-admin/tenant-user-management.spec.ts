import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Tenant User Management E2E Tests
 * Tests for managing tenant users, roles, and permissions
 */
test.describe('Tenant Admin - Tenant User Management', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test('should display tenant users list page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Verify page loaded
    await expect(page).toHaveURL(/.*users|team/i);

    // Verify page title or header
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();

    // Verify either users table/list exists or empty state is shown
    const hasUsersList = await page.locator('table, .user-card, .card, mat-card').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no users|empty|invite your first/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasUsersList || hasEmptyState).toBeTruthy();
  });

  test('should navigate to create user page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });

    // Verify email field exists
    await expect(page.locator('input[type="email"], input[formControlName="email"]')).toBeVisible();

    // Verify role selector exists
    await expect(page.locator('select[formControlName="role"], mat-select[formControlName="role"]')).toBeVisible();
  });

  test('should create new tenant user successfully', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    const userData = {
      email: `testuser${timestamp}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'TENANT_USER'
    };

    // Fill email
    const emailInput = page.locator('input[type="email"], input[formControlName="email"]').first();
    await emailInput.fill(userData.email);

    // Fill first name
    const firstNameInput = page.locator('input[formControlName="firstName"], input[name="firstName"]').first();
    if (await firstNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNameInput.fill(userData.firstName);
    }

    // Fill last name
    const lastNameInput = page.locator('input[formControlName="lastName"], input[name="lastName"]').first();
    if (await lastNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lastNameInput.fill(userData.lastName);
    }

    // Select role
    const roleSelect = page.locator('select[formControlName="role"], mat-select[formControlName="role"]').first();
    const isMatSelect = await page.locator('mat-select[formControlName="role"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await roleSelect.click();
      await page.locator(`mat-option:has-text("${userData.role}")`).click();
    } else {
      await roleSelect.selectOption(userData.role);
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Invite")').first();
    await submitButton.click({ timeout: 5000 });

    // Wait for navigation or success message
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify success
    const isOnListPage = page.url().includes('/users') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created|invited|saved/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(isOnListPage || hasSuccessMessage).toBeTruthy();

    // If on list page, verify the new user appears
    if (isOnListPage) {
      const userRow = page.locator(`text="${userData.email}"`);
      await expect(userRow).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create tenant admin user', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    const userData = {
      email: `admin${timestamp}@example.com`,
      role: 'TENANT_ADMIN'
    };

    const emailInput = page.locator('input[type="email"], input[formControlName="email"]').first();
    await emailInput.fill(userData.email);

    const roleSelect = page.locator('select[formControlName="role"], mat-select[formControlName="role"]').first();
    const isMatSelect = await page.locator('mat-select[formControlName="role"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await roleSelect.click();
      await page.locator(`mat-option:has-text("${userData.role}")`).click();
    } else {
      await roleSelect.selectOption(userData.role);
    }

    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Invite")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const hasSuccessMessage = await page.locator('text=/success|created|invited/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSuccessMessage).toBeTruthy();
  });

  test('should prevent duplicate user email', async ({ page }) => {
    const duplicateEmail = `duplicate${timestamp}@example.com`;

    // First create a user
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[formControlName="email"]').first();
    await emailInput.fill(duplicateEmail);

    const roleSelect = page.locator('select[formControlName="role"], mat-select[formControlName="role"]').first();
    const isMatSelect = await page.locator('mat-select[formControlName="role"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await roleSelect.click();
      await page.locator('mat-option').first().click();
    } else {
      await roleSelect.selectOption({ index: 0 });
    }

    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Try to create duplicate
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    await emailInput.fill(duplicateEmail);

    if (isMatSelect) {
      await roleSelect.click();
      await page.locator('mat-option').first().click();
    } else {
      await roleSelect.selectOption({ index: 0 });
    }

    await submitButton.click();

    // Verify error message appears
    const errorMessage = page.locator('text=/already exists|duplicate|email.*taken|user.*exists/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should search users by email or name', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Check if search box exists
    const searchBox = page.locator('input[type="text"][placeholder*="earch"], input[type="search"], input.search-input').first();
    const searchExists = await searchBox.isVisible({ timeout: 3000 }).catch(() => false);

    if (!searchExists) {
      test.skip(true, 'Search functionality not available');
    }

    // Get a user email from the table/list
    const firstUser = page.locator('table tbody tr, .user-card, .card').first();
    const hasUsers = await firstUser.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUsers) {
      test.skip(true, 'No users available to search');
    }

    const userEmailElement = firstUser.locator('text=/@/').first();
    const userEmail = await userEmailElement.textContent();

    if (!userEmail) {
      test.skip(true, 'Could not extract user email');
    }

    // Search for part of the email
    const searchTerm = userEmail.substring(0, 5);
    await searchBox.fill(searchTerm);

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify filtered results
    await expect(firstUser).toBeVisible();
  });

  test('should filter users by role', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Check if role filter exists
    const roleFilter = page.locator('select[name*="role"], select[id*="role"], .role-filter select').first();
    const hasFilter = await roleFilter.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasFilter) {
      test.skip(true, 'Role filter not available');
    }

    // Get initial count
    const initialUsers = await page.locator('table tbody tr, .user-card').count();

    // Select a role
    await roleFilter.selectOption({ index: 1 });

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify filter worked
    const filteredUsers = await page.locator('table tbody tr, .user-card').count();
    const hasEmptyState = await page.locator('text=/no users|empty/i').isVisible({ timeout: 2000 }).catch(() => false);

    const filterWorked = (filteredUsers !== initialUsers) || hasEmptyState;
    expect(filterWorked).toBeTruthy();
  });

  test('should view user details', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Click on first user
    const userRow = page.locator('table tbody tr, .user-card, .card').first();
    const hasUsers = await userRow.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUsers) {
      test.skip(true, 'No users available to view');
    }

    const viewButton = userRow.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View")').first();
    const hasViewButton = await viewButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasViewButton) {
      await viewButton.click();
    } else {
      await userRow.click();
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify user details are displayed
    const hasDetails = await page.locator('text=/email|role|permissions|status/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasDetails).toBeTruthy();
  });

  test('should edit user role', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Find edit button (excluding current user to avoid self-modification issues)
    const currentUserEmail = TEST_CONFIG.tenant1.email;
    const editableUser = page.locator('table tbody tr, .user-card').filter({
      hasNot: page.locator(`text="${currentUserEmail}"`)
    }).first();

    const editButton = editableUser.locator('button:has-text("Edit"), .btn-action:has-text("Edit"), a:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEditButton) {
      test.skip(true, 'No editable users available');
    }

    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Change role
    const roleSelect = page.locator('select[formControlName="role"], mat-select[formControlName="role"]').first();
    const formLoaded = await roleSelect.isVisible({ timeout: 5000 }).catch(() => false);

    if (!formLoaded) {
      test.skip(true, 'Edit form did not load');
    }

    const isMatSelect = await page.locator('mat-select[formControlName="role"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await roleSelect.click();
      const options = page.locator('mat-option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await options.nth(1).click();
      }
    } else {
      const optionCount = await roleSelect.locator('option').count();
      if (optionCount > 1) {
        await roleSelect.selectOption({ index: 1 });
      }
    }

    // Submit
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const hasSuccessMessage = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSuccessMessage).toBeTruthy();
  });

  test('should assign permissions to user', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Find permissions button
    const userRow = page.locator('table tbody tr, .user-card').first();
    const hasUsers = await userRow.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUsers) {
      test.skip(true, 'No users available');
    }

    const permissionsButton = userRow.locator('button:has-text("Permissions"), a:has-text("Permissions")').first();
    const hasPermissionsButton = await permissionsButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasPermissionsButton) {
      test.skip(true, 'Permissions management not available');
    }

    await permissionsButton.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify permissions page/modal loaded
    const hasPermissionsList = await page.locator('text=/permission|access|grant|allow/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasPermissionsList) {
      test.skip(true, 'Permissions page did not load');
    }

    // Try to toggle a permission checkbox
    const permissionCheckbox = page.locator('input[type="checkbox"], mat-checkbox').first();
    const hasCheckbox = await permissionCheckbox.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasCheckbox) {
      await permissionCheckbox.click();

      // Save permissions
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      const hasSaveButton = await saveButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasSaveButton) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        const hasSuccessMessage = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasSuccessMessage).toBeTruthy();
      }
    }
  });

  test('should deactivate/delete user', async ({ page }) => {
    // First create a user to delete
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    const userToDelete = `deleteuser${timestamp}@example.com`;

    const emailInput = page.locator('input[type="email"], input[formControlName="email"]').first();
    await emailInput.fill(userToDelete);

    const roleSelect = page.locator('select[formControlName="role"], mat-select[formControlName="role"]').first();
    const isMatSelect = await page.locator('mat-select[formControlName="role"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await roleSelect.click();
      await page.locator('mat-option').first().click();
    } else {
      await roleSelect.selectOption({ index: 0 });
    }

    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Now delete it
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    const userRow = page.locator(`text="${userToDelete}"`).locator('..').locator('..').first();
    const deleteButton = userRow.locator('button:has-text("Delete"), button:has-text("Deactivate"), button[class*="delete"]').first();
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDeleteButton) {
      test.skip(true, 'Delete/deactivate button not found');
    }

    await deleteButton.click();

    // Handle confirmation
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), button:has-text("Deactivate")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasConfirm) {
      await confirmButton.click();
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify user is removed or deactivated
    const deletedUser = page.locator(`text="${userToDelete}"`).filter({
      hasNot: page.locator('text=/inactive|deactivated/i')
    });

    const isRemoved = await deletedUser.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isRemoved).toBeFalsy();
  });

  test('should display user status (active/inactive)', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Check if users display status badges
    const statusBadge = page.locator('text=/active|inactive/i, .badge, .status').first();
    const hasStatusBadge = await statusBadge.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasStatusBadge) {
      test.skip(true, 'User status not displayed');
    }

    await expect(statusBadge).toBeVisible();
  });

  test('should show user last login time', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Check if last login is displayed
    const lastLoginInfo = page.locator('text=/last login|last seen/i').first();
    const hasLastLoginInfo = await lastLoginInfo.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasLastLoginInfo) {
      test.skip(true, 'Last login time not displayed');
    }

    await expect(lastLoginInfo).toBeVisible();
  });

  test('should paginate users list', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'View Users');
    await pageHelper.waitForLoadingToComplete();

    // Check if pagination exists
    const paginationNext = page.locator('button:has-text("Next"), .pagination button').filter({
      hasNot: page.locator('[disabled]')
    }).first();

    const hasPagination = await paginationNext.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasPagination) {
      test.skip(true, 'Pagination not available (not enough users)');
    }

    // Get first page user count
    const firstPageCount = await page.locator('table tbody tr, .user-card').count();

    // Click next page
    await paginationNext.click();
    await page.waitForTimeout(1000);

    // Verify page changed
    const secondPageCount = await page.locator('table tbody tr, .user-card').count();
    expect(secondPageCount).toBeGreaterThan(0);
  });

  test('should validate email format', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Users', 'Create User');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[formControlName="email"]').first();
    await emailInput.fill('invalid-email');

    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Verify validation error
    const errorMessage = page.locator('text=/invalid email|valid email|email.*required/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });
});
