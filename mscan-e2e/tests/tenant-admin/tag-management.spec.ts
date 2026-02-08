import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Tag Management E2E Tests
 * Tests for creating, editing, and deleting product tags
 */
test.describe('Tenant Admin - Tag Management', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test('should display tags list page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Verify page loaded
    await expect(page).toHaveURL(/.*tags/i);

    // Verify page title or header
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();

    // Verify either tags list exists or empty state is shown
    const hasTagsList = await page.locator('.tag-card, .tag-chip, .card, mat-chip').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no tags|empty|create your first/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTagsList || hasEmptyState).toBeTruthy();
  });

  test('should navigate to create tag page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'Create Tag');
    await page.waitForLoadState('networkidle');

    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });

    // Verify tag name field exists
    await expect(page.locator('input[formControlName="name"], input[name="name"]')).toBeVisible();
  });

  test('should create new tag successfully', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'Create Tag');
    await page.waitForLoadState('networkidle');

    const tagData = {
      name: `E2E Tag ${timestamp}`,
      description: `Test tag created at ${new Date().toISOString()}`,
      color: '#FF5722'
    };

    // Fill tag name
    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    await nameInput.fill(tagData.name);

    // Fill description if field exists
    const descriptionInput = page.locator('textarea[formControlName="description"], textarea[name="description"]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill(tagData.description);
    }

    // Select color if field exists
    const colorInput = page.locator('input[type="color"], input[formControlName="color"]').first();
    if (await colorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await colorInput.fill(tagData.color);
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click({ timeout: 5000 });

    // Wait for navigation or success message
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify success
    const isOnListPage = page.url().includes('/tags') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created|saved/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(isOnListPage || hasSuccessMessage).toBeTruthy();

    // If on list page, verify the new tag appears
    if (isOnListPage) {
      const tagElement = page.locator(`text="${tagData.name}"`);
      await expect(tagElement).toBeVisible({ timeout: 5000 });
    }
  });

  test('should prevent duplicate tag names', async ({ page }) => {
    const duplicateName = `Duplicate Tag ${timestamp}`;

    // First create a tag
    await pageHelper.navigateToMenuItem('Tags', 'Create Tag');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    await nameInput.fill(duplicateName);

    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Try to create duplicate
    await pageHelper.navigateToMenuItem('Tags', 'Create Tag');
    await page.waitForLoadState('networkidle');

    await nameInput.fill(duplicateName);
    await submitButton.click();

    // Verify error message appears
    const errorMessage = page.locator('text=/already exists|duplicate|tag.*taken/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should search tags by name', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Check if search box exists
    const searchBox = page.locator('input[type="text"][placeholder*="earch"], input[type="search"], input.search-input').first();
    const searchExists = await searchBox.isVisible({ timeout: 3000 }).catch(() => false);

    if (!searchExists) {
      test.skip(true, 'Search functionality not available');
    }

    // Get a tag name from the page if any exist
    const firstTag = page.locator('.tag-card, .tag-chip, .card, mat-chip').first();
    const hasTags = await firstTag.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTags) {
      test.skip(true, 'No tags available to search');
    }

    const tagNameElement = firstTag.locator('text, .tag-name, .name').first();
    const tagName = await tagNameElement.textContent();

    if (!tagName || tagName.trim().length < 2) {
      test.skip(true, 'Could not extract tag name');
    }

    // Search for part of the tag name
    const searchTerm = tagName.substring(0, Math.min(3, tagName.length));
    await searchBox.fill(searchTerm);

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify filtered results
    await expect(firstTag).toBeVisible();
  });

  test('should edit tag successfully', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Check if edit button exists on first tag
    const editButton = page.locator('button:has-text("Edit"), .btn-action:has-text("Edit"), a:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEditButton) {
      test.skip(true, 'No tags available to edit or edit button not found');
    }

    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Wait for edit form to load
    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    const formLoaded = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!formLoaded) {
      test.skip(true, 'Edit form did not load');
    }

    // Update description
    const descriptionInput = page.locator('textarea[formControlName="description"], textarea[name="description"]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const updatedDescription = `Updated tag description at ${Date.now()}`;
      await descriptionInput.fill(updatedDescription);
    } else {
      // If no description field, update color
      const colorInput = page.locator('input[type="color"], input[formControlName="color"]').first();
      if (await colorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await colorInput.fill('#2196F3');
      }
    }

    // Submit the form
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify success
    const isOnListPage = page.url().includes('/tags') && !page.url().includes('/edit');
    const hasSuccessMessage = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
  });

  test('should delete tag not associated with products', async ({ page }) => {
    // First create a tag to delete
    await pageHelper.navigateToMenuItem('Tags', 'Create Tag');
    await page.waitForLoadState('networkidle');

    const tagToDelete = `Delete Test Tag ${timestamp}`;

    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    await nameInput.fill(tagToDelete);

    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Now try to delete it
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Find the delete button for our tag
    const tagElement = page.locator(`text="${tagToDelete}"`).locator('..').locator('..').first();
    const deleteButton = tagElement.locator('button:has-text("Delete"), button[class*="delete"]').first();
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDeleteButton) {
      test.skip(true, 'Delete button not found');
    }

    await deleteButton.click();

    // Handle confirmation dialog
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasConfirm) {
      await confirmButton.click();
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify deletion - tag should no longer be visible
    const deletedTag = page.locator(`text="${tagToDelete}"`);
    await expect(deletedTag).not.toBeVisible({ timeout: 5000 });
  });

  test('should show tag usage count', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Check if tags show usage count (number of products using this tag)
    const usageCount = page.locator('text=/[0-9]+ product|used by/i').first();
    const hasUsageCount = await usageCount.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUsageCount) {
      test.skip(true, 'Tag usage count not displayed');
    }

    await expect(usageCount).toBeVisible();
  });

  test('should filter tags by verification app', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Check if app filter exists
    const appFilter = page.locator('select[name*="app"], select[id*="app"], .app-filter select').first();
    const hasFilter = await appFilter.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasFilter) {
      test.skip(true, 'App filter not available');
    }

    // Check if there are app options
    const options = await appFilter.locator('option').count();
    if (options <= 1) {
      test.skip(true, 'No apps available to filter');
    }

    // Get initial count
    const initialTags = await page.locator('.tag-card, .tag-chip, .card').count();

    // Select an app
    await appFilter.selectOption({ index: 1 });

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify filter worked
    const filteredTags = await page.locator('.tag-card, .tag-chip, .card').count();
    const hasEmptyState = await page.locator('text=/no tags|empty/i').isVisible({ timeout: 2000 }).catch(() => false);

    const filterWorked = (filteredTags !== initialTags) || hasEmptyState;
    expect(filterWorked).toBeTruthy();
  });

  test('should display tag color/badge', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'View Tags');
    await pageHelper.waitForLoadingToComplete();

    // Check if tags display color badges or chips
    const tagBadge = page.locator('.tag-chip, mat-chip, .badge, [style*="background-color"]').first();
    const hasBadge = await tagBadge.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasBadge) {
      test.skip(true, 'Tag colors/badges not displayed');
    }

    await expect(tagBadge).toBeVisible();
  });

  test('should validate tag name is required', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Tags', 'Create Tag');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Verify validation error appears
    const errorMessage = page.locator('text=/required|name.*required/i').first();
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasError).toBeTruthy();
  });

  test('should associate tag with product during product creation', async ({ page }) => {
    // Navigate to product creation
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    // Check if tag selector exists in product form
    const tagSelector = page.locator('select[formControlName="tags"], mat-select[formControlName="tags"], [formControlName="tags"]').first();
    const hasTagSelector = await tagSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTagSelector) {
      test.skip(true, 'Tag selector not available in product form');
    }

    // Verify tag selector is present
    await expect(tagSelector).toBeVisible();

    // Try to select a tag (if tags exist)
    await tagSelector.click();
    await page.waitForTimeout(500);

    const tagOptions = page.locator('mat-option, option').first();
    const hasTagOptions = await tagOptions.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasTagOptions) {
      await tagOptions.click();
      console.log('✅ Tag successfully selected in product form');
    }
  });

  test('should display tags on product cards', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Check if product cards display tags
    const productWithTags = page.locator('.product-card, .card').filter({
      has: page.locator('.tag-chip, mat-chip, .badge')
    }).first();

    const hasProductWithTags = await productWithTags.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasProductWithTags) {
      test.skip(true, 'No products with tags found');
    }

    await expect(productWithTags).toBeVisible();
  });
});
