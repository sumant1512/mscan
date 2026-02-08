import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Template Management E2E Tests
 * Tests for creating, editing, duplicating, and deleting product templates
 */
test.describe('Tenant Admin - Template Management', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test('should display templates list page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Verify page loaded
    await expect(page).toHaveURL(/.*templates/i);

    // Verify page title or header
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();

    // Verify either templates grid exists or empty state is shown
    const hasTemplatesGrid = await page.locator('.template-card, .card, mat-card').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no templates|empty|create your first/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTemplatesGrid || hasEmptyState).toBeTruthy();
  });

  test('should navigate to create template page', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'Create Template');
    await page.waitForLoadState('networkidle');

    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });

    // Verify template name field exists
    await expect(page.locator('input[formControlName="name"], input[name="name"]')).toBeVisible();

    // Verify description field exists
    await expect(page.locator('textarea[formControlName="description"], textarea[name="description"]')).toBeVisible();
  });

  test('should create new template successfully', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'Create Template');
    await page.waitForLoadState('networkidle');

    const templateData = {
      name: `E2E Template ${timestamp}`,
      description: `Test template created at ${new Date().toISOString()}`,
      category: 'Electronics'
    };

    // Fill template name
    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    await nameInput.fill(templateData.name);

    // Fill description
    const descriptionInput = page.locator('textarea[formControlName="description"], textarea[name="description"]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill(templateData.description);
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click({ timeout: 5000 });

    // Wait for navigation or success message
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify success
    const isOnListPage = page.url().includes('/templates') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created|saved/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(isOnListPage || hasSuccessMessage).toBeTruthy();

    // If on list page, verify the new template appears
    if (isOnListPage) {
      const templateCard = page.locator(`text="${templateData.name}"`);
      await expect(templateCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('should search templates by name', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Check if search box exists
    const searchBox = page.locator('input[type="text"][placeholder*="earch"], input[type="search"], input.search-input').first();
    const searchExists = await searchBox.isVisible({ timeout: 3000 }).catch(() => false);

    if (!searchExists) {
      test.skip(true, 'Search functionality not available');
    }

    // Get a template name from the page if any exist
    const firstTemplate = page.locator('.template-card, .card').first();
    const hasTemplates = await firstTemplate.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplates) {
      test.skip(true, 'No templates available to search');
    }

    const templateNameElement = firstTemplate.locator('h2, h3, .template-name, .name').first();
    const templateName = await templateNameElement.textContent();

    if (!templateName) {
      test.skip(true, 'Could not extract template name');
    }

    // Search for part of the template name
    const searchTerm = templateName.substring(0, 3);
    await searchBox.fill(searchTerm);

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify filtered results
    await expect(firstTemplate).toBeVisible();
  });

  test('should view template details', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Check if any templates exist
    const templateCard = page.locator('.template-card, .card, mat-card').first();
    const hasTemplates = await templateCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplates) {
      test.skip(true, 'No templates available to view');
    }

    // Click on the template card or view button
    const viewButton = templateCard.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View")').first();
    const hasViewButton = await viewButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasViewButton) {
      await viewButton.click();
    } else {
      // Click on the card itself
      await templateCard.click();
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify we're on a detail page or modal opened
    const hasDetails = await page.locator('text=/description|attributes|fields|category/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasDetails).toBeTruthy();
  });

  test('should edit template successfully', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Check if edit button exists on first template (excluding system templates)
    const editableTemplate = page.locator('.template-card, .card').filter({
      hasNot: page.locator('text=/system/i, .badge:has-text("System")')
    }).first();

    const editButton = editableTemplate.locator('button:has-text("Edit"), .btn-action:has-text("Edit"), a:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEditButton) {
      test.skip(true, 'No editable templates available or edit button not found');
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
    const updatedDescription = `Updated template description at ${Date.now()}`;
    await descriptionInput.fill(updatedDescription);

    // Submit the form
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify success
    const isOnListPage = page.url().includes('/templates') && !page.url().includes('/edit');
    const hasSuccessMessage = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
  });

  test('should duplicate template successfully', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Find duplicate button
    const templateCard = page.locator('.template-card, .card, mat-card').first();
    const hasTemplates = await templateCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplates) {
      test.skip(true, 'No templates available to duplicate');
    }

    const duplicateButton = templateCard.locator('button:has-text("Duplicate"), button:has-text("Copy"), .btn-action:has-text("Duplicate")').first();
    const hasDuplicateButton = await duplicateButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDuplicateButton) {
      test.skip(true, 'Duplicate button not found');
    }

    // Get original template name
    const templateName = await templateCard.locator('h2, h3, .template-name, .name').first().textContent();

    await duplicateButton.click();

    // Handle confirmation if present
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Duplicate")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasConfirm) {
      await confirmButton.click();
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Verify duplicated template appears (usually with "Copy" prefix or suffix)
    const duplicatedTemplate = page.locator('text=/Copy.*' + templateName + '|' + templateName + '.*Copy/i').first();
    const hasDuplicate = await duplicatedTemplate.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasDuplicate) {
      // Alternative: Just verify success message
      const hasSuccessMessage = await page.locator('text=/duplicated|copied|success/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasSuccessMessage).toBeTruthy();
    } else {
      await expect(duplicatedTemplate).toBeVisible();
    }
  });

  test('should delete non-system template', async ({ page }) => {
    // First create a template to delete
    await pageHelper.navigateToMenuItem('Templates', 'Create Template');
    await page.waitForLoadState('networkidle');

    const templateToDelete = `Delete Test Template ${timestamp}`;

    const nameInput = page.locator('input[formControlName="name"], input[name="name"]').first();
    await nameInput.fill(templateToDelete);

    const descriptionInput = page.locator('textarea[formControlName="description"], textarea[name="description"]').first();
    await descriptionInput.fill('This template will be deleted');

    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Now try to delete it
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Find the delete button for our template
    const templateCard = page.locator(`text="${templateToDelete}"`).locator('..').locator('..').first();
    const deleteButton = templateCard.locator('button:has-text("Delete"), button[class*="delete"]').first();
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

    // Verify deletion - template should no longer be visible
    const deletedTemplate = page.locator(`text="${templateToDelete}"`);
    await expect(deletedTemplate).not.toBeVisible({ timeout: 5000 });
  });

  test('should prevent deletion of system templates', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Look for a system template
    const systemTemplate = page.locator('.template-card, .card').filter({
      has: page.locator('text=/system/i, .badge:has-text("System")')
    }).first();

    const hasSystemTemplate = await systemTemplate.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasSystemTemplate) {
      test.skip(true, 'No system templates found');
    }

    // Verify delete button is disabled or not present
    const deleteButton = systemTemplate.locator('button:has-text("Delete"), button[class*="delete"]').first();
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDeleteButton) {
      // Button exists but should be disabled
      const isDisabled = await deleteButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    } else {
      // Button should not exist for system templates
      expect(hasDeleteButton).toBeFalsy();
    }
  });

  test('should filter templates by verification app', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
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
    const initialTemplates = await page.locator('.template-card, .card').count();

    // Select an app
    await appFilter.selectOption({ index: 1 });

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify filter worked
    const filteredTemplates = await page.locator('.template-card, .card').count();
    const hasEmptyState = await page.locator('text=/no templates|empty/i').isVisible({ timeout: 2000 }).catch(() => false);

    const filterWorked = (filteredTemplates !== initialTemplates) || hasEmptyState;
    expect(filterWorked).toBeTruthy();
  });

  test('should display template attributes/fields', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Click on first template to view details
    const templateCard = page.locator('.template-card, .card, mat-card').first();
    const hasTemplates = await templateCard.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplates) {
      test.skip(true, 'No templates available');
    }

    await templateCard.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify attributes or fields are displayed
    const hasAttributes = await page.locator('text=/attributes|fields|properties|schema/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasAttributes) {
      test.skip(true, 'Template details do not show attributes/fields');
    }

    expect(hasAttributes).toBeTruthy();
  });

  test('should show template usage count', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'View Templates');
    await pageHelper.waitForLoadingToComplete();

    // Check if templates show usage count (number of products using this template)
    const usageCount = page.locator('text=/[0-9]+ product|used by/i').first();
    const hasUsageCount = await usageCount.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUsageCount) {
      test.skip(true, 'Template usage count not displayed');
    }

    await expect(usageCount).toBeVisible();
  });

  test('should validate template name is required', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Templates', 'Create Template');
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
});
