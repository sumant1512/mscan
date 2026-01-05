import { test, expect, request } from '@playwright/test';
import { Client } from 'pg';

const DB_CFG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
};

async function setupActiveCoupon(client: Client, subdomain: string) {
  const tenantRes = await client.query(
    'SELECT id FROM tenants WHERE subdomain_slug = $1 LIMIT 1',
    [subdomain]
  );
  if (tenantRes.rows.length === 0) throw new Error(`Tenant not found for subdomain ${subdomain}`);
  const tenantId = tenantRes.rows[0].id;
  const code = 'E2E-QR-001';
  const exists = await client.query('SELECT id FROM coupons WHERE coupon_code = $1', [code]);
  if (exists.rows.length === 0) {
    await client.query(
      `INSERT INTO coupons (
        tenant_id, coupon_code, discount_type, discount_value, discount_currency,
        expiry_date, credit_cost, status, coupon_points
      ) VALUES ($1, $2, 'FIXED_AMOUNT', 1.00, 'USD', CURRENT_TIMESTAMP + INTERVAL '1 year', 1, 'active', 25)`,
      [tenantId, code]
    );
  } else {
    await client.query(`UPDATE coupons SET status = 'active', coupon_points = 25 WHERE coupon_code = $1`, [code]);
  }
  return { tenantId, code };
}

async function getSessionOtp(client: Client, sessionId: string) {
  const r = await client.query('SELECT otp_code FROM scan_sessions WHERE id = $1', [sessionId]);
  if (r.rows.length === 0) throw new Error('Session not found');
  return r.rows[0].otp_code as string;
}

async function getBalance(client: Client, tenantId: string, mobile: string) {
  const r = await client.query('SELECT balance FROM user_points WHERE tenant_id = $1 AND mobile_e164 = $2', [tenantId, mobile]);
  return r.rows.length ? r.rows[0].balance as number : 0;
}

test.describe('Public QR landing → login → award → redeem', () => {
  const subdomain = 'sumant';
  const hostHeader = `localhost`;
  const mobile = '+919999999999';

  test('complete scan flow awards per-QR points', async ({}) => {
    const dbClient = new Client(DB_CFG);
    await dbClient.connect();
    try {
      const { tenantId, code } = await setupActiveCoupon(dbClient, subdomain);

      // Landing
      const landingContext = await request.newContext({ baseURL: 'http://127.0.0.1:3000', extraHTTPHeaders: { Host: hostHeader } });
      const landingResp = await landingContext.get(`/scan/${code}`);
      expect(landingResp.ok()).toBeTruthy();
      const landingJson = await landingResp.json();
      expect(landingJson.success).toBeTruthy();
      expect(landingJson.status).toBe('pending-verification');

      // Start session
      const apiContext = await request.newContext({ baseURL: 'http://127.0.0.1:3000/api/public/scan', extraHTTPHeaders: { Host: hostHeader } });
      const startResp = await apiContext.post(`/start`, { data: { coupon_code: code } });
      expect(startResp.ok()).toBeTruthy();
      const startJson = await startResp.json();
      expect(startJson.success).toBeTruthy();
      const sessionId = startJson.session_id as string;

      // Submit mobile
      const mobileResp = await apiContext.post(`/${sessionId}/mobile`, { data: { mobile_e164: mobile, consent_acceptance: true } });
      expect(mobileResp.ok()).toBeTruthy();
      const mobileJson = await mobileResp.json();
      expect(mobileJson.success).toBeTruthy();

      // Fetch OTP from DB
      const otp = await getSessionOtp(dbClient, sessionId);
      expect(otp).toBeTruthy();

      // Verify OTP
      const verifyResp = await apiContext.post(`/${sessionId}/verify-otp`, { data: { otp_code: otp } });
      expect(verifyResp.ok()).toBeTruthy();
      const verifyJson = await verifyResp.json();
      expect(verifyJson.success).toBeTruthy();
      expect(verifyJson.awarded_points).toBe(25);
      expect(verifyJson.coupon_status).toBe('redeemed');

      // Check balance
      const balance = await getBalance(dbClient, tenantId, mobile);
      expect(balance).toBeGreaterThanOrEqual(25);
    } finally {
      await dbClient.end();
    }
  });
});
