import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { UserPage } from '../../utils/page-objects.js';
import { TEST_CONFIG, TEST_DATA } from '../../utils/test-config.js';

test.describe('Super Admin - User Management', () => {
  let authHelper: AuthHelper;
  let userPage: UserPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    userPage = new UserPage(page);
    
    // Login as super admin
    await authHelper.loginAsSuperAdmin();
  });
});
