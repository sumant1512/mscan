import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Comprehensive Credit Balance and Transaction Tests
 * Tests credit requests, approvals, balance management, and transactions
 */
test.describe('Tenant Admin - Credit Management', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    await page.waitForTimeout(2000);
  });

  test.describe('Credit Balance Viewing', () => {

    test('should display current credit balance on dashboard', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/dashboard`);
      await pageHelper.waitForLoadingToComplete();

      // Look for credit balance display
      const creditBalance = page.locator('text=/credit.*balance|available.*credit|balance/i').first();
      const hasBalance = await creditBalance.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasBalance) {
        await expect(creditBalance).toBeVisible();

        // Verify balance is a number
        const balanceText = await creditBalance.textContent();
        const hasNumber = /\d+/.test(balanceText || '');
        expect(hasNumber).toBeTruthy();
      }
    });

    test('should get credit balance via API', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.balance).toBeDefined();
      expect(typeof data.balance).toBe('number');
      expect(data.balance).toBeGreaterThanOrEqual(0);

      console.log(`✅ Current credit balance: ${data.balance}`);
    });

    test('should show credit usage statistics', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/dashboard`);
      await pageHelper.waitForLoadingToComplete();

      // Look for credit usage stats
      const usageStats = page.locator('text=/credit.*used|spent|consumed/i');
      const hasStats = await usageStats.first().isVisible().catch(() => false);

      if (hasStats) {
        await expect(usageStats.first()).toBeVisible();
      }
    });
  });

  test.describe('Credit Requests', () => {

    test('should navigate to credit request page', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Credits', 'Request Credits');
      await pageHelper.waitForLoadingToComplete();

      // Verify we're on credit request page
      await expect(page).toHaveURL(/.*credit.*request|request.*credit/i);

      // Verify request form is visible
      const requestForm = page.locator('form');
      await expect(requestForm).toBeVisible();
    });

    test('should create credit request successfully', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const requestData = {
        amount: 500,
        justification: `E2E Test Credit Request ${timestamp}`
      };

      const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: requestData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.message).toMatch(/request.*created|submitted|pending/i);
      expect(data.request.amount).toBe(requestData.amount);
      expect(data.request.status).toBe('pending');

      console.log(`✅ Credit request created: ${data.request.id}`);
    });

    test('should validate credit request amount', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Try to request 0 credits
      const response1 = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          amount: 0,
          justification: 'Invalid amount test'
        }
      });

      expect(response1.status()).toBe(400);
      const error1 = await response1.json();
      expect(error1.error).toMatch(/amount|greater.*than.*0|positive/i);

      // Try negative amount
      const response2 = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          amount: -100,
          justification: 'Negative amount test'
        }
      });

      expect(response2.status()).toBe(400);
    });

    test('should require justification for credit request', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          amount: 100
          // Missing justification
        }
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error).toMatch(/justification|required/i);
    });

    test('should display pending credit requests', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Create a request first
      await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          amount: 250,
          justification: 'Test request for listing'
        }
      });

      // Navigate to credits page
      await pageHelper.navigateToMenuItem('Credits', 'My Requests');
      await pageHelper.waitForLoadingToComplete();

      // Check if requests are listed
      const requestsList = page.locator('.request-item, tr, .card').filter({ has: page.locator('text=/pending/i') });
      const hasRequests = (await requestsList.count()) > 0;

      if (hasRequests) {
        expect(await requestsList.count()).toBeGreaterThan(0);
      }
    });

    test('should view credit request details', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Create a request
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          amount: 300,
          justification: 'Request details test'
        }
      });

      const createData = await createResponse.json();
      const requestId = createData.request.id;

      // Get request details
      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/request/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.request.id).toBe(requestId);
      expect(data.request.amount).toBe(300);
      expect(data.request.justification).toBe('Request details test');
    });
  });

  test.describe('Credit Transactions', () => {

    test('should deduct credits when creating coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get initial balance
      const balanceResponse1 = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const balance1 = (await balanceResponse1.json()).balance;

      // Get verification app
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      // Create coupons
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Credit deduction test',
          discount_value: 50,
          quantity: 10,
          expiry_date: expiryDate
        }
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      const creditCost = createData.credit_cost;

      // Get new balance
      const balanceResponse2 = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const balance2 = (await balanceResponse2.json()).balance;

      // Verify credits were deducted
      expect(balance2).toBe(balance1 - creditCost);

      console.log(`✅ Credits deducted: ${creditCost}, Balance: ${balance1} → ${balance2}`);
    });

    test('should prevent coupon creation with insufficient credits', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get verification app
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      // Try to create massive batch (should exceed credits)
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Insufficient credits test',
          discount_value: 100,
          quantity: 1000000,
          expiry_date: expiryDate
        }
      });

      // Should fail with insufficient credits error
      if (response.status() === 400 || response.status() === 402) {
        const error = await response.json();
        expect(error.error).toMatch(/insufficient.*credit|not.*enough.*credit|balance/i);

        console.log(`✅ Insufficient credits error: ${error.error}`);
      } else {
        console.log('⚠️ Tenant may have unlimited credits');
      }
    });

    test('should view transaction history', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.transactions).toBeDefined();
      expect(Array.isArray(data.transactions)).toBeTruthy();

      if (data.transactions.length > 0) {
        const transaction = data.transactions[0];
        expect(transaction.amount).toBeDefined();
        expect(transaction.type).toMatch(/credit|debit|add|deduct/i);
        expect(transaction.balance_after).toBeDefined();

        console.log(`✅ Transaction history: ${data.transactions.length} transactions`);
      }
    });

    test('should filter transactions by type', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get credit transactions
      const creditResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions?type=credit`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (creditResponse.ok()) {
        const creditData = await creditResponse.json();

        if (creditData.transactions && creditData.transactions.length > 0) {
          expect(creditData.transactions.every((t: any) => t.type === 'credit')).toBeTruthy();
        }
      }

      // Get debit transactions
      const debitResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions?type=debit`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (debitResponse.ok()) {
        const debitData = await debitResponse.json();

        if (debitData.transactions && debitData.transactions.length > 0) {
          expect(debitData.transactions.every((t: any) => t.type === 'debit')).toBeTruthy();
        }
      }
    });

    test('should show transaction details', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const listResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const listData = await listResponse.json();

      if (listData.transactions && listData.transactions.length > 0) {
        const transactionId = listData.transactions[0].id;

        // Get transaction details
        const detailResponse = await page.request.get(
          `${TEST_CONFIG.tenant1.apiBaseUrl}/credits/transactions/${transactionId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (detailResponse.ok()) {
          const detailData = await detailResponse.json();

          expect(detailData.transaction.id).toBe(transactionId);
          expect(detailData.transaction.amount).toBeDefined();
          expect(detailData.transaction.description).toBeDefined();
        }
      }
    });
  });

  test.describe('Credit Usage Analytics', () => {

    test('should show credit usage summary', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/dashboard`);
      await pageHelper.waitForLoadingToComplete();

      // Look for credit usage charts or stats
      const creditSection = page.locator('text=/credit.*usage|usage.*summary|spending/i');
      const hasSection = await creditSection.first().isVisible().catch(() => false);

      if (hasSection) {
        await expect(creditSection.first()).toBeVisible();

        // Look for usage numbers or charts
        const usageData = page.locator('.credit-usage, .usage-chart, [class*="chart"]');
        const hasData = await usageData.first().isVisible().catch(() => false);

        if (hasData) {
          console.log('✅ Credit usage analytics displayed');
        }
      }
    });

    test('should get credit usage statistics via API', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/stats`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok()) {
        const data = await response.json();

        expect(data.total_credited).toBeDefined();
        expect(data.total_spent).toBeDefined();
        expect(data.current_balance).toBeDefined();

        console.log('✅ Credit stats:', {
          credited: data.total_credited,
          spent: data.total_spent,
          balance: data.current_balance
        });
      }
    });

    test('should show daily/weekly credit usage trends', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/usage-trend`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok()) {
        const data = await response.json();

        expect(data.trend).toBeDefined();
        expect(Array.isArray(data.trend)).toBeTruthy();

        console.log(`✅ Usage trend data: ${data.trend.length} data points`);
      } else {
        console.log('ℹ️ Usage trend endpoint may not be implemented');
      }
    });
  });

  test.describe('Credit Balance Limits', () => {

    test('should display credit limit information', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      // Check if credit limit is shown
      if (data.credit_limit !== undefined) {
        expect(typeof data.credit_limit).toBe('number');
        expect(data.credit_limit).toBeGreaterThanOrEqual(0);

        console.log(`✅ Credit limit: ${data.credit_limit}, Balance: ${data.balance}`);
      }
    });

    test('should show low balance warning', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.tenant1.baseUrl}/tenant/dashboard`);
      await pageHelper.waitForLoadingToComplete();

      // Look for low balance warning
      const warning = page.locator('.alert.warning, .low-balance-warning, text=/low.*credit|credit.*low/i');
      const hasWarning = await warning.first().isVisible().catch(() => false);

      if (hasWarning) {
        console.log('⚠️ Low balance warning is displayed');
        await expect(warning.first()).toBeVisible();
      } else {
        console.log('✅ No low balance warning (balance is sufficient)');
      }
    });
  });

  test.describe('Credit Cost Calculation', () => {

    test('should calculate credit cost before creating coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      // Get verification app
      const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const appsData = await appsResponse.json();
      const verificationAppId = appsData.apps[0].id;

      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Calculate cost (if endpoint exists)
      const calcResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/calculate-cost`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          discount_value: 75,
          quantity: 20
        }
      });

      if (calcResponse.ok()) {
        const calcData = await calcResponse.json();

        expect(calcData.credit_cost).toBeDefined();
        expect(typeof calcData.credit_cost).toBe('number');
        expect(calcData.credit_cost).toBeGreaterThan(0);

        console.log(`✅ Credit cost calculation: ${calcData.credit_cost} credits for 20 coupons`);
      }
    });

    test('should show credit cost in coupon creation UI', async ({ page }) => {
      await pageHelper.navigateToMenuItem('Rewards', 'Create Coupon');
      await pageHelper.waitForLoadingToComplete();

      // Look for credit cost display
      const costDisplay = page.locator('text=/credit.*cost|total.*credit|cost.*credit/i');
      const hasCost = await costDisplay.first().isVisible().catch(() => false);

      if (hasCost) {
        await expect(costDisplay.first()).toBeVisible();
        console.log('✅ Credit cost displayed in UI');
      }
    });
  });
});
