/**
 * Database Helper for E2E Tests
 * Provides direct database access to fetch OTPs and verify data
 */
import { Client } from 'pg';

export class DatabaseHelper {
  private client: Client;

  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mscan_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin'
    });
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Connected to database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.client.end();
    console.log('🔌 Disconnected from database');
  }

  /**
   * Execute a raw SQL query (for advanced test scenarios)
   */
  async query(queryText: string, params?: any[]): Promise<any> {
    try {
      return await this.client.query(queryText, params);
    } catch (error) {
      console.error('❌ Query failed:', error);
      throw error;
    }
  }

  /**
   * Clean up tenant and all related data
   */
  async cleanupTenant(tenantId: string): Promise<void> {
    try {
      // Delete in order due to foreign key constraints
      await this.client.query('DELETE FROM audit_logs WHERE metadata->>\'tenant_id\' = $1', [tenantId]);
      await this.client.query('DELETE FROM permission_assignments WHERE tenant_id = $1', [tenantId]);
      await this.client.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
      await this.client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      console.log(`🧹 Cleaned up tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup tenant ${tenantId}:`, error);
    }
  }

  /**
   * Get the most recent OTP for an email
   */
  async getLatestOTP(email: string): Promise<string | null> {
    try {
      const result = await this.client.query(
        `SELECT otp_code 
         FROM otps 
         WHERE email = $1 AND is_used = false 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [email]
      );

      if (result.rows.length === 0) {
        console.log(`⚠️  No OTP found for ${email}`);
        return null;
      }

      const otp = result.rows[0].otp_code;
      console.log(`🔐 Retrieved OTP for ${email}: ${otp}`);
      return otp;
    } catch (error) {
      console.error('❌ Failed to get OTP:', error);
      return null;
    }
  }

  /**
   * Clean up test OTPs
   */
  async cleanupOTPs(email: string): Promise<void> {
    try {
      await this.client.query(
        'DELETE FROM otps WHERE email = $1',
        [email]
      );
      console.log(`🧹 Cleaned up OTPs for ${email}`);
    } catch (error) {
      console.error('❌ Failed to cleanup OTPs:', error);
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const result = await this.client.query(
        `SELECT id, email, role, tenant_id, is_active 
         FROM users 
         WHERE email = $1`,
        [email]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Failed to get user:', error);
      return null;
    }
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<any | null> {
    try {
      const result = await this.client.query(
        `SELECT id, name, subdomain, is_active 
         FROM tenants 
         WHERE subdomain = $1`,
        [subdomain]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Failed to get tenant:', error);
      return null;
    }
  }

  /**
   * Get one active coupon code for public scan tests
   */
  async getActiveCouponCode(): Promise<string | null> {
    try {
      const result = await this.client.query(
        `SELECT coupon_code FROM coupons WHERE status = 'active' LIMIT 1`
      );
      return result.rows.length > 0 ? result.rows[0].coupon_code : null;
    } catch (error) {
      console.error('❌ Failed to get active coupon:', error);
      return null;
    }
  }

  /**
   * Ensure there is at least one active coupon for a tenant.
   * If none exists, create a minimal active coupon and return its code.
   */
  async ensureActiveCoupon(tenantSubdomain: string): Promise<string | null> {
    try {
      // Find tenant by subdomain
      const tenantRes = await this.client.query(
        `SELECT id FROM tenants WHERE subdomain_slug = $1 LIMIT 1`,
        [tenantSubdomain]
      );
      if (tenantRes.rows.length === 0) {
        console.warn(`⚠️  No tenant found for subdomain: ${tenantSubdomain}`);
        return null;
      }
      const tenantId = tenantRes.rows[0].id;

      // Check for existing active coupon
      const existing = await this.client.query(
        `SELECT coupon_code FROM coupons WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
        [tenantId]
      );
      if (existing.rows.length > 0) {
        return existing.rows[0].coupon_code;
      }

      // Create a new minimal active coupon
      const code = `E2E-${Date.now()}`;
      const insert = await this.client.query(
        `INSERT INTO coupons (
            tenant_id, coupon_code, discount_type, discount_value, expiry_date,
            credit_cost, status, coupon_points, total_usage_limit, current_usage_count
        ) VALUES (
          $1, $2, 'FIXED_AMOUNT', 1.00, NOW() + INTERVAL '30 days',
          1, 'active', 10, 1, 0
        ) RETURNING coupon_code`,
        [tenantId, code]
      );
      return insert.rows[0].coupon_code;
    } catch (error) {
      console.error('❌ Failed to ensure active coupon:', error);
      return null;
    }
  }

  /**
   * Get OTP code for a scan session
   */
  async getScanSessionOtp(sessionId: string): Promise<string | null> {
    try {
      const result = await this.client.query(
        `SELECT otp_code FROM scan_sessions WHERE id = $1`,
        [sessionId]
      );
      return result.rows.length > 0 ? result.rows[0].otp_code : null;
    } catch (error) {
      console.error('❌ Failed to get scan session OTP:', error);
      return null;
    }
  }
}
