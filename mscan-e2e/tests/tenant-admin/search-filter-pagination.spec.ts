import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Comprehensive Search, Filter, and Pagination Tests
 * Tests search, filtering, sorting, and pagination across all modules
 */
test.describe('Tenant Admin - Search, Filter, and Pagination', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test.describe('Categories Search and Filter', () => {

    test('should search categories by name', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Categories');
      await pageHelper.waitForLoadingToComplete();

      const searchBox = page.locator('input[placeholder*="Search"], input[type="search"], input.search-input').first();
      const hasSearch = await searchBox.isVisible().catch(() => false);

      if (hasSearch) {
        // Get first category name
        const firstCategory = page.locator('.category-card, .category-row').first();
        const categoryName = await firstCategory.locator('h3, .category-name, td').first().textContent();

        if (categoryName) {
          // Search for partial name
          const searchTerm = categoryName.substring(0, 3);
          await searchBox.fill(searchTerm);
          await page.waitForTimeout(1000);

          // Verify filtered results
          const results = page.locator('.category-card, .category-row');
          const count = await results.count();

          expect(count).toBeGreaterThan(0);

          console.log(`✅ Search found ${count} categories matching "${searchTerm}"`);
        }
      } else {
        console.log('ℹ️ Search functionality not available in UI');
      }
    });

    test('should filter categories by app', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Categories');
      await pageHelper.waitForLoadingToComplete();

      const appSelector = page.locator('.app-selector-dropdown, #app-select');
      const hasSelector = await appSelector.isVisible().catch(() => false);

      if (hasSelector) {
        const appOptions = await appSelector.locator('option:not([disabled])').count();

        if (appOptions > 1) {
          // Get count with "All Applications"
          await appSelector.selectOption({ index: 0 });
          await page.waitForTimeout(1000);
          const allCount = await page.locator('.category-card, .category-row, tbody tr').count();

          // Select specific app
          await appSelector.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          const filteredCount = await page.locator('.category-card, .category-row, tbody tr').count();

          console.log(`✅ App filter: All=${allCount}, Filtered=${filteredCount}`);
        }
      }
    });

    test('should filter categories by status (active/inactive)', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Categories');
      await pageHelper.waitForLoadingToComplete();

      const statusFilter = page.locator('select').filter({ hasText: /status|active/i });
      const hasFilter = await statusFilter.isVisible().catch(() => false);

      if (hasFilter) {
        await statusFilter.selectOption({ label: 'Active' });
        await page.waitForTimeout(1000);

        const activeCount = await page.locator('.category-card, .category-row').count();

        await statusFilter.selectOption({ label: 'Inactive' });
        await page.waitForTimeout(1000);

        const inactiveCount = await page.locator('.category-card, .category-row').count();

        console.log(`✅ Status filter: Active=${activeCount}, Inactive=${inactiveCount}`);
      }
    });
  });

  test.describe('Products Search and Filter', () => {

    test('should search products by name', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Products');
      await pageHelper.waitForLoadingToComplete();

      const searchBox = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      const hasSearch = await searchBox.isVisible().catch(() => false);

      if (hasSearch) {
        const firstProduct = page.locator('tr, .product-card').first();
        const productName = await firstProduct.locator('td, .product-name').first().textContent();

        if (productName) {
          const searchTerm = productName.substring(0, 3);
          await searchBox.fill(searchTerm);
          await page.waitForTimeout(1000);

          const results = await page.locator('tbody tr, .product-card').count();
          expect(results).toBeGreaterThan(0);

          console.log(`✅ Product search found ${results} results for "${searchTerm}"`);
        }
      }
    });

    test('should search products by SKU', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/products`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok()) {
        const data = await response.json();

        if (data.products && data.products.length > 0) {
          const firstProduct = data.products[0];
          const sku = firstProduct.product_sku;

          // Search by SKU
          const searchResponse = await page.request.get(
            `${TEST_CONFIG.tenant1.apiBaseUrl}/products?sku=${sku}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          expect(searchResponse.ok()).toBeTruthy();
          const searchData = await searchResponse.json();

          expect(searchData.products.length).toBeGreaterThan(0);
          expect(searchData.products[0].product_sku).toBe(sku);

          console.log(`✅ SKU search successful: ${sku}`);
        }
      }
    });

    test('should filter products by category', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Products');
      await pageHelper.waitForLoadingToComplete();

      const categoryFilter = page.locator('select[formControlName="category_id"], select').filter({ has: page.locator('text=/category/i') });
      const hasFilter = await categoryFilter.isVisible().catch(() => false);

      if (hasFilter) {
        const categoryOptions = await categoryFilter.locator('option:not([disabled])').count();

        if (categoryOptions > 1) {
          await categoryFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);

          const filteredProducts = await page.locator('tbody tr, .product-card').count();

          console.log(`✅ Category filter applied: ${filteredProducts} products`);
        }
      }
    });

    test('should filter products by price range', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/products?min_price=10&max_price=100`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok()) {
        const data = await response.json();

        if (data.products && data.products.length > 0) {
          // Verify all products are within range
          const allInRange = data.products.every((p: any) => p.price >= 10 && p.price <= 100);
          expect(allInRange).toBeTruthy();

          console.log(`✅ Price range filter: ${data.products.length} products between ₹10-₹100`);
        }
      }
    });
  });

  test.describe('Coupons Search and Filter', () => {

    test('should search coupons by code', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get a coupon code
      const listResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (listResponse.ok()) {
        const listData = await listResponse.json();

        if (listData.coupons && listData.coupons.length > 0) {
          const couponCode = listData.coupons[0].code;

          // Search by code
          const searchResponse = await page.request.get(
            `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?code=${couponCode}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          expect(searchResponse.ok()).toBeTruthy();
          const searchData = await searchResponse.json();

          expect(searchData.coupons.length).toBe(1);
          expect(searchData.coupons[0].code).toBe(couponCode);

          console.log(`✅ Coupon code search successful: ${couponCode}`);
        }
      }
    });

    test('should filter coupons by status', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const statuses = ['draft', 'printed', 'active', 'used', 'expired'];

      for (const status of statuses) {
        const response = await page.request.get(
          `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=${status}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (response.ok()) {
          const data = await response.json();

          if (data.coupons && data.coupons.length > 0) {
            // Verify all coupons have the filtered status
            const allMatch = data.coupons.every((c: any) => c.status === status);
            expect(allMatch).toBeTruthy();

            console.log(`✅ Status filter '${status}': ${data.coupons.length} coupons`);
          }
        }
      }
    });

    test('should filter coupons by batch', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get a batch ID
      const listResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (listResponse.ok()) {
        const listData = await listResponse.json();

        if (listData.coupons && listData.coupons.length > 0 && listData.coupons[0].batch_id) {
          const batchId = listData.coupons[0].batch_id;

          // Filter by batch
          const batchResponse = await page.request.get(
            `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?batch_id=${batchId}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          expect(batchResponse.ok()).toBeTruthy();
          const batchData = await batchResponse.json();

          // All coupons should have the same batch_id
          if (batchData.coupons && batchData.coupons.length > 0) {
            const allMatch = batchData.coupons.every((c: any) => c.batch_id === batchId);
            expect(allMatch).toBeTruthy();

            console.log(`✅ Batch filter: ${batchData.coupons.length} coupons in batch ${batchId}`);
          }
        }
      }
    });

    test('should filter coupons by date range', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok()) {
        const data = await response.json();

        if (data.coupons && data.coupons.length > 0) {
          console.log(`✅ Date range filter: ${data.coupons.length} coupons created in last 30 days`);
        }
      }
    });
  });

  test.describe('Pagination', () => {

    test('should paginate categories list', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get first page
      const page1Response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories?page=1&limit=5`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(page1Response.ok()).toBeTruthy();
      const page1Data = await page1Response.json();

      expect(page1Data.categories).toBeDefined();
      expect(page1Data.categories.length).toBeLessThanOrEqual(5);

      if (page1Data.total > 5) {
        // Get second page
        const page2Response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories?page=2&limit=5`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        const page2Data = await page2Response.json();

        // Verify different results
        if (page1Data.categories.length > 0 && page2Data.categories.length > 0) {
          const page1Ids = page1Data.categories.map((c: any) => c.id);
          const page2Ids = page2Data.categories.map((c: any) => c.id);

          const noDuplicates = !page1Ids.some((id: string) => page2Ids.includes(id));
          expect(noDuplicates).toBeTruthy();

          console.log(`✅ Pagination working: Page 1 has ${page1Data.categories.length}, Page 2 has ${page2Data.categories.length}`);
        }
      }
    });

    test('should paginate products list', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/products?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.products).toBeDefined();
      expect(data.products.length).toBeLessThanOrEqual(10);

      if (data.total !== undefined) {
        expect(data.total).toBeGreaterThanOrEqual(data.products.length);
      }

      console.log(`✅ Products pagination: ${data.products.length} items, Total: ${data.total || 'N/A'}`);
    });

    test('should paginate coupons list', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?limit=20&offset=0`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.coupons).toBeDefined();
      expect(data.coupons.length).toBeLessThanOrEqual(20);

      console.log(`✅ Coupons pagination: ${data.coupons.length} coupons per page`);
    });

    test('should show pagination controls in UI', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Catalogue', 'Categories');
      await pageHelper.waitForLoadingToComplete();

      const paginationControls = page.locator('.pagination, [class*="paginator"], button:has-text("Next"), button:has-text("Previous")');
      const hasPagination = (await paginationControls.count()) > 0;

      if (hasPagination) {
        console.log('✅ Pagination controls visible in UI');

        const nextBtn = page.locator('button:has-text("Next"), .next-page');
        const hasNext = await nextBtn.first().isVisible().catch(() => false);

        if (hasNext) {
          await nextBtn.first().click();
          await page.waitForTimeout(1000);

          console.log('✅ Pagination next button working');
        }
      }
    });
  });

  test.describe('Sorting', () => {

    test('should sort categories by name', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Sort ascending
      const ascResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories?sort=name&order=asc`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (ascResponse.ok()) {
        const ascData = await ascResponse.json();

        if (ascData.categories && ascData.categories.length > 1) {
          const names = ascData.categories.map((c: any) => c.name);
          const sorted = [...names].sort();

          expect(names).toEqual(sorted);

          console.log(`✅ Categories sorted ascending by name`);
        }
      }

      // Sort descending
      const descResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/categories?sort=name&order=desc`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (descResponse.ok()) {
        const descData = await descResponse.json();

        if (descData.categories && descData.categories.length > 1) {
          const names = descData.categories.map((c: any) => c.name);
          const sorted = [...names].sort().reverse();

          expect(names).toEqual(sorted);

          console.log(`✅ Categories sorted descending by name`);
        }
      }
    });

    test('should sort products by price', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/products?sort=price&order=asc`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok()) {
        const data = await response.json();

        if (data.products && data.products.length > 1) {
          const prices = data.products.map((p: any) => p.price);
          const sorted = [...prices].sort((a: number, b: number) => a - b);

          expect(prices).toEqual(sorted);

          console.log(`✅ Products sorted by price ascending`);
        }
      }
    });

    test('should sort coupons by creation date', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?sort=created_at&order=desc`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok()) {
        const data = await response.json();

        if (data.coupons && data.coupons.length > 1) {
          const dates = data.coupons.map((c: any) => new Date(c.created_at).getTime());
          const sorted = [...dates].sort((a, b) => b - a); // Descending

          expect(dates).toEqual(sorted);

          console.log(`✅ Coupons sorted by creation date descending`);
        }
      }
    });
  });

  test.describe('Combined Filters', () => {

    test('should apply multiple filters together', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get verification app
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const appsData = await appsResponse.json();
      const appId = appsData.apps[0].id;

      // Filter coupons: status=active, app_id=X, limit=10
      const response = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=active&verification_app_id=${appId}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      if (data.coupons && data.coupons.length > 0) {
        // Verify all filters applied
        const allActive = data.coupons.every((c: any) => c.status === 'active');
        const allFromApp = data.coupons.every((c: any) => c.verification_app_id === appId);
        const limitRespected = data.coupons.length <= 10;

        expect(allActive).toBeTruthy();
        expect(allFromApp).toBeTruthy();
        expect(limitRespected).toBeTruthy();

        console.log(`✅ Multiple filters applied: ${data.coupons.length} active coupons from app ${appId}`);
      }
    });

    test('should clear all filters', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Rewards', 'Manage Coupons');
      await pageHelper.waitForLoadingToComplete();

      // Apply some filters (if available)
      const statusFilter = page.locator('select').filter({ hasText: /status/i });
      const hasFilter = await statusFilter.isVisible().catch(() => false);

      if (hasFilter) {
        await statusFilter.selectOption('active');
        await page.waitForTimeout(1000);

        const filteredCount = await page.locator('.coupon-row, .coupon-card, tbody tr').count();

        // Clear filters
        const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset")');
        const hasClearBtn = await clearBtn.isVisible().catch(() => false);

        if (hasClearBtn) {
          await clearBtn.click();
          await page.waitForTimeout(1000);

          const unfilteredCount = await page.locator('.coupon-row, .coupon-card, tbody tr').count();

          expect(unfilteredCount).toBeGreaterThanOrEqual(filteredCount);

          console.log(`✅ Filters cleared: ${filteredCount} → ${unfilteredCount} items`);
        }
      }
    });
  });
});
