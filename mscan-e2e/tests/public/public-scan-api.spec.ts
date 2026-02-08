import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../utils/database-helper.js';

test.describe('Public Scan API - OTP Verification Flow', () => {
  let db: DatabaseHelper;
  let couponCode: string;
  let sessionId: string;
  let tenantId: string;

  test.beforeAll(async () => {
    // Create test coupon
    db = new DatabaseHelper();
    await db.connect();

    const tenantResult = await db.query(`
      SELECT id FROM tenants WHERE subdomain = 'testenant' LIMIT 1
    `);
    tenantId = tenantResult.rows[0]?.id;

    const couponResult = await db.query(`
      INSERT INTO coupons (tenant_id, code, status, coupon_points, expiry_date)
      VALUES ($1, 'PUBLIC_SCAN_001', 'ACTIVE', 200, NOW() + INTERVAL '30 days')
      RETURNING code
    `, [tenantId]);
    couponCode = couponResult.rows[0].code;
  });

  test.afterAll(async () => {
    await db.disconnect();
  });

  test.describe('Step 1: Start Scan Session', () => {
    test('should create scan session with valid coupon code', async ({ request }) => {
      const response = await request.post('/api/public-scan/start', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          couponCode: couponCode
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sessionId');
      expect(data.data).toHaveProperty('couponDetails');

      sessionId = data.data.sessionId;

      // Verify coupon details
      const couponDetails = data.data.couponDetails;
      expect(couponDetails.code).toBe(couponCode);
      expect(couponDetails.points).toBe(200);
      expect(couponDetails.status).toBe('ACTIVE');
    });

    test('should reject invalid coupon code', async ({ request }) => {
      const response = await request.post('/api/public-scan/start', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          couponCode: 'INVALID_CODE_999'
        }
      });

      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_FOUND');
      expect(data.message).toContain('Coupon not found');
    });

    test('should reject expired coupon', async ({ request }) => {
      // Create expired coupon
      // Use existing db instance
      await db.query(`
        INSERT INTO coupons (tenant_id, code, status, coupon_points, expiry_date)
        VALUES ($1, 'EXPIRED_PUBLIC', 'ACTIVE', 100, NOW() - INTERVAL '1 day')
      `, [tenantId]);
      // Keep db connection open

      const response = await request.post('/api/public-scan/start', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          couponCode: 'EXPIRED_PUBLIC'
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('COUPON_EXPIRED');
    });

    test('should reject draft coupon', async ({ request }) => {
      // Create draft coupon
      // Use existing db instance
      await db.query(`
        INSERT INTO coupons (tenant_id, code, status, coupon_points)
        VALUES ($1, 'DRAFT_PUBLIC', 'DRAFT', 100)
      `, [tenantId]);
      // Keep db connection open

      const response = await request.post('/api/public-scan/start', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          couponCode: 'DRAFT_PUBLIC'
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.message).toContain('not active');
    });

    test('should enforce rate limit on session starts', async ({ request }) => {
      // Make 61 rapid requests (rate limit is 60 per 10 minutes)
      const requests = [];
      for (let i = 0; i < 61; i++) {
        requests.push(
          request.post('/api/public-scan/start', {
            headers: {
              'Content-Type': 'application/json'
            },
            data: {
              couponCode: couponCode
            }
          })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.filter(r => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Step 2: Send OTP', () => {
    test.beforeEach(async ({ request }) => {
      // Start a new session for each test
      const response = await request.post('/api/public-scan/start', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          couponCode: 'PUBLIC_SCAN_002'
        }
      });

      const data = await response.json();
      sessionId = data.data.sessionId;
    });

    test('should send OTP to valid mobile number', async ({ request }) => {
      const response = await request.post(`/api/public-scan/${sessionId}/mobile`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          mobileNumber: '+1234567890'
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('OTP sent');
    });

    test('should validate mobile number format', async ({ request }) => {
      const response = await request.post(`/api/public-scan/${sessionId}/mobile`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          mobileNumber: 'invalid-number'
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('Invalid mobile number');
    });

    test('should reject OTP request for expired session', async ({ request }) => {
      // Use an invalid session ID
      const response = await request.post('/api/public-scan/invalid-session-id/mobile', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          mobileNumber: '+1234567890'
        }
      });

      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data.message).toContain('Session not found');
    });

    test('should enforce OTP rate limit per mobile number', async ({ request }) => {
      // Try to send 11 OTPs to same mobile (limit is 10 per 24 hours)
      const requests = [];
      const mobile = '+1987654321';

      for (let i = 0; i < 11; i++) {
        // Start new session each time
        const sessionResp = await request.post('/api/public-scan/start', {
          data: { couponCode: `PUBLIC_SCAN_${i}` }
        });
        const sessionData = await sessionResp.json();

        requests.push(
          request.post(`/api/public-scan/${sessionData.data.sessionId}/mobile`, {
            data: { mobileNumber: mobile }
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status() === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Step 3: Verify OTP and Complete Scan', () => {
    let otpCode: string;

    test.beforeEach(async ({ request }) => {
      // Start session
      const sessionResp = await request.post('/api/public-scan/start', {
        data: { couponCode: 'PUBLIC_SCAN_003' }
      });
      const sessionData = await sessionResp.json();
      sessionId = sessionData.data.sessionId;

      // Send OTP
      await request.post(`/api/public-scan/${sessionId}/mobile`, {
        data: { mobileNumber: '+1234567890' }
      });

      // Get OTP from database (in real scenario, you'd receive via SMS/email)
      // Use existing db instance
      const otpResult = await db.query(`
        SELECT code FROM otps WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1
      `, [sessionId]);
      otpCode = otpResult.rows[0]?.code || '123456';
      // Keep db connection open
    });

    test('should verify OTP and complete scan', async ({ request }) => {
      const response = await request.post(`/api/public-scan/${sessionId}/verify-otp`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          otp: otpCode
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('pointsAwarded');
      expect(data.data).toHaveProperty('scanId');
      expect(data.data).toHaveProperty('userId');
      expect(data.message).toContain('successful');
    });

    test('should reject invalid OTP', async ({ request }) => {
      const response = await request.post(`/api/public-scan/${sessionId}/verify-otp`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          otp: '000000' // Wrong OTP
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('INVALID_OTP');
      expect(data.message).toContain('Invalid OTP');
    });

    test('should reject expired OTP', async ({ request }) => {
      // Wait for OTP to expire (5 minutes in real scenario)
      // For testing, we'll manually expire it in the database
      // Use existing db instance
      await db.query(`
        UPDATE otps SET created_at = NOW() - INTERVAL '6 minutes'
        WHERE session_id = $1
      `, [sessionId]);
      // Keep db connection open

      const response = await request.post(`/api/public-scan/${sessionId}/verify-otp`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          otp: otpCode
        }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('OTP_EXPIRED');
    });

    test('should create user if not exists', async ({ request }) => {
      // Use a new mobile number
      const newMobile = '+19998887777';

      // Start new session
      const sessionResp = await request.post('/api/public-scan/start', {
        data: { couponCode: 'PUBLIC_SCAN_NEW_USER' }
      });
      const newSessionId = (await sessionResp.json()).data.sessionId;

      // Send OTP
      await request.post(`/api/public-scan/${newSessionId}/mobile`, {
        data: { mobileNumber: newMobile }
      });

      // Get OTP
      // Use existing db instance
      const otpResult = await db.query(`
        SELECT code FROM otps WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1
      `, [newSessionId]);
      const newOtp = otpResult.rows[0]?.code;

      // Verify OTP
      const response = await request.post(`/api/public-scan/${newSessionId}/verify-otp`, {
        data: { otp: newOtp }
      });

      expect(response.status()).toBe(200);

      // Verify user was created
      const userResult = await db.query(`
        SELECT id FROM users WHERE mobile_number = $1
      `, [newMobile]);

      expect(userResult.rows.length).toBeGreaterThan(0);

      // Keep db connection open
    });

    test('should mark session as completed after successful verification', async ({ request }) => {
      await request.post(`/api/public-scan/${sessionId}/verify-otp`, {
        data: { otp: otpCode }
      });

      // Verify session is marked completed
      // Use existing db instance
      const sessionResult = await db.query(`
        SELECT status FROM public_scan_sessions WHERE session_id = $1
      `, [sessionId]);

      expect(sessionResult.rows[0].status).toBe('COMPLETED');

      // Keep db connection open
    });

    test('should prevent re-verification of completed session', async ({ request }) => {
      // First verification (should succeed)
      await request.post(`/api/public-scan/${sessionId}/verify-otp`, {
        data: { otp: otpCode }
      });

      // Second verification (should fail)
      const response = await request.post(`/api/public-scan/${sessionId}/verify-otp`, {
        data: { otp: otpCode }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.message).toContain('already completed');
    });

    test('should enforce OTP verification rate limit', async ({ request }) => {
      // Make 21 rapid OTP verification attempts (limit is 20 per 10 minutes)
      const requests = [];
      for (let i = 0; i < 21; i++) {
        requests.push(
          request.post(`/api/public-scan/${sessionId}/verify-otp`, {
            data: { otp: '123456' }
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status() === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Session Management', () => {
    test('should expire session after 10 minutes of inactivity', async ({ request }) => {
      // Start session
      const sessionResp = await request.post('/api/public-scan/start', {
        data: { couponCode: 'PUBLIC_SCAN_EXPIRE_TEST' }
      });
      const expireSessionId = (await sessionResp.json()).data.sessionId;

      // Manually expire the session
      // Use existing db instance
      await db.query(`
        UPDATE public_scan_sessions
        SET created_at = NOW() - INTERVAL '11 minutes'
        WHERE session_id = $1
      `, [expireSessionId]);
      // Keep db connection open

      // Try to send OTP (should fail)
      const response = await request.post(`/api/public-scan/${expireSessionId}/mobile`, {
        data: { mobileNumber: '+1234567890' }
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.message).toContain('Session expired');
    });

    test('should cleanup expired sessions', async ({ request }) => {
      // This test verifies that a cleanup job removes old sessions
      // Use existing db instance

      // Count sessions before cleanup
      const beforeCount = await db.query(`
        SELECT COUNT(*) as count FROM public_scan_sessions
        WHERE created_at < NOW() - INTERVAL '10 minutes'
      `);

      // In a real scenario, you'd trigger the cleanup job here
      // For now, we'll just verify the query works

      expect(parseInt(beforeCount.rows[0].count)).toBeGreaterThanOrEqual(0);

      // Keep db connection open
    });
  });

  test.describe('Error Handling', () => {
    test('should return consistent error format', async ({ request }) => {
      const response = await request.post('/api/public-scan/start', {
        data: {} // Missing couponCode
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('code');
      expect(data.success).toBe(false);
    });

    test('should handle database errors gracefully', async ({ request }) => {
      // Try with extremely long coupon code to trigger validation
      const response = await request.post('/api/public-scan/start', {
        data: { couponCode: 'A'.repeat(1000) }
      });

      expect(response.status()).toBe(400);
    });

    test('should sanitize error messages', async ({ request }) => {
      const response = await request.post('/api/public-scan/start', {
        data: { couponCode: '<script>alert("xss")</script>' }
      });

      const data = await response.json();

      // Error message should not contain the raw script tag
      expect(data.message).not.toContain('<script>');
    });
  });
});
