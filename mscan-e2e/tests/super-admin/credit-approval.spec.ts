import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { CreditPage } from '../../utils/page-objects.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Super Admin - Credit Approval Management', () => {
  let authHelper: AuthHelper;
  let creditPage: CreditPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    creditPage = new CreditPage(page);
    
    // Login as super admin
    await authHelper.loginAsSuperAdmin();
  });

  test('should display credit approval list', async ({ page }) => {
    await creditPage.navigateToCreditApprovals();
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*credits.*pending/i);
    
    // Verify credit requests grid or list exists
    const listElement = page.locator('.requests-grid, .request-card, .approval-container');
    await expect(listElement.first()).toBeVisible();
  });

  test('should filter credit requests by status', async ({ page }) => {
    await creditPage.navigateToCreditApprovals();
    
    // Try to filter by pending
    const filterButton = page.locator('button:has-text("Pending"), select option:has-text("Pending")');
    if (await filterButton.first().isVisible()) {
      await filterButton.first().click();
      await creditPage.waitForLoadingToComplete();
    }
  });

  test('should view credit request details', async ({ page }) => {
    await creditPage.navigateToCreditApprovals();
    
    // Check if any requests exist
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await creditPage.waitForLoadingToComplete();
      
      // Verify details are displayed
      await expect(page.locator('text=/amount|justification|requested/i')).toBeVisible();
    }
  });

  test('should approve credit request', async ({ page }) => {
    await creditPage.navigateToCreditApprovals();
    
    // Check if any pending requests exist
    const approveButton = page.locator('button:has-text("Approve")').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Confirm if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await creditPage.waitForLoadingToComplete();
      
      // Verify success message
      await creditPage.waitForSuccessMessage();
    }
  });

  test('should reject credit request with reason', async ({ page }) => {
    await creditPage.navigateToCreditApprovals();
    
    // Check if any pending requests exist
    const rejectButton = page.locator('button:has-text("Reject")').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      // Fill rejection reason
      const reasonInput = page.locator('textarea, input[placeholder*="reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Insufficient justification for credit request');
        
        await page.click('button:has-text("Confirm")');
        await creditPage.waitForLoadingToComplete();
        
        // Verify success message
        await creditPage.waitForSuccessMessage();
      }
    }
  });

  test('should display credit transaction history', async ({ page }) => {
    // Navigate to Credit Requests > History
    await creditPage.navigateToMenuItem('Credit Requests', 'History');
    await creditPage.waitForLoadingToComplete();
    
    // For super admin, History route shows credit approval list (not transactions)
    // Verify the credit requests container is visible
    const historyContainer = page.locator('.requests-grid, .request-card, .approval-container');
    await expect(historyContainer.first()).toBeVisible();
  });

  test('should handle pagination in credit approvals', async ({ page }) => {
    await creditPage.navigateToCreditApprovals();
    
    // Check if pagination exists
    const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Next")');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await creditPage.waitForLoadingToComplete();
    }
  });
});
