/**
 * API-only tests for automatic coupon references
 * Tests the backend directly without UI login complexity
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers.js';
import { TEST_CONFIG, API_BASE_URL } from '../../utils/test-config.js';

// Helper to get auth token
async function getAuthToken(page: any): Promise<{ token: string; tenantId: string }> {
  const authHelper = new AuthHelper(page);
  await authHelper.loginAsTenantAdmin(TEST_CONFIG.tenant1);
  
  const authData = await page.evaluate(() => {
    const accessToken = localStorage.getItem('tms_access_token') || localStorage.getItem('auth_token');
    if (!accessToken) return null;
    
    try {
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return {
        token: accessToken,
        tenantId: String(payload.tenant_id || payload.tenantId)
      };
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  });
  
  if (!authData) {
    throw new Error('Failed to get auth token');
  }
  
  return authData;
}

test.describe('Auto Coupon References - API Tests', () => {
  let authToken: string;
  let tenantId: string;
  let verificationAppId: string;

  test.beforeAll(async ({browser}) => {
    // Get auth once for all tests
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      const authData = await getAuthToken(page);
      authToken = authData.token;
      tenantId = authData.tenantId;
      
      console.log('✅ Got auth token, tenant ID:', tenantId);
      
      // Get or create verification app
      const response = await page.request.get(`${API_BASE_URL}/rewards/verification-apps`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const data = await response.json();
      if (data.apps && data.apps.length > 0) {
        verificationAppId = data.apps[0].id;
        console.log('✅ Using existing verification app:', verificationAppId);
      } else {
        // Create one
        const createResponse = await page.request.post(`${API_BASE_URL}/rewards/verification-apps`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            app_name: 'Auto Test App',
            description: 'Test app for e2e'
          }
        });
        const createData = await createResponse.json();
        verificationAppId = createData.app.id;
        console.log('✅ Created verification app:', verificationAppId);
      }
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    } finally {
      await context.close();
    }
  });

  test('should auto-generate CP-### references for coupons', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/rewards/coupons`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'Auto Reference Test',
        discount_value: 10,
        quantity: 3,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    
    console.log('Created coupons:', JSON.stringify(data.coupons, null, 2));
    
    expect(data.coupons).toBeDefined();
    expect(data.coupons.length).toBe(3);

    // Check each coupon
    for (const coupon of data.coupons) {
      // Has random code
      expect(coupon.coupon_code).toBeDefined();
      expect(coupon.coupon_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      
      // Has auto reference
      expect(coupon.coupon_reference).toBeDefined();
      expect(coupon.coupon_reference).toMatch(/^CP-\d{3}$/);
      
      console.log(`  ${coupon.coupon_code} → ${coupon.coupon_reference}`);
    }
  });

  test('should maintain sequential references across batches', async ({ request }) => {
    // Create first batch
    const batch1 = await request.post(`${API_BASE_URL}/rewards/coupons`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'Batch 1',
        discount_value: 5,
        quantity: 2,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    const data1 = await batch1.json();
    const refs1 = data1.coupons.map((c: any) => c.coupon_reference);
    console.log('Batch 1 references:', refs1);

    // Create second batch
    const batch2 = await request.post(`${API_BASE_URL}/rewards/coupons`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'Batch 2',
        discount_value: 5,
        quantity: 2,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    const data2 = await batch2.json();
    const refs2 = data2.coupons.map((c: any) => c.coupon_reference);
    console.log('Batch 2 references:', refs2);

    // Verify batch 2 continues from batch 1
    const maxBatch1Num = Math.max(...refs1.map((r: string) => parseInt(r.split('-')[1])));
    const minBatch2Num = Math.min(...refs2.map((r: string) => parseInt(r.split('-')[1])));
    
    expect(minBatch2Num).toBeGreaterThan(maxBatch1Num);
  });

  test('should display coupon_reference in GET coupon response', async ({ request }) => {
    // Create a coupon
    const createResponse = await request.post(`${API_BASE_URL}/rewards/coupons`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        verification_app_id: verificationAppId,
        description: 'GET Test',
        discount_value: 15,
        quantity: 1,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    const createData = await createResponse.json();
    const couponId = createData.coupons[0].id;
    const expectedRef = createData.coupons[0].coupon_reference;

    // Fetch it back
    const getResponse = await request.get(`${API_BASE_URL}/rewards/coupons/${couponId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const getData = await getResponse.json();
    expect(getData.coupon.coupon_reference).toBe(expectedRef);
    expect(getData.coupon.coupon_code).toBeDefined();
  });
});
