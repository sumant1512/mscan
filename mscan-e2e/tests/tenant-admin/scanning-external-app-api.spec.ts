import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../utils/database-helper.js';

test.describe('External App API - Scanning Tests', () => {
  let db: DatabaseHelper;
  let apiKey: string;
  let appCode: string;
  let tenantId: string;
  let couponCode: string;
  let userId: string;

  test.beforeAll(async () => {
    // Setup: Create verification app and get API key
    db = new DatabaseHelper();
    await db.connect();

    // Get test tenant
    const tenantResult = await db.query(`
      SELECT id FROM tenants WHERE subdomain = 'testenant' LIMIT 1
    `);
    tenantId = tenantResult.rows[0]?.id;

    // Create verification app
    const appResult = await db.query(`
      INSERT INTO verification_apps (tenant_id, name, app_type, api_key_hash, is_active)
      VALUES ($1, 'Test External App', 'MOBILE', $2, true)
      RETURNING id, api_key_hash
    `, [tenantId, 'test_api_key_hash']);

    appCode = appResult.rows[0].id;
    apiKey = 'test_api_key'; // In real scenario, this would be the actual key

    // Create test coupon
    const couponResult = await db.query(`
      INSERT INTO coupons (tenant_id, code, status, coupon_points, expiry_date)
      VALUES ($1, 'EXT_API_TEST_001', 'ACTIVE', 100, NOW() + INTERVAL '30 days')
      RETURNING code
    `, [tenantId]);
    couponCode = couponResult.rows[0].code;

    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (tenant_id, email, user_type, mobile_number)
      VALUES ($1, 'extapi@test.com', 'TENANT_USER', '+1234567890')
      RETURNING id
    `, [tenantId]);
    userId = userResult.rows[0].id;
  });

  test.afterAll(async () => {
    await db.disconnect();
  });

  test('should authenticate with valid API key', async ({ request }) => {
    const response = await request.get(`/api/app/${appCode}/products`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should reject request with invalid API key', async ({ request }) => {
    const response = await request.get(`/api/app/${appCode}/products`, {
      headers: {
        'Authorization': `Bearer invalid_key`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Invalid authentication');
  });

  test('should reject request without API key', async ({ request }) => {
    const response = await request.get(`/api/app/${appCode}/products`);

    expect(response.status()).toBe(401);
  });

  test('should record successful coupon scan', async ({ request }) => {
    const response = await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: couponCode,
        userId: userId
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.pointsAwarded).toBe(100);
    expect(data.data.scanStatus).toBe('SUCCESS');
  });

  test('should prevent duplicate scan', async ({ request }) => {
    // First scan (should succeed)
    await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'EXT_API_TEST_002',
        userId: userId
      }
    });

    // Second scan (should fail)
    const response = await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'EXT_API_TEST_002',
        userId: userId
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('already used');
  });

  test('should reject expired coupon scan', async ({ request }) => {
    // Create expired coupon
    await db.query(`
      INSERT INTO coupons (tenant_id, code, status, coupon_points, expiry_date)
      VALUES ($1, 'EXPIRED_COUPON', 'ACTIVE', 50, NOW() - INTERVAL '1 day')
    `, [tenantId]);

    const response = await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'EXPIRED_COUPON',
        userId: userId
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('COUPON_EXPIRED');
    expect(data.message).toContain('expired');
  });

  test('should reject inactive coupon scan', async ({ request }) => {
    // Create draft coupon
    await db.query(`
      INSERT INTO coupons (tenant_id, code, status, coupon_points)
      VALUES ($1, 'DRAFT_COUPON', 'DRAFT', 50)
    `, [tenantId]);

    const response = await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'DRAFT_COUPON',
        userId: userId
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('not active');
  });

  test('should get user credit balance', async ({ request }) => {
    const response = await request.get(`/api/app/${appCode}/users/${userId}/credits`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.balance).toBeGreaterThanOrEqual(0);
    expect(data.data.userId).toBe(userId);
  });

  test('should get user credit transactions', async ({ request }) => {
    const response = await request.get(`/api/app/${appCode}/users/${userId}/credit-transactions`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.transactions)).toBe(true);

    if (data.data.transactions.length > 0) {
      const transaction = data.data.transactions[0];
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('timestamp');
    }
  });

  test('should get products list', async ({ request }) => {
    const response = await request.get(`/api/app/${appCode}/products`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.products)).toBe(true);
  });

  test('should redeem product with sufficient credits', async ({ request }) => {
    // First, award some credits via scan
    await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'REDEEM_TEST_001',
        userId: userId
      }
    });

    // Now redeem a product
    const response = await request.post(`/api/app/${appCode}/redeem`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        userId: userId,
        productId: 'some-product-id',
        creditsRequired: 50
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.newBalance).toBeLessThan(data.data.previousBalance);
  });

  test('should enforce rate limiting', async ({ request }) => {
    // Make 101 rapid requests (rate limit is 100/minute)
    const requests = [];
    for (let i = 0; i < 101; i++) {
      requests.push(
        request.get(`/api/app/${appCode}/products`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
    }

    const responses = await Promise.all(requests);

    // At least one should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // Check rate limit response format
    const limitedResponse = rateLimitedResponses[0];
    const data = await limitedResponse.json();
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(data.message).toContain('Rate limit exceeded');
  });

  test('should return consistent error format', async ({ request }) => {
    const response = await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        // Missing required fields
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('code');
    expect(data.success).toBe(false);
  });

  test('should validate request payload', async ({ request }) => {
    const response = await request.post(`/api/app/${appCode}/scans`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: '', // Empty code
        userId: 'invalid-uuid'
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.code).toBe('VALIDATION_ERROR');
  });
});
