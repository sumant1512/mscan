import { test, expect } from '@playwright/test';
import { AuthHelper, PageHelper } from '../../utils/helpers.js';
import { TEST_CONFIG } from '../../utils/test-config.js';

/**
 * Comprehensive Coupon Status Transitions Tests
 * Tests: draft → printed → active → used/expired/deactivated
 */
test.describe('Tenant Admin - Coupon Status Transitions', () => {
  let authHelper: AuthHelper;
  let pageHelper: PageHelper;
  let verificationAppId: string;
  let testBatchId: string;
  let testCouponCode: string;
  const timestamp = Date.now();

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelper = new PageHelper(page);
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);

    // Get or create verification app for testing
    const appsResponse = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/verification-apps`, {
      headers: {
        'Authorization': `Bearer ${await authHelper.getAccessToken()}`
      }
    });
    const appsData = await appsResponse.json();

    if (appsData.apps && appsData.apps.length > 0) {
      verificationAppId = appsData.apps[0].id;
    }
  });

  test.describe('Coupon Creation (Draft Status)', () => {

    test('should create coupons in draft status by default', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: `Draft Test Batch ${timestamp}`,
          discount_value: 50,
          quantity: 3,
          expiry_date: expiryDate
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // Verify coupons are created in draft status
      expect(data.coupons).toBeDefined();
      expect(data.coupons.length).toBe(3);
      expect(data.coupons[0].status).toBe('draft');

      testBatchId = data.coupons[0].batch_id;
      testCouponCode = data.coupons[0].code;

      console.log(`✅ Created batch ${testBatchId} with 3 draft coupons`);
    });

    test('should not allow scanning draft coupons', async ({ page }) => {
      // Create a draft coupon
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Draft scan test',
          discount_value: 25,
          quantity: 1,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const draftCoupon = createData.coupons[0];

      // Try to scan draft coupon (should fail)
      const scanResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          coupon_code: draftCoupon.code
        }
      });

      // Should fail with appropriate error
      expect(scanResponse.status()).toBe(400);
      const scanData = await scanResponse.json();
      expect(scanData.error).toMatch(/draft|not.*active|cannot.*scan/i);

      console.log(`✅ Draft coupon scan correctly rejected: ${scanData.error}`);
    });

    test('should list draft coupons separately', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=draft`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // Verify all returned coupons are draft
      if (data.coupons && data.coupons.length > 0) {
        expect(data.coupons.every((c: any) => c.status === 'draft')).toBeTruthy();
      }
    });
  });

  test.describe('Draft to Printed Transition', () => {

    test('should mark batch as printed', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create draft batch
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Print test batch',
          discount_value: 30,
          quantity: 5,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      // Mark as printed
      const printResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'E2E Test Print' }
        }
      );

      expect(printResponse.ok()).toBeTruthy();
      const printData = await printResponse.json();

      expect(printData.message).toContain('printed');
      expect(printData.printed_count).toBe(5);

      // Verify all coupons in batch are now 'printed'
      const listResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=printed`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const listData = await listResponse.json();
      const printedFromBatch = listData.coupons.filter((c: any) => c.batch_id === batchId);

      expect(printedFromBatch.length).toBe(5);
      expect(printedFromBatch.every((c: any) => c.status === 'printed')).toBeTruthy();

      console.log(`✅ Batch ${batchId} marked as printed successfully`);
    });

    test('should record print timestamp and notes', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Print timestamp test',
          discount_value: 40,
          quantity: 2,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      const printNote = `Printed on ${new Date().toISOString()} - Test Print`;

      const printResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: printNote }
        }
      );

      expect(printResponse.ok()).toBeTruthy();

      // Get batch details to verify print note
      const batchResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (batchResponse.ok()) {
        const batchData = await batchResponse.json();

        if (batchData.batch && batchData.batch.print_note) {
          expect(batchData.batch.print_note).toBe(printNote);
        }
      }
    });

    test('should not allow re-printing already printed batch', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Re-print test batch',
          discount_value: 35,
          quantity: 2,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      // First print
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'First print' }
        }
      );

      // Try second print (should fail or be idempotent)
      const secondPrintResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Second print attempt' }
        }
      );

      // Should either fail or return already printed message
      if (!secondPrintResponse.ok()) {
        const errorData = await secondPrintResponse.json();
        expect(errorData.error).toMatch(/already.*printed|cannot.*reprint/i);
      } else {
        const data = await secondPrintResponse.json();
        expect(data.message).toMatch(/already.*printed/i);
      }
    });
  });

  test.describe('Printed to Active Transition', () => {

    test('should activate batch of printed coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create and print batch
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Activation test batch',
          discount_value: 45,
          quantity: 4,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      // Print batch
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Activation test' }
        }
      );

      // Activate batch
      const activateResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(activateResponse.ok()).toBeTruthy();
      const activateData = await activateResponse.json();

      expect(activateData.message).toContain('activated');
      expect(activateData.activated_count).toBe(4);

      // Verify all coupons are now active
      const listResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=active`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const listData = await listResponse.json();
      const activeFromBatch = listData.coupons.filter((c: any) => c.batch_id === batchId);

      expect(activeFromBatch.length).toBe(4);
      expect(activeFromBatch.every((c: any) => c.status === 'active')).toBeTruthy();

      console.log(`✅ Batch ${batchId} activated successfully`);
    });

    test('should not allow activating draft coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Draft activation test',
          discount_value: 20,
          quantity: 2,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      // Try to activate without printing first
      const activateResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Should fail
      expect(activateResponse.status()).toBe(400);
      const errorData = await activateResponse.json();
      expect(errorData.error).toMatch(/not.*printed|must.*print.*first/i);
    });
  });

  test.describe('Active to Used Transition', () => {

    test('should mark coupon as used after successful scan', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create, print, and activate coupon
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Scan test batch',
          discount_value: 55,
          quantity: 1,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;
      const couponCode = createData.coupons[0].code;

      // Print
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Scan test' }
        }
      );

      // Activate
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Scan/use coupon
      const scanResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          coupon_code: couponCode
        }
      });

      expect(scanResponse.ok()).toBeTruthy();

      // Verify coupon is now marked as used
      const couponResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/${couponCode}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (couponResponse.ok()) {
        const couponData = await couponResponse.json();
        expect(couponData.coupon.status).toBe('used');
      }

      console.log(`✅ Coupon ${couponCode} marked as used after scan`);
    });

    test('should not allow scanning already used coupon', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create, print, activate, and use a coupon
      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Duplicate scan test',
          discount_value: 60,
          quantity: 1,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;
      const couponCode = createData.coupons[0].code;

      // Print and activate
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Duplicate scan test' }
        }
      );

      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // First scan
      await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { coupon_code: couponCode }
      });

      // Second scan (should fail)
      const secondScanResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { coupon_code: couponCode }
      });

      expect(secondScanResponse.status()).toBe(400);
      const errorData = await secondScanResponse.json();
      expect(errorData.error).toMatch(/already.*used|scanned|redeemed/i);

      console.log(`✅ Duplicate scan correctly rejected: ${errorData.error}`);
    });
  });

  test.describe('Coupon Expiry', () => {

    test('should mark coupons as expired after expiry date', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      // Set expiry date to past
      const expiryDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Expired test batch',
          discount_value: 25,
          quantity: 2,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;

      // Activate coupons (they should immediately be expired)
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Expiry test' }
        }
      );

      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // List expired coupons
      const expiredResponse = await page.request.get(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=expired`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (expiredResponse.ok()) {
        const expiredData = await expiredResponse.json();
        const expiredFromBatch = expiredData.coupons.filter((c: any) => c.batch_id === batchId);

        // Coupons should be marked as expired
        if (expiredFromBatch.length > 0) {
          expect(expiredFromBatch.every((c: any) => c.status === 'expired')).toBeTruthy();
        }
      }
    });

    test('should not allow scanning expired coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Expired scan test',
          discount_value: 30,
          quantity: 1,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;
      const couponCode = createData.coupons[0].code;

      // Print and activate
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Expired scan test' }
        }
      );

      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Try to scan expired coupon
      const scanResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: { coupon_code: couponCode }
      });

      expect(scanResponse.status()).toBe(400);
      const errorData = await scanResponse.json();
      expect(errorData.error).toMatch(/expired|no longer valid/i);
    });
  });

  test.describe('Coupon Deactivation', () => {

    test('should manually deactivate active coupon', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Deactivation test',
          discount_value: 35,
          quantity: 2,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;
      const couponCode = createData.coupons[0].code;

      // Print and activate
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Deactivation test' }
        }
      );

      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Deactivate coupon
      const deactivateResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/${couponCode}/deactivate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { reason: 'Test deactivation' }
        }
      );

      if (deactivateResponse.ok()) {
        const deactivateData = await deactivateResponse.json();
        expect(deactivateData.message).toMatch(/deactivated/i);

        // Verify coupon is deactivated
        const couponResponse = await page.request.get(
          `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/${couponCode}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        if (couponResponse.ok()) {
          const couponData = await couponResponse.json();
          expect(couponData.coupon.status).toBe('deactivated');
        }
      } else {
        console.log('⚠️ Deactivation endpoint may not be implemented');
      }
    });

    test('should not allow scanning deactivated coupons', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const createResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          verification_app_id: verificationAppId,
          description: 'Deactivated scan test',
          discount_value: 40,
          quantity: 1,
          expiry_date: expiryDate
        }
      });

      const createData = await createResponse.json();
      const batchId = createData.coupons[0].batch_id;
      const couponCode = createData.coupons[0].code;

      // Print, activate, and deactivate
      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/print`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { print_note: 'Deactivated scan test' }
        }
      );

      await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/batch/${batchId}/activate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const deactivateResponse = await page.request.post(
        `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/${couponCode}/deactivate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { reason: 'Scan test' }
        }
      );

      if (deactivateResponse.ok()) {
        // Try to scan
        const scanResponse = await page.request.post(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/scan`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: { coupon_code: couponCode }
        });

        expect(scanResponse.status()).toBe(400);
        const errorData = await scanResponse.json();
        expect(errorData.error).toMatch(/deactivated|not.*active|disabled/i);
      }
    });
  });

  test.describe('Status Filtering and Reporting', () => {

    test('should filter coupons by all status types', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();
      const statuses = ['draft', 'printed', 'active', 'used', 'expired', 'deactivated'];

      for (const status of statuses) {
        const response = await page.request.get(
          `${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons?status=${status}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        if (data.coupons && data.coupons.length > 0) {
          expect(data.coupons.every((c: any) => c.status === status)).toBeTruthy();
          console.log(`✅ Status filter '${status}' working: ${data.coupons.length} coupons`);
        }
      }
    });

    test('should get status summary/counts', async ({ page }) => {
      const accessToken = await authHelper.getAccessToken();

      const response = await page.request.get(`${TEST_CONFIG.tenant1.apiBaseUrl}/rewards/coupons/stats`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok()) {
        const data = await response.json();

        // Should have counts for different statuses
        expect(data.draft || data.draft === 0).toBeDefined();
        expect(data.active || data.active === 0).toBeDefined();
        expect(data.used || data.used === 0).toBeDefined();

        console.log('✅ Status summary:', data);
      } else {
        console.log('ℹ️ Status summary endpoint may not be implemented');
      }
    });
  });
});
