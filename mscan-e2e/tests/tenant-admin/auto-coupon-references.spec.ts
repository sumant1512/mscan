import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG, API_BASE_URL } from '../../utils/test-config.js';

test.describe('Automatic Coupon References', () => {
  let authHelper: AuthHelper;
  let authToken: string;
  let tenantId: string;
  let verificationAppId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    
    // Login as tenant admin
    await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
    
    // Get auth token and tenant ID from page context
    const authData = await page.evaluate(() => {
      const accessToken = localStorage.getItem('tms_access_token') || localStorage.getItem('auth_token');
      if (!accessToken) return null;
      
      // Decode JWT payload
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return {
        token: accessToken,
        tenantId: payload.tenant_id || payload.tenantId
      };
    });
    
    if (!authData) {
      throw new Error('Failed to get auth token from localStorage');
    }
    
    authToken = authData.token;
    tenantId = authData.tenantId;

    // Get or create verification app
    const appsResponse = await fetch(`${API_BASE_URL}/rewards/verification-apps`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const appsData = await appsResponse.json();

    if (appsData.apps.length > 0) {
      verificationAppId = appsData.apps[0].id;
    } else {
      const createResponse = await fetch(`${API_BASE_URL}/rewards/verification-apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          app_name: 'Auto Reference Test App',
          description: 'Test app for auto references'
        })
      });
      const createData = await createResponse.json();
      verificationAppId = createData.app.id;
    }
  });

  test('should auto-generate sequential references (CP-###) for all coupons', async () => {
    // Create coupons with only random codes
    const response = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Auto Reference Test Batch',
        discount_value: 10,
        quantity: 5,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.coupons).toBeDefined();
    expect(data.coupons.length).toBe(5);

    // Verify each coupon has both random code AND auto reference
    for (let i = 0; i < data.coupons.length; i++) {
      const coupon = data.coupons[i];
      
      // Random code check
      expect(coupon.coupon_code).toBeDefined();
      expect(coupon.coupon_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      
      // Auto reference check
      expect(coupon.coupon_reference).toBeDefined();
      expect(coupon.coupon_reference).toMatch(/^CP-\d{3}$/);
    }

    // Verify references are sequential
    const references = data.coupons.map((c: any) => c.coupon_reference).sort();
    for (let i = 1; i < references.length; i++) {
      const prevNum = parseInt(references[i - 1].split('-')[1]);
      const currNum = parseInt(references[i].split('-')[1]);
      expect(currNum).toBeGreaterThan(prevNum);
    }
  });

  test('should activate coupon range using references (CP-001 to CP-005)', async () => {
    // Create test coupons
    const createResponse = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Range Test Coupons',
        discount_value: 15,
        quantity: 10,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const createData = await createResponse.json();
    const coupons = createData.coupons;

    // Mark coupons as printed first
    for (const coupon of coupons) {
      await fetch(`${API_BASE_URL}/rewards/coupons/${coupon.id}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
    }

    // Get the first 5 references
    const references = coupons.map((c: any) => c.coupon_reference).sort();
    const fromRef = references[0];
    const toRef = references[4];

    // Activate range using references
    const activateResponse = await fetch(`${API_BASE_URL}/rewards/coupons/activate-range`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        from_reference: fromRef,
        to_reference: toRef,
        activation_note: 'Range activation test'
      })
    });

    expect(activateResponse.ok).toBe(true);
    const activateData = await activateResponse.json();
    expect(activateData.activated_count).toBe(5);
    expect(activateData.activated_references).toHaveLength(5);
  });

  test('should reject invalid reference ranges', async () => {
    // Try to activate with reversed range
    const response = await fetch(`${API_BASE_URL}/rewards/coupons/activate-range`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        from_reference: 'CP-050',
        to_reference: 'CP-001',
        activation_note: 'Should fail'
      })
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid range');
    expect(data.error).toContain('greater than');
  });

  test('should maintain reference sequence across multiple batches', async () => {
    // Create first batch
    const batch1Response = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Batch 1',
        discount_value: 5,
        quantity: 3,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const batch1Data = await batch1Response.json();
    const batch1Refs = batch1Data.coupons.map((c: any) => c.coupon_reference);

    // Create second batch
    const batch2Response = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Batch 2',
        discount_value: 5,
        quantity: 3,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const batch2Data = await batch2Response.json();
    const batch2Refs = batch2Data.coupons.map((c: any) => c.coupon_reference);

    // Verify batch 2 references continue from batch 1
    const maxBatch1Num = Math.max(...batch1Refs.map((r: string) => parseInt(r.split('-')[1])));
    const minBatch2Num = Math.min(...batch2Refs.map((r: string) => parseInt(r.split('-')[1])));
    
    expect(minBatch2Num).toBeGreaterThan(maxBatch1Num);
  });

  test('should display both coupon_code and coupon_reference in API responses', async () => {
    // Create a coupon
    const createResponse = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Display Test',
        discount_value: 20,
        quantity: 1,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const createData = await createResponse.json();
    const couponId = createData.coupons[0].id;

    // Fetch coupon details
    const getResponse = await fetch(`${API_BASE_URL}/rewards/coupons/${couponId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const getData = await getResponse.json();
    const coupon = getData.coupon;

    // Verify both fields present
    expect(coupon.coupon_code).toBeDefined();
    expect(coupon.coupon_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(coupon.coupon_reference).toBeDefined();
    expect(coupon.coupon_reference).toMatch(/^CP-\d{3}$/);

    // Verify they are different
    expect(coupon.coupon_code).not.toBe(coupon.coupon_reference);
  });

  test('should deactivate coupon range using references', async () => {
    // Create and print coupons
    const createResponse = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Deactivation Test',
        discount_value: 10,
        quantity: 5,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const createData = await createResponse.json();
    const coupons = createData.coupons;

    // Print and activate all
    for (const coupon of coupons) {
      await fetch(`${API_BASE_URL}/rewards/coupons/${coupon.id}/print`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await fetch(`${API_BASE_URL}/rewards/coupons/${coupon.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: 'active' })
      });
    }

    // Deactivate range
    const references = coupons.map((c: any) => c.coupon_reference).sort();
    const deactivateResponse = await fetch(`${API_BASE_URL}/rewards/coupons/deactivate-range`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        from_reference: references[0],
        to_reference: references[4],
        deactivation_reason: 'Test deactivation'
      })
    });

    expect(deactivateResponse.ok).toBe(true);
    const deactivateData = await deactivateResponse.json();
    expect(deactivateData.deactivated_count).toBe(5);
    expect(deactivateData.deactivated_references).toHaveLength(5);
  });

  test('should use random codes for scanning, references for management', async () => {
    // Create a coupon
    const createResponse = await fetch(`${API_BASE_URL}/rewards/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verification_app_id: verificationAppId,
        description: 'Usage Test',
        discount_value: 25,
        quantity: 1,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const createData = await createResponse.json();
    const coupon = createData.coupons[0];

    // Print and activate
    await fetch(`${API_BASE_URL}/rewards/coupons/${coupon.id}/print`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    await fetch(`${API_BASE_URL}/rewards/coupons/${coupon.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'active' })
    });

    // Verify scanning uses coupon_code (random)
    const scanResponse = await fetch(`${API_BASE_URL}/scans/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coupon_code: coupon.coupon_code,
        location_lat: 37.7749,
        location_lng: -122.4194
      })
    });

    expect(scanResponse.ok).toBe(true);
    const scanData = await scanResponse.json();
    expect(scanData.message).toContain('success');

    // Verify reference is for management (shows in list)
    const listResponse = await fetch(`${API_BASE_URL}/rewards/coupons?limit=100`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const listData = await listResponse.json();
    const foundCoupon = listData.coupons.find((c: any) => c.id === coupon.id);
    expect(foundCoupon.coupon_reference).toBe(coupon.coupon_reference);
  });
});
