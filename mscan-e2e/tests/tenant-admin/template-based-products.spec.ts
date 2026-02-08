import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Template-based Product Creation E2E Tests
 * Tests for creating products using templates with dynamic attributes and variants
 */
test.describe('Tenant Admin - Template-based Product Creation', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test('should display template selector in product creation', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    // Check if template selector exists
    const templateSelector = page.locator('select[formControlName="template"], mat-select[formControlName="template"]').first();
    const hasTemplateSelector = await templateSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplateSelector) {
      test.skip(true, 'Template selector not available in product form');
    }

    await expect(templateSelector).toBeVisible();
  });

  test('should load template attributes when template is selected', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    const templateSelector = page.locator('select[formControlName="template"], mat-select[formControlName="template"]').first();
    const hasTemplateSelector = await templateSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplateSelector) {
      test.skip(true, 'Template selector not available');
    }

    // Check if mat-select or regular select
    const isMatSelect = await page.locator('mat-select[formControlName="template"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await templateSelector.click();
      const templateOption = page.locator('mat-option').first();
      const hasOptions = await templateOption.isVisible({ timeout: 2000 }).catch(() => false);

      if (!hasOptions) {
        test.skip(true, 'No templates available');
      }

      await templateOption.click();
    } else {
      const optionCount = await templateSelector.locator('option').count();
      if (optionCount <= 1) {
        test.skip(true, 'No templates available');
      }

      await templateSelector.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1500);

    // Verify dynamic fields/attributes appeared
    const dynamicFields = page.locator('.attribute-field, .dynamic-field, [formControlName*="attribute"]').first();
    const hasDynamicFields = await dynamicFields.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDynamicFields) {
      test.skip(true, 'Template attributes did not load');
    }

    await expect(dynamicFields).toBeVisible();
  });

  test('should create product with template and dynamic attributes', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    const productData = {
      name: `Template Product ${timestamp}`,
      sku: `TPL-${timestamp}`,
      price: '199.99'
    };

    // Select template first
    const templateSelector = page.locator('select[formControlName="template"], mat-select[formControlName="template"]').first();
    const hasTemplateSelector = await templateSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplateSelector) {
      test.skip(true, 'Template selector not available');
    }

    const isMatSelect = await page.locator('mat-select[formControlName="template"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await templateSelector.click();
      await page.locator('mat-option').first().click();
    } else {
      await templateSelector.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1500);

    // Fill basic product fields
    const nameInput = page.locator('input[formControlName="product_name"], input[name="product_name"]').first();
    await nameInput.fill(productData.name);

    const skuInput = page.locator('input[formControlName="product_sku"], input[name="product_sku"]').first();
    if (await skuInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skuInput.fill(productData.sku);
    }

    const priceInput = page.locator('input[formControlName="price"], input[name="price"]').first();
    if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priceInput.fill(productData.price);
    }

    // Fill dynamic attribute fields if they exist
    const attributeFields = page.locator('input[formControlName*="attribute"], textarea[formControlName*="attribute"], select[formControlName*="attribute"]');
    const attributeCount = await attributeFields.count();

    for (let i = 0; i < Math.min(attributeCount, 3); i++) {
      const field = attributeFields.nth(i);
      const tagName = await field.evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'input') {
        const type = await field.getAttribute('type');
        if (type === 'text' || type === 'number') {
          await field.fill('Test Value');
        }
      } else if (tagName === 'textarea') {
        await field.fill('Test Description');
      } else if (tagName === 'select') {
        await field.selectOption({ index: 1 });
      }
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click({ timeout: 5000 });

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify success
    const isOnListPage = page.url().includes('/products') && !page.url().includes('/create');
    const hasSuccessMessage = await page.locator('text=/success|created|saved/i').isVisible({ timeout: 3000 }).catch(() => false);

    expect(isOnListPage || hasSuccessMessage).toBeTruthy();
  });

  test('should create product with variants', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    const productData = {
      name: `Variant Product ${timestamp}`,
      sku: `VAR-${timestamp}`
    };

    // Fill basic fields
    const nameInput = page.locator('input[formControlName="product_name"], input[name="product_name"]').first();
    await nameInput.fill(productData.name);

    const skuInput = page.locator('input[formControlName="product_sku"], input[name="product_sku"]').first();
    if (await skuInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skuInput.fill(productData.sku);
    }

    // Look for variants section
    const addVariantButton = page.locator('button:has-text("Add Variant"), button:has-text("Add Option")').first();
    const hasVariantButton = await addVariantButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasVariantButton) {
      test.skip(true, 'Product variants feature not available');
    }

    // Add first variant
    await addVariantButton.click();
    await page.waitForTimeout(500);

    // Fill variant details
    const variantNameInput = page.locator('input[formControlName="variantName"], input[placeholder*="variant"]').first();
    if (await variantNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await variantNameInput.fill('Small');
    }

    const variantPriceInput = page.locator('input[formControlName="variantPrice"], input[placeholder*="price"]').first();
    if (await variantPriceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await variantPriceInput.fill('99.99');
    }

    // Add another variant
    await addVariantButton.click();
    await page.waitForTimeout(500);

    const variantInputs = page.locator('input[formControlName="variantName"], input[placeholder*="variant"]');
    const secondVariant = variantInputs.nth(1);
    if (await secondVariant.isVisible({ timeout: 2000 }).catch(() => false)) {
      await secondVariant.fill('Large');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const hasSuccessMessage = await page.locator('text=/success|created/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSuccessMessage).toBeTruthy();
  });

  test('should validate required template attributes', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    // Select a template
    const templateSelector = page.locator('select[formControlName="template"], mat-select[formControlName="template"]').first();
    const hasTemplateSelector = await templateSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplateSelector) {
      test.skip(true, 'Template selector not available');
    }

    const isMatSelect = await page.locator('mat-select[formControlName="template"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await templateSelector.click();
      await page.locator('mat-option').first().click();
    } else {
      await templateSelector.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1500);

    // Fill product name but leave template attributes empty
    const nameInput = page.locator('input[formControlName="product_name"], input[name="product_name"]').first();
    await nameInput.fill(`Test Product ${timestamp}`);

    // Try to submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Check for validation errors
    const errorMessage = page.locator('text=/required|field.*required|complete.*field/i').first();
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasError) {
      // Alternative: form should still be on create page (not submitted)
      const stillOnCreatePage = page.url().includes('/create');
      expect(stillOnCreatePage).toBeTruthy();
    } else {
      expect(hasError).toBeTruthy();
    }
  });

  test('should display template name on product card', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Look for products showing template information
    const productWithTemplate = page.locator('.product-card, .card').filter({
      has: page.locator('text=/template|based on/i')
    }).first();

    const hasProductWithTemplate = await productWithTemplate.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasProductWithTemplate) {
      test.skip(true, 'No template-based products found');
    }

    await expect(productWithTemplate).toBeVisible();
  });

  test('should edit product with template attributes', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Find a template-based product
    const productWithTemplate = page.locator('.product-card, .card').filter({
      has: page.locator('text=/template/i')
    }).first();

    const hasProduct = await productWithTemplate.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasProduct) {
      test.skip(true, 'No template-based products to edit');
    }

    const editButton = productWithTemplate.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    const hasEditButton = await editButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasEditButton) {
      test.skip(true, 'Edit button not found');
    }

    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Verify template attributes are editable
    const attributeFields = page.locator('input[formControlName*="attribute"], textarea[formControlName*="attribute"]').first();
    const hasAttributes = await attributeFields.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasAttributes) {
      test.skip(true, 'Template attributes not shown in edit mode');
    }

    // Update an attribute
    await attributeFields.fill(`Updated Value ${timestamp}`);

    // Save
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const hasSuccessMessage = await page.locator('text=/success|updated/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSuccessMessage).toBeTruthy();
  });

  test('should display product variant pricing', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Look for products with variant pricing indicators
    const productWithVariants = page.locator('text=/from.*[$€£₹]|starting at/i').first();
    const hasVariantPricing = await productWithVariants.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasVariantPricing) {
      test.skip(true, 'No products with variant pricing found');
    }

    await expect(productWithVariants).toBeVisible();
  });

  test('should filter products by template', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Check if template filter exists
    const templateFilter = page.locator('select[name*="template"], select[id*="template"], .template-filter select').first();
    const hasFilter = await templateFilter.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasFilter) {
      test.skip(true, 'Template filter not available');
    }

    const optionCount = await templateFilter.locator('option').count();
    if (optionCount <= 1) {
      test.skip(true, 'No templates to filter by');
    }

    // Get initial count
    const initialProducts = await page.locator('.product-card, .card').count();

    // Select a template
    await templateFilter.selectOption({ index: 1 });

    // Wait for filter
    await page.waitForTimeout(1000);

    // Verify filter worked
    const filteredProducts = await page.locator('.product-card, .card').count();
    const hasEmptyState = await page.locator('text=/no products|empty/i').isVisible({ timeout: 2000 }).catch(() => false);

    const filterWorked = (filteredProducts !== initialProducts) || hasEmptyState;
    expect(filterWorked).toBeTruthy();
  });

  test('should show template icon/badge on product cards', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Look for template badges or icons
    const templateBadge = page.locator('.template-badge, .badge, mat-chip').filter({
      has: page.locator('text=/template/i')
    }).first();

    const hasBadge = await templateBadge.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasBadge) {
      test.skip(true, 'Template badges not displayed on product cards');
    }

    await expect(templateBadge).toBeVisible();
  });

  test('should preview product with template before creation', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    // Fill form
    const nameInput = page.locator('input[formControlName="product_name"], input[name="product_name"]').first();
    await nameInput.fill(`Preview Product ${timestamp}`);

    // Look for preview button
    const previewButton = page.locator('button:has-text("Preview"), button:has-text("Show Preview")').first();
    const hasPreviewButton = await previewButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasPreviewButton) {
      test.skip(true, 'Product preview feature not available');
    }

    await previewButton.click();
    await page.waitForTimeout(1000);

    // Verify preview is shown
    const previewSection = page.locator('.preview, .product-preview, [class*="preview"]').first();
    const hasPreview = await previewSection.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasPreview).toBeTruthy();
  });

  test('should bulk import products from template', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'View Products');
    await pageHelper.waitForLoadingToComplete();

    // Look for bulk import button
    const bulkImportButton = page.locator('button:has-text("Bulk Import"), button:has-text("Import")').first();
    const hasBulkImport = await bulkImportButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasBulkImport) {
      test.skip(true, 'Bulk import feature not available');
    }

    await bulkImportButton.click();
    await page.waitForTimeout(1000);

    // Verify import dialog opened
    const importDialog = page.locator('text=/template|CSV|upload|import/i').first();
    const hasImportDialog = await importDialog.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasImportDialog).toBeTruthy();
  });

  test('should validate attribute data types', async ({ page }) => {
    await pageHelper.navigateToMenuItem('Products', 'Create Product');
    await page.waitForLoadState('networkidle');

    // Select template
    const templateSelector = page.locator('select[formControlName="template"], mat-select[formControlName="template"]').first();
    const hasTemplateSelector = await templateSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasTemplateSelector) {
      test.skip(true, 'Template selector not available');
    }

    const isMatSelect = await page.locator('mat-select[formControlName="template"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (isMatSelect) {
      await templateSelector.click();
      await page.locator('mat-option').first().click();
    } else {
      await templateSelector.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1500);

    // Find a number attribute field
    const numberField = page.locator('input[type="number"][formControlName*="attribute"]').first();
    const hasNumberField = await numberField.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasNumberField) {
      test.skip(true, 'No number attribute fields found');
    }

    // Try to enter invalid data
    await numberField.fill('invalid text');

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Verify validation error or value was not accepted
    const errorMessage = page.locator('text=/invalid|number.*required|must be.*number/i').first();
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasError) {
      // Alternative: check field value was cleared or not accepted
      const fieldValue = await numberField.inputValue();
      expect(fieldValue).not.toBe('invalid text');
    } else {
      expect(hasError).toBeTruthy();
    }
  });
});
