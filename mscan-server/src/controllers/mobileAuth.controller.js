const db = require('../config/database');
const tokenService = require('../services/token.service');

function validateE164(phone) {
  return /^\+?[1-9]\d{7,14}$/.test(phone);
}

function generateOtp() {
  if (process.env.OTP_DEV_MODE === 'true') return '000000';
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.requestOtp = async (req, res) => {
  try {
    const tenant = req.tenant;
    const { phone_e164 } = req.body;
    if (!tenant) {
      return res.status(400).json({ success: false, error: 'tenant_required' });
    }
    if (!phone_e164 || !validateE164(phone_e164)) {
      return res.status(400).json({ success: false, error: 'invalid_phone' });
    }
    const otp = generateOtp();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    // invalidate previous unused
    await db.query(
      'UPDATE mobile_otps SET is_used = true WHERE tenant_id = $1 AND phone_e164 = $2 AND is_used = false',
      [tenant.id, phone_e164]
    );
    await db.query(
      `INSERT INTO mobile_otps (tenant_id, phone_e164, otp_code, expires_at, attempts, is_used)
       VALUES ($1, $2, $3, $4, 0, false)`,
      [tenant.id, phone_e164, otp, expiresAt]
    );
    console.log(`[Mobile OTP] Tenant ${tenant.id} ${phone_e164} → OTP ${otp}`);
    return res.json({ success: true, message: 'OTP sent', expiresIn: expiryMinutes });
  } catch (err) {
    console.error('mobile.requestOtp error:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
};

exports.verifyOtp = async (req, res) => {
  const client = await db.getClient();
  try {
    const tenant = req.tenant;
    const { phone_e164, otp } = req.body;
    if (!tenant) {
      return res.status(400).json({ success: false, error: 'tenant_required' });
    }
    if (!phone_e164 || !validateE164(phone_e164) || !otp) {
      return res.status(400).json({ success: false, error: 'invalid_request' });
    }
    await client.query('BEGIN');
    const otpRes = await client.query(
      `SELECT id, otp_code, expires_at, attempts, is_used
       FROM mobile_otps
       WHERE tenant_id = $1 AND phone_e164 = $2 AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [tenant.id, phone_e164]
    );
    if (otpRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, error: 'otp_invalid' });
    }
    const row = otpRes.rows[0];
    if (new Date() > new Date(row.expires_at)) {
      await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
      await client.query('COMMIT');
      return res.status(401).json({ success: false, error: 'otp_expired' });
    }
    if (row.attempts >= (parseInt(process.env.OTP_MAX_ATTEMPTS) || 3)) {
      await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
      await client.query('COMMIT');
      return res.status(401).json({ success: false, error: 'otp_attempts_exceeded' });
    }
    if (row.otp_code !== otp) {
      await client.query('UPDATE mobile_otps SET attempts = attempts + 1 WHERE id = $1', [row.id]);
      await client.query('COMMIT');
      return res.status(401).json({ success: false, error: 'otp_invalid' });
    }
    await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
    // upsert customer
    const custRes = await client.query(
      `INSERT INTO customers (tenant_id, phone_e164, phone_verified)
       VALUES ($1, $2, true)
       ON CONFLICT (tenant_id, phone_e164)
       DO UPDATE SET phone_verified = true, updated_at = CURRENT_TIMESTAMP
       RETURNING id, full_name, email, phone_e164`,
      [tenant.id, phone_e164]
    );
    const customer = custRes.rows[0];
    // generate tokens as CUSTOMER
    const { accessToken, refreshToken } = tokenService.generateTokens(
      customer.id,
      'CUSTOMER',
      tenant.id,
      tenant.subdomain_slug || null
    );
    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        role: 'CUSTOMER'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('mobile.verifyOtp error:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  } finally {
    client.release();
  }
};

exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== 'CUSTOMER') {
      return res.status(403).json({ success: false, error: 'forbidden' });
    }
    const result = await db.query(
      `SELECT c.id, c.full_name, c.email, c.phone_e164, c.phone_verified, c.email_verified,
              c.tenant_id, t.tenant_name, t.subdomain_slug
       FROM customers c
       JOIN tenants t ON c.tenant_id = t.id
       WHERE c.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    const c = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: c.id,
        fullName: c.full_name,
        email: c.email,
        phone: c.phone_e164,
        phoneVerified: c.phone_verified,
        emailVerified: c.email_verified,
        tenant: { id: c.tenant_id, name: c.tenant_name, subdomain: c.subdomain_slug }
      }
    });
  } catch (err) {
    console.error('mobile.getMe error:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }
    const decoded = await tokenService.verifyRefreshToken(refreshToken);
    const tokens = tokenService.generateTokens(decoded.userId, decoded.role, decoded.tenantId, decoded.subdomainSlug);
    return res.json({ success: true, data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  // For now, stateless logout for mobile; no blacklist persistence
  return res.json({ success: true, message: 'Logged out' });
};
