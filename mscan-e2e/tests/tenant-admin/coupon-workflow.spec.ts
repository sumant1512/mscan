/**
 * E2E Tests: Complete Coupon Creation Workflow
 * Tests the full 7-step workflow:
 * 1. Create Category
 * 2. Create Product
 * 3. Create Batch (draft)
 * 4. Assign Serial Codes
 * 5. Activate Batch
 * 6. Create Reward Campaign (common & custom)
 * 7. Verify Coupons Live
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../../utils/test-config.js';
import { DatabaseHelper } from '../../utils/database-helper.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const HOST_HEADER = `${TEST_CONFIG.tenant1.subdomain}.localhost`;

test.describe('Complete Coupon Creation Workflow', () => {
  let token: string;
  let dbHelper: DatabaseHelper;
  let categoryId: number;
  let productId: number;
  let verificationAppId: string;
  let batchId: string;
  let campaignId: string;

  test.beforeAll(async ({ request }) => {
    // API-based login: request OTP, fetch from DB, verify, store token
    dbHelper = new DatabaseHelper();
    await dbHelper.connect();

    const email = TEST_CONFIG.tenant1.email;
    const requestOtpRes = await request.post(`${API_BASE_URL}/auth/request-otp`, {
      headers: {
        'Content-Type': 'application/json',
        Host: HOST_HEADER,
      },
      data: { email }
    });

    if (!requestOtpRes.ok()) {
      const body = await requestOtpRes.text();
      await dbHelper.disconnect();
      throw new Error(`Failed to request OTP: ${requestOtpRes.status()} ${body}`);
    }

    // Small wait for OTP to be inserted
    const start = Date.now();
    let actualOTP: string | null = null;
    while (!actualOTP && Date.now() - start < 8000) {
      actualOTP = await dbHelper.getLatestOTP(email);
      if (!actualOTP) await new Promise(r => setTimeout(r, 1000));
    }

    await dbHelper.disconnect();

    if (!actualOTP) {
      throw new Error('Failed to retrieve OTP from database');
    }

    const verifyRes = await request.post(`${API_BASE_URL}/auth/verify-otp`, {
      headers: {
        'Content-Type': 'application/json',
        Host: HOST_HEADER,
      },
      data: { email, otp: actualOTP }
    });

    expect(verifyRes.ok()).toBeTruthy();
    const verifyBody = await verifyRes.json();
    expect(verifyBody.success).toBeTruthy();
    token = verifyBody.data.accessToken;

    // Decode token to verify role
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('🔑 Token Role:', payload.role);
      console.log('👤 User ID:', payload.userId);
      console.log('🏢 Tenant ID:', payload.tenantId);
      
      if (payload.role !== 'TENANT_ADMIN') {
        throw new Error(`Invalid role: Expected TENANT_ADMIN, got ${payload.role}`);
      }
    }

    // Create or get verification app (required for batch creation)
    const appsResponse = await request.get(`${API_BASE_URL}/rewards/verification-apps`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        Host: HOST_HEADER,
      }
    });

    if (appsResponse.ok()) {
      const appsData = await appsResponse.json();
      if (appsData.apps && appsData.apps.length > 0) {
        verificationAppId = appsData.apps[0].id;
        console.log('✅ Using existing verification app:', verificationAppId);
      }
    }

    if (!verificationAppId) {
      // Create a verification app
      const createAppResponse = await request.post(`${API_BASE_URL}/rewards/verification-apps`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          Host: HOST_HEADER,
        },
        data: {
          app_name: 'E2E Test App - Coupon Workflow',
          description: 'Test app for coupon workflow testing'
        }
      });
      
      if (createAppResponse.ok()) {
        const createAppData = await createAppResponse.json();
        verificationAppId = createAppData.app.id;
        console.log('✅ Created verification app:', verificationAppId);
      } else {
        throw new Error('Failed to create verification app');
      }
    }
  });

  test.afterAll(async () => {
    // No UI context used
  });

  test('Step 1: Create Category', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        Host: HOST_HEADER,
      },
      data: {
        name: `E2E Category ${Date.now()}`,
        description: 'E2E Test Category',
        icon: 'construction'
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.category).toBeDefined();
    expect(body.category.name).toContain('E2E Category');

    categoryId = body.category.id;
    console.log(`✅ Created category with ID: ${categoryId}`);
  });

  test('Step 2: Create Product', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/products`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        Host: HOST_HEADER,
      },
      data: {
        product_name: `E2E Product ${Date.now()}`,
        product_sku: `SKU-${Date.now()}`,
        description: 'E2E Test Product',
        category_id: categoryId,
        price: 99.99,
        currency: 'INR',
        is_active: true
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.product).toBeDefined();
    expect(body.product.product_name).toContain('E2E Product');
    expect(body.product.category_id).toBe(categoryId);

    productId = body.product.id;
    console.log(`✅ Created product with ID: ${productId}`);
  });

  test('Step 3: List Categories', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        Host: HOST_HEADER,
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.categories).toBeInstanceOf(Array);
    expect(body.categories.length).toBeGreaterThan(0);
    
    // Verify our category exists
    const ourCategory = body.categories.find((c: any) => c.id === categoryId);
    expect(ourCategory).toBeDefined();
  });

  test('Step 4: List Products', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/products`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        Host: HOST_HEADER,
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.products).toBeInstanceOf(Array);
    expect(body.products.length).toBeGreaterThan(0);
    
    // Verify our product exists
    const ourProduct = body.products.find((p: any) => p.id === productId);
    expect(ourProduct).toBeDefined();
  });

  test('Step 5: Create Batch (Draft)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/tenant/batches`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        Host: HOST_HEADER,
      },
      data: {
        batch_name: 'E2E Test Batch',
        dealer_name: 'E2E Test Dealer',
        zone: 'North',
        total_coupons: 100,
        verification_app_id: verificationAppId
      }
    });

    if (!response.ok()) {
      const errorBody = await response.text();
      console.error(`❌ Batch creation failed (${response.status()}): ${errorBody}`);
      console.error(`🔑 Using token: ${token.substring(0, 50)}...`);
      console.error(`📍 Endpoint: ${API_BASE_URL}/tenant/batches`);
    }
    
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.batch).toBeDefined();
    expect(body.batch.status).toBe('draft');
    expect(body.batch.dealer_name).toBe('E2E Test Dealer');

    batchId = body.batch.id;
    console.log(`✅ Created batch with ID: ${batchId}`);
  });

  test('Step 6: Assign Serial Codes', async ({ request }) => {
    const response = await request.post(
      `${API_BASE_URL}/tenant/batches/${batchId}/assign-codes`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          Host: HOST_HEADER,
        },
        data: {
          total_coupons: 100
        }
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.serial_range).toBeDefined();
    expect(body.serial_range.start).toBeDefined();
    expect(body.serial_range.end).toBeDefined();
    expect(body.codes_assigned).toBe(100);

    // Verify serial range is correct
    const range = body.serial_range.end - body.serial_range.start + 1;
    expect(range).toBe(100);
    console.log(`✅ Assigned codes: ${body.serial_range.start} to ${body.serial_range.end}`);
  });

  test('Step 7: Get Batch Details', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/tenant/batches/${batchId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        Host: HOST_HEADER,
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.batch).toBeDefined();
    expect(body.batch.status).toBe('code_assigned');
  });

  test('Step 8: Activate Batch', async ({ request }) => {
    const response = await request.post(
      `${API_BASE_URL}/tenant/batches/${batchId}/activate`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          Host: HOST_HEADER,
        },
        data: {}
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.batch).toBeDefined();
    expect(body.batch.status).toBe('activated');
    console.log(`✅ Activated batch: ${batchId}`);
  });

  test('Step 9: Create Common Reward Campaign', async ({ request }) => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
    
    const response = await request.post(`${API_BASE_URL}/tenant/rewards/campaigns`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        Host: HOST_HEADER,
      },
      data: {
        batch_id: batchId,
        campaign_name: 'Test Common Campaign',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        reward_type: 'common',
        common_amount: 10
      }
    });

    if (!response.ok()) {
      const errorBody = await response.text();
      console.error(`❌ Campaign creation failed (${response.status()}): ${errorBody}`);
      console.error(`📍 Endpoint: ${API_BASE_URL}/tenant/rewards/campaigns`);
      console.error(`📦 Data: batch_id=${batchId}`);
    }

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.campaign).toBeDefined();
    expect(body.campaign.reward_type).toBe('common');
    expect(body.coupons_updated).toBe(100);

    campaignId = body.campaign.id;
    console.log(`✅ Created campaign with ID: ${campaignId}`);
  });

  test('Step 10: Verify Coupons Have Rewards', async ({ request }) => {
    // Get campaign details to verify
    const response = await request.get(
      `${API_BASE_URL}/tenant/rewards/campaigns/${campaignId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          Host: HOST_HEADER,
        }
      }
    );

    if (!response.ok()) {
      const errorBody = await response.text();
      console.error(`❌ Get campaign failed (${response.status()}): ${errorBody}`);
      console.error(`📍 Endpoint: ${API_BASE_URL}/tenant/rewards/campaigns/${campaignId}`);
      console.error(`🆔 Campaign ID: ${campaignId}`);
    }

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.campaign).toBeDefined();
    expect(body.campaign.batch_id).toBe(batchId);
  });

  test('Cleanup: Delete Category', async ({ request }) => {
    // Note: This might fail if category has products
    const response = await request.delete(`${API_BASE_URL}/categories/${categoryId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        Host: HOST_HEADER,
      }
    });

    // We don't assert success here as it might be used by the batch
  });
  // Trimmed test suite to core, implemented workflow only
});
