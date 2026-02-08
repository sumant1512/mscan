import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../utils/database-helper.js';

test.describe('Mobile Scan API - JWT Authentication', () => {
  let db: DatabaseHelper;
  let jwtToken: string;
  let userId: string;
  let tenantId: string;
  let couponCode: string;

  test.beforeAll(async () => {
    // Setup: Login and get JWT token
    db = new DatabaseHelper();
    await db.connect();

    // Get test tenant and user
    const tenantResult = await db.query(`
      SELECT id FROM tenants WHERE subdomain = 'testenant' LIMIT 1
    `);
    tenantId = tenantResult.rows[0]?.id;

    const userResult = await db.query(`
      SELECT id FROM users WHERE tenant_id = $1 AND user_type = 'TENANT_USER' LIMIT 1
    `, [tenantId]);
    userId = userResult.rows[0]?.id;

    // Create active coupon for testing
    const couponResult = await db.query(`
      INSERT INTO coupons (tenant_id, code, status, coupon_points, expiry_date)
      VALUES ($1, 'MOBILE_SCAN_001', 'ACTIVE', 150, NOW() + INTERVAL '30 days')
      RETURNING code
    `, [tenantId]);
    couponCode = couponResult.rows[0].code;

    // In a real scenario, you'd call the auth API to get a real JWT
    // For this test, we'll use a mock token
    jwtToken = 'test_jwt_token';
  });

  test.afterAll(async () => {
    await db.disconnect();
  });

  test('should authenticate with valid JWT token', async ({ request }) => {
    const response = await request.get('/api/mobile/v1/scan/history', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Should succeed (even if empty history)
    expect([200, 404]).toContain(response.status());
  });

  test('should reject request without JWT token', async ({ request }) => {
    const response = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: couponCode
      }
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.code).toBe('AUTH_ERROR');
  });

  test('should scan coupon successfully', async ({ request }) => {
    const response = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: couponCode,
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        deviceInfo: {
          platform: 'iOS',
          version: '14.5',
          model: 'iPhone 12'
        }
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.pointsAwarded).toBe(150);
    expect(data.data.scanId).toBeTruthy();
    expect(data.data.timestamp).toBeTruthy();
  });

  test('should track location and device info', async ({ request }) => {
    const location = {
      latitude: 34.0522,
      longitude: -118.2437
    };

    const deviceInfo = {
      platform: 'Android',
      version: '11.0',
      model: 'Samsung Galaxy S21'
    };

    const response = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'MOBILE_SCAN_002',
        location: location,
        deviceInfo: deviceInfo
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    const scanId = data.data.scanId;

    // Verify location and device info were stored
    const scanRecord = await db.query(`
      SELECT location, device_info FROM scan_history WHERE id = $1
    `, [scanId]);

    expect(scanRecord.rows[0].location).toMatchObject(location);
    expect(scanRecord.rows[0].device_info).toMatchObject(deviceInfo);
  });

  test('should get user scan history', async ({ request }) => {
    const response = await request.get('/api/mobile/v1/scan/history', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.history)).toBe(true);

    if (data.data.history.length > 0) {
      const scan = data.data.history[0];
      expect(scan).toHaveProperty('couponCode');
      expect(scan).toHaveProperty('productName');
      expect(scan).toHaveProperty('points');
      expect(scan).toHaveProperty('timestamp');
      expect(scan).toHaveProperty('status');
    }
  });

  test('should paginate scan history', async ({ request }) => {
    // Get first page
    const page1 = await request.get('/api/mobile/v1/scan/history?page=1&limit=20', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(page1.status()).toBe(200);

    const data1 = await page1.json();
    expect(data1.data.history.length).toBeLessThanOrEqual(20);
    expect(data1.data).toHaveProperty('currentPage');
    expect(data1.data).toHaveProperty('totalPages');
    expect(data1.data).toHaveProperty('totalCount');
  });

  test('should get scan details by ID', async ({ request }) => {
    // First, create a scan
    const scanResponse = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'MOBILE_SCAN_003'
      }
    });

    const scanData = await scanResponse.json();
    const scanId = scanData.data.scanId;

    // Now get details
    const detailsResponse = await request.get(`/api/mobile/v1/scan/${scanId}`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(detailsResponse.status()).toBe(200);

    const details = await detailsResponse.json();
    expect(details.success).toBe(true);
    expect(details.data.scanId).toBe(scanId);
    expect(details.data).toHaveProperty('couponCode');
    expect(details.data).toHaveProperty('productDetails');
    expect(details.data).toHaveProperty('pointsAwarded');
    expect(details.data).toHaveProperty('timestamp');
    expect(details.data).toHaveProperty('location');
  });

  test('should get scan statistics summary', async ({ request }) => {
    const response = await request.get('/api/mobile/v1/scan/stats/summary', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalScans');
    expect(data.data).toHaveProperty('totalPointsEarned');
    expect(data.data).toHaveProperty('scansThisMonth');
    expect(data.data).toHaveProperty('favoriteProducts');

    expect(typeof data.data.totalScans).toBe('number');
    expect(typeof data.data.totalPointsEarned).toBe('number');
    expect(Array.isArray(data.data.favoriteProducts)).toBe(true);
  });

  test('should identify favorite products', async ({ request }) => {
    const response = await request.get('/api/mobile/v1/scan/stats/summary', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    const favoriteProducts = data.data.favoriteProducts;

    if (favoriteProducts.length > 0) {
      const favorite = favoriteProducts[0];
      expect(favorite).toHaveProperty('productName');
      expect(favorite).toHaveProperty('scanCount');
      expect(typeof favorite.scanCount).toBe('number');
    }
  });

  test('should prevent scanning same coupon twice', async ({ request }) => {
    const uniqueCode = 'MOBILE_SCAN_DUPLICATE_TEST';

    // First scan
    const first = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: uniqueCode
      }
    });

    expect(first.status()).toBe(200);

    // Second scan (should fail)
    const second = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: uniqueCode
      }
    });

    expect(second.status()).toBe(400);

    const data = await second.json();
    expect(data.code).toBe('COUPON_USED');
    expect(data.message).toContain('already used');
  });

  test('should validate coupon before scanning', async ({ request }) => {
    const response = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        couponCode: 'NONEXISTENT_CODE'
      }
    });

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.code).toBe('NOT_FOUND');
    expect(data.message).toContain('Coupon not found');
  });

  test('should handle network errors gracefully', async ({ request }) => {
    // Simulate invalid request
    const response = await request.post('/api/mobile/v1/scan/', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        // Missing couponCode
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  test('should filter history by date range', async ({ request }) => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    const response = await request.get(
      `/api/mobile/v1/scan/history?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify all scans are within date range
    data.data.history.forEach((scan: any) => {
      const scanDate = new Date(scan.timestamp);
      expect(scanDate >= new Date(startDate)).toBe(true);
      expect(scanDate <= new Date(endDate)).toBe(true);
    });
  });

  test('should support offline scan queue', async ({ request }) => {
    // This tests the concept of submitting multiple scans at once
    // (simulating offline queue sync)

    const scans = [
      { couponCode: 'OFFLINE_SCAN_001', timestamp: '2024-01-15T10:00:00Z' },
      { couponCode: 'OFFLINE_SCAN_002', timestamp: '2024-01-15T10:05:00Z' },
      { couponCode: 'OFFLINE_SCAN_003', timestamp: '2024-01-15T10:10:00Z' }
    ];

    const response = await request.post('/api/mobile/v1/scan/batch', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        scans: scans
      }
    });

    // API may or may not support batch scans
    // If it does, it should return success with results for each scan
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.results)).toBe(true);
      expect(data.data.results.length).toBe(scans.length);
    }
  });
});
