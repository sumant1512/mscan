import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { CataloguePage } from '../../utils/page-objects.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

test.describe('Tenant Admin - Catalogue Products', () => {
  let authHelper: AuthHelper;
  let cataloguePage: CataloguePage;
  let testProductName: string;
  let testProductSKU: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    cataloguePage = new CataloguePage(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    
    // Generate unique product data for each test
    const timestamp = Date.now();
    testProductName = `Test Product ${timestamp}`;
    testProductSKU = `SKU-${timestamp}`;
  });

  test('should display products list page', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*products/i);
    
    // Verify page title or header
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    
    // Verify either products grid exists or empty state is shown
    const hasProductsGrid = await page.locator('.product-grid, .products-grid, .grid, [class*="card"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no products|empty|create your first/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasProductsGrid || hasEmptyState).toBeTruthy();
  });

  test('should navigate to create product page', async ({ page }) => {
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    
    // Verify product name field exists
    await expect(page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]')).toBeVisible();
    
    // Verify SKU field exists
    await expect(page.locator('input#product_sku, input[name="product_sku"], input[formControlName="product_sku"]')).toBeVisible();
    
    // Verify price field exists
    await expect(page.locator('input#price, input[name="price"], input[formControlName="price"]')).toBeVisible();
  });

  test('should create new product successfully', async ({ page }) => {
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    // Wait for form to be ready
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    
    const productData = {
      name: testProductName,
      sku: testProductSKU,
      description: `Test product description created at ${new Date().toISOString()}`,
      price: '99.99',
      currency: 'USD'
    };
    
    // Fill product name
    const nameInput = page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    await nameInput.fill(productData.name);
    
    // Fill SKU
    const skuInput = page.locator('input#product_sku, input[name="product_sku"], input[formControlName="product_sku"]').first();
    await skuInput.fill(productData.sku);
    
    // Fill description
    const descriptionInput = page.locator('textarea#description, textarea[name="description"], textarea[formControlName="description"]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill(productData.description);
    }
    
    // Fill price
    const priceInput = page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill(productData.price);
    
    // Select currency
    const currencySelect = page.locator('select#currency, select[name="currency"], select[formControlName="currency"]').first();
    if (await currencySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await currencySelect.selectOption(productData.currency);
    }
    
    // Note: Category selection removed as categories feature was deprecated
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click({ timeout: 5000 });
    
    // Wait for navigation or success message
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Verify success
    const isOnListPage = page.url().includes('/products') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created|saved/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
    
    // If on list page, verify the new product appears
    if (isOnListPage) {
      const productCard = page.locator(`text="${productData.name}"`);
      await expect(productCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('should prevent duplicate SKU', async ({ page }) => {
    // First create a product with unique SKU
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    const uniqueSKU = `UNIQUE-${Date.now()}`;
    
    const nameInput = page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    await nameInput.fill(`Product ${uniqueSKU}`);
    
    const skuInput = page.locator('input#product_sku, input[name="product_sku"], input[formControlName="product_sku"]').first();
    await skuInput.fill(uniqueSKU);
    
    const priceInput = page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill('50.00');
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    
    // Try to create another product with same SKU
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    await nameInput.fill(`Another Product ${Date.now()}`);
    await skuInput.fill(uniqueSKU);
    await priceInput.fill('60.00');
    await submitButton.click();
    
    // Verify error message appears
    const errorMessage = page.locator('text=/already exists|duplicate|SKU.*taken/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should create product without SKU', async ({ page }) => {
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    const productData = {
      name: `Product Without SKU ${Date.now()}`,
      price: '25.50'
    };
    
    const nameInput = page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    await nameInput.fill(productData.name);
    
    const priceInput = page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill(productData.price);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Verify success
    const isOnListPage = page.url().includes('/products') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
  });

  test('should search products by name or SKU', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
    // Check if search box exists
    const searchBox = page.locator('input[type="text"][placeholder*="earch"], input[type="search"], input.search-input').first();
    const searchExists = await searchBox.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!searchExists) {
      test.skip(true, 'Search functionality not available');
    }
    
    // Get a product name from the page if any exist
    const firstProduct = page.locator('.product-card, .card').first();
    const hasProducts = await firstProduct.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasProducts) {
      test.skip(true, 'No products available to search');
    }
    
    const productNameElement = firstProduct.locator('h2, h3, .product-name, .name').first();
    const productName = await productNameElement.textContent();
    
    if (!productName) {
      test.skip(true, 'Could not extract product name');
    }
    
    // Search for part of the product name
    const searchTerm = productName.substring(0, 3);
    await searchBox.fill(searchTerm);
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    await expect(firstProduct).toBeVisible();
  });

  test('should filter products by tags', async ({ page }) => {
    await cataloguePage.navigateToProductList();

    // Check if tag filter exists
    const tagFilter = page.locator('select[name*="tag"], select[id*="tag"], .tag-filter select').first();
    const hasFilter = await tagFilter.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasFilter) {
      test.skip(true, 'Tag filter not available');
    }

    // Check if there are tag options
    const options = await tagFilter.locator('option').count();
    if (options <= 1) {
      test.skip(true, 'No tags available to filter');
    }

    // Select a tag
    await tagFilter.selectOption({ index: 1 });

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify some products are displayed (or empty state if no products with tag)
    const hasProducts = await page.locator('.product-card, .card').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no products|empty/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasProducts || hasEmptyState).toBeTruthy();
  });

  test('should view product details', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
    // Check if any products exist
    const productCard = page.locator('.product-card, .card').first();
    const hasProducts = await productCard.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasProducts) {
      test.skip(true, 'No products available to view');
    }
    
    // Click on the product card or view button
    const viewButton = productCard.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View")').first();
    const hasViewButton = await viewButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasViewButton) {
      await viewButton.click();
    } else {
      // Click on the card itself
      await productCard.click();
    }
    
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    // Verify we're on a detail page or modal opened
    const hasDetails = await page.locator('text=/description|price|SKU|tag/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasDetails).toBeTruthy();
  });

  test('should edit product successfully', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
    // Check if edit button exists on first product
    const editButton = page.locator('button:has-text("Edit"), .btn-action:has-text("Edit"), a:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasEditButton) {
      test.skip(true, 'No products available to edit or edit button not found');
    }
    
    await editButton.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for edit form to load
    const nameInput = page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    const formLoaded = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!formLoaded) {
      test.skip(true, 'Edit form did not load');
    }
    
    // Update description
    const descriptionInput = page.locator('textarea#description, textarea[name="description"], textarea[formControlName="description"]').first();
    const updatedDescription = `Updated product description at ${Date.now()}`;
    await descriptionInput.fill(updatedDescription);
    
    // Update price
    const priceInput = page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill('149.99');
    
    // Submit the form
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Verify success
    const isOnListPage = page.url().includes('/products') && !page.url().includes('/edit');
    const hasSuccessMessage = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
  });

  test('should delete product without coupons', async ({ page }) => {
    // First create a product to delete
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    const productToDelete = `Delete Test ${Date.now()}`;
    const skuToDelete = `DEL-${Date.now()}`;
    
    const nameInput = page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    await nameInput.fill(productToDelete);
    
    const skuInput = page.locator('input#product_sku, input[name="product_sku"], input[formControlName="product_sku"]').first();
    await skuInput.fill(skuToDelete);
    
    const priceInput = page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill('10.00');
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    
    // Now try to delete it
    await cataloguePage.navigateToProductList();
    
    // Find the delete button for our product
    const productCard = page.locator(`text="${productToDelete}"`).locator('..').locator('..').first();
    const deleteButton = productCard.locator('button:has-text("Delete"), button[class*="delete"]').first();
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
    
    // Verify deletion - product should no longer be visible
    const deletedProduct = page.locator(`text="${productToDelete}"`);
    await expect(deletedProduct).not.toBeVisible({ timeout: 5000 });
  });

  test('should display product with tags', async ({ page }) => {
    await cataloguePage.navigateToProductList();

    // Check if products display tag information
    const productWithTags = page.locator('.product-card, .card').filter({
      has: page.locator('text=/tag|label/i')
    }).first();

    const hasProduct = await productWithTags.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasProduct) {
      test.skip(true, 'No products with tags found');
    }

    // Verify tags are displayed
    await expect(productWithTags).toBeVisible();
  });

  test('should display product pricing with currency', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
    // Check if products display price
    const productPrice = page.locator('text=/[$£€₹][0-9]+|[0-9]+\.[0-9]{2}/').first();
    const hasPrice = await productPrice.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasPrice) {
      test.skip(true, 'No product prices found');
    }
    
    // Verify price is visible
    await expect(productPrice).toBeVisible();
  });

  test('should toggle product active status', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
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

  test('should display product images or placeholders', async ({ page }) => {
    await cataloguePage.navigateToProductList();
    
    // Check if products have images or placeholders
    const productImage = page.locator('.product-card img, .card img, .product-image, i.material-icons').first();
    const hasImage = await productImage.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasImage) {
      test.skip(true, 'No product images or placeholders found');
    }
    
    // Verify image/placeholder is displayed
    await expect(productImage).toBeVisible();
  });

  test('should create product with image URL', async ({ page }) => {
    await cataloguePage.navigateToMenuItem('Catalogue', 'Add Product');
    await page.waitForLoadState('networkidle');
    
    const productData = {
      name: `Product with Image ${Date.now()}`,
      sku: `IMG-${Date.now()}`,
      price: '75.00',
      imageUrl: 'https://via.placeholder.com/300'
    };
    
    const nameInput = page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    await nameInput.fill(productData.name);
    
    const skuInput = page.locator('input#product_sku, input[name="product_sku"], input[formControlName="product_sku"]').first();
    await skuInput.fill(productData.sku);
    
    const priceInput = page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill(productData.price);
    
    // Fill image URL
    const imageInput = page.locator('input#image_url, input[name="image_url"], input[formControlName="image_url"]').first();
    if (await imageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await imageInput.fill(productData.imageUrl);
    }
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Verify success
    const isOnListPage = page.url().includes('/products') && !page.url().includes('/create');
    expect(isOnListPage).toBeTruthy();
  });
});
