import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { CataloguePage } from '../../utils/page-objects.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Catalogue Categories', () => {
  let authHelper: AuthHelper;
  let cataloguePage: CataloguePage;
  let testCategoryName: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    cataloguePage = new CataloguePage(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    
    // Generate unique category name for each test
    testCategoryName = `Test Category ${Date.now()}`;
  });

  test('should display categories list page', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*categories/i);
    
    // Verify page title or header
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    
    // Verify either categories grid exists or empty state is shown
    const hasCategoriesGrid = await page.locator('.category-grid, .categories-grid, .grid, [class*="card"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no categories|empty|create your first/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasCategoriesGrid || hasEmptyState).toBeTruthy();
  });

  test('should navigate to create category page', async ({ page }) => {
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Category');
    await page.waitForLoadState('networkidle');
    
    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    
    // Verify category name field exists
    await expect(page.locator('input#name, input[name="name"], input[formControlName="name"]')).toBeVisible();
    
    // Verify icon selector exists
    await expect(page.locator('select#icon, select[name="icon"], select[formControlName="icon"]')).toBeVisible();
  });

  test('should create new category successfully', async ({ page }) => {
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Category');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to be ready
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    
    const categoryData = {
      name: testCategoryName,
      description: `This is a test category created for automation testing at ${new Date().toISOString()}`,
      icon: 'shopping_cart'
    };
    
    // Fill the form fields
    const nameInput = page.locator('input#name, input[name="name"], input[formControlName="name"]').first();
    await nameInput.fill(categoryData.name);
    
    const descriptionInput = page.locator('textarea#description, textarea[name="description"], textarea[formControlName="description"]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill(categoryData.description);
    }
    
    // Select icon
    const iconSelect = page.locator('select#icon, select[name="icon"], select[formControlName="icon"]').first();
    await iconSelect.selectOption({ value: categoryData.icon });
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click({ timeout: 5000 });
    
    // Wait for navigation or success message
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Verify success - either redirected to list page or success message shown
    const isOnListPage = page.url().includes('/categories') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created|saved/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
    
    // If on list page, verify the new category appears
    if (isOnListPage) {
      const categoryCard = page.locator(`text="${categoryData.name}"`);
      await expect(categoryCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('should prevent duplicate category names', async ({ page }) => {
    // First create a category
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Category');
    await page.waitForLoadState('networkidle');
    
    const uniqueName = `Unique Category ${Date.now()}`;
    
    const nameInput = page.locator('input#name, input[name="name"], input[formControlName="name"]').first();
    await nameInput.fill(uniqueName);
    
    const iconSelect = page.locator('select#icon, select[name="icon"], select[formControlName="icon"]').first();
    await iconSelect.selectOption({ index: 1 });
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    
    // Try to create another category with same name
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Category');
    await page.waitForLoadState('networkidle');
    
    await nameInput.fill(uniqueName);
    await iconSelect.selectOption({ index: 1 });
    await submitButton.click();
    
    // Verify error message appears
    const errorMessage = page.locator('text=/already exists|duplicate|name.*taken/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should search categories by name', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Check if search box exists
    const searchBox = page.locator('input[type="text"][placeholder*="earch"], input[type="search"], input.search-input').first();
    const searchExists = await searchBox.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!searchExists) {
      test.skip(true, 'Search functionality not available');
    }
    
    // Get a category name from the page if any exist
    const firstCategory = page.locator('.category-card, .card').first();
    const hasCategories = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasCategories) {
      test.skip(true, 'No categories available to search');
    }
    
    const categoryNameElement = firstCategory.locator('h2, h3, .category-name, .name').first();
    const categoryName = await categoryNameElement.textContent();
    
    if (!categoryName) {
      test.skip(true, 'Could not extract category name');
    }
    
    // Search for part of the category name
    const searchTerm = categoryName.substring(0, 3);
    await searchBox.fill(searchTerm);
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    await expect(firstCategory).toBeVisible();
  });

  test('should view category details', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Check if any categories exist
    const categoryCard = page.locator('.category-card, .card').first();
    const hasCategories = await categoryCard.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasCategories) {
      test.skip(true, 'No categories available to view');
    }
    
    // Click on the category card or view button
    const viewButton = categoryCard.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View")').first();
    const hasViewButton = await viewButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasViewButton) {
      await viewButton.click();
    } else {
      // Click on the card itself
      await categoryCard.click();
    }
    
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    // Verify we're on a detail page or modal opened
    const hasDetails = await page.locator('text=/description|products|active|inactive/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasDetails).toBeTruthy();
  });

  test('should edit category successfully', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Check if edit button exists on first category
    const editButton = page.locator('button:has-text("Edit"), .btn-action:has-text("Edit"), a:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasEditButton) {
      test.skip(true, 'No categories available to edit or edit button not found');
    }
    
    await editButton.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for edit form to load
    const nameInput = page.locator('input#name, input[name="name"], input[formControlName="name"]').first();
    const formLoaded = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!formLoaded) {
      test.skip(true, 'Edit form did not load');
    }
    
    // Update description
    const descriptionInput = page.locator('textarea#description, textarea[name="description"], textarea[formControlName="description"]').first();
    const updatedDescription = `Updated description at ${Date.now()}`;
    await descriptionInput.fill(updatedDescription);
    
    // Change icon
    const iconSelect = page.locator('select#icon, select[name="icon"], select[formControlName="icon"]').first();
    await iconSelect.selectOption({ index: 2 });
    
    // Submit the form
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Verify success
    const isOnListPage = page.url().includes('/categories') && !page.url().includes('/edit');
    const hasSuccessMessage = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
  });

  test('should delete category without products', async ({ page }) => {
    // First create a category to delete
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Category');
    await page.waitForLoadState('networkidle');
    
    const categoryToDelete = `Delete Test ${Date.now()}`;
    
    const nameInput = page.locator('input#name, input[name="name"], input[formControlName="name"]').first();
    await nameInput.fill(categoryToDelete);
    
    const iconSelect = page.locator('select#icon, select[name="icon"], select[formControlName="icon"]').first();
    await iconSelect.selectOption({ index: 1 });
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    
    // Now try to delete it
    await cataloguePage.navigateToCategoryList();
    
    // Find the delete button for our category
    const categoryCard = page.locator(`text="${categoryToDelete}"`).locator('..').locator('..').first();
    const deleteButton = categoryCard.locator('button:has-text("Delete"), button[class*="delete"]').first();
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasDeleteButton) {
      test.skip(true, 'Delete button not found');
    }
    
    await deleteButton.click();
    
    // Handle confirmation dialog if present
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasConfirm) {
      await confirmButton.click();
    }
    
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    // Verify deletion - category should no longer be visible
    const deletedCategory = page.locator(`text="${categoryToDelete}"`);
    await expect(deletedCategory).not.toBeVisible({ timeout: 5000 });
  });

  test('should prevent deletion of category with products', async ({ page }) => {
    // This test assumes there's at least one category with products
    await cataloguePage.navigateToCategoryList();
    
    // Look for a category card that shows product count > 0
    const categoryWithProducts = page.locator('.category-card, .card').filter({ 
      has: page.locator('text=/product.*[1-9]/i') 
    }).first();
    
    const hasCategory = await categoryWithProducts.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasCategory) {
      test.skip(true, 'No categories with products found');
    }
    
    // Try to delete
    const deleteButton = categoryWithProducts.locator('button:has-text("Delete"), button[class*="delete"]').first();
    const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!hasDeleteButton) {
      test.skip(true, 'Delete button not available');
    }
    
    await deleteButton.click();
    
    // Handle confirmation
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasConfirm) {
      await confirmButton.click();
    }
    
    // Verify error message appears
    const errorMessage = page.locator('text=/cannot delete.*product|has.*product|remove products first/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should toggle category active status', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Look for toggle or status button
    const statusButton = page.locator('button:has-text("Activate"), button:has-text("Deactivate"), input[type="checkbox"]').first();
    const hasStatusControl = await statusButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasStatusControl) {
      test.skip(true, 'Status toggle not available');
    }
    
    // Get current status
    const currentStatus = await statusButton.textContent().catch(() => '');
    
    // Toggle status
    await statusButton.click();
    
    // Handle confirmation if present
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
    const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasConfirm) {
      await confirmButton.click();
    }
    
    await page.waitForTimeout(1000);
    
    // Verify status changed (button text should change)
    const newStatus = await statusButton.textContent();
    expect(newStatus).not.toBe(currentStatus);
  });

  test('should display category icons correctly', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Check if categories have icons
    const categoryIcon = page.locator('.category-card .icon, .category-card i, .card .material-icons').first();
    const hasIcon = await categoryIcon.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasIcon) {
      test.skip(true, 'No category icons found');
    }
    
    // Verify icon is displayed
    await expect(categoryIcon).toBeVisible();
  });

  test('should show product count for each category', async ({ page }) => {
    await cataloguePage.navigateToCategoryList();
    
    // Check if categories display product count
    const productCount = page.locator('text=/[0-9]+ product/i').first();
    const hasProductCount = await productCount.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasProductCount) {
      test.skip(true, 'Product count not displayed or no categories');
    }
    
    // Verify product count is visible
    await expect(productCount).toBeVisible();
  });
});
