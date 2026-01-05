import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../utils/database-helper';
import { TEST_CONFIG } from '../../utils/test-config';

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3000/api';

test.describe('Public Scan Flow', () => {
  let db: DatabaseHelper;

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
  });

  test.afterAll(async () => {
    await db.disconnect();
  });

  test('QR → start → mobile → verify-otp', async ({ request }) => {
    // Get an active coupon or use env override
    const envCoupon = process.env.E2E_ACTIVE_COUPON || '';
    const couponCode = envCoupon || await db.ensureActiveCoupon(TEST_CONFIG.tenant1.subdomain);
    test.skip(!couponCode, 'No active coupon available for public scan');

    // Start session
    const startRes = await request.post(`${API_BASE}/public/scan/start`, {
      data: { coupon_code: couponCode, device_id: 'e2e-device-001' }
    });
    expect(startRes.ok()).toBeTruthy();
    const startJson = await startRes.json();
    expect(startJson.success).toBeTruthy();
    const sessionId = startJson.session_id;

    // Collect mobile
    const mobile = process.env.E2E_TEST_MOBILE || '+15551234567';
    const collectRes = await request.post(`${API_BASE}/public/scan/${sessionId}/mobile`, {
      data: { mobile_e164: mobile, consent_acceptance: true }
    });
    expect(collectRes.ok()).toBeTruthy();
    const collectJson = await collectRes.json();
    expect(collectJson.success).toBeTruthy();

    // Get OTP (dev mode or DB)
    const devOtp = process.env.OTP_DEV_MODE === 'true' ? '000000' : null;
    const otp = devOtp || await db.getScanSessionOtp(sessionId);
    test.skip(!otp, 'No OTP available for session');

    // Verify OTP
    const verifyRes = await request.post(`${API_BASE}/public/scan/${sessionId}/verify-otp`, {
      data: { otp_code: otp }
    });
    expect(verifyRes.ok()).toBeTruthy();
    const verifyJson = await verifyRes.json();
    expect(verifyJson.success).toBeTruthy();
    expect(verifyJson).toHaveProperty('awarded_points');
    expect(verifyJson).toHaveProperty('user_balance');
    expect(verifyJson.coupon_status).toBe('redeemed');
  });
});
