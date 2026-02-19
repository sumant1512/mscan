/**
 * Mobile Authentication Controller
 * Refactored to use modern error handling and validators
 */

const db = require('../config/database');
const tokenService = require('../services/token.service');
const { asyncHandler } = require('../modules/common/middleware/errorHandler.middleware');
const {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ForbiddenError
} = require('../modules/common/errors/AppError');
const {
  validateRequiredFields,
  validatePhone
} = require('../modules/common/validators/common.validator');
const {
  sendSuccess,
  sendError
} = require('../modules/common/utils/response.util');
const {
  executeTransaction
} = require('../modules/common/utils/database.util');

function generateOtp() {
  if (process.env.OTP_DEV_MODE === 'true') return '000000';
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request OTP for mobile login
 */
exports.requestOtp = asyncHandler(async (req, res) => {
  const tenant = req.tenant;
  const { phone_e164 } = req.body;

  if (!tenant) {
    throw new ValidationError('Tenant required', 'tenant_required');
  }

  validateRequiredFields(req.body, ['phone_e164']);
  validatePhone(phone_e164);

  const otp = generateOtp();
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Invalidate previous unused OTPs
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

  return sendSuccess(res, { expiresIn: expiryMinutes }, 'OTP sent');
});

/**
 * Verify OTP and login
 */
exports.verifyOtp = asyncHandler(async (req, res) => {
  const tenant = req.tenant;
  const { phone_e164, otp } = req.body;

  if (!tenant) {
    throw new ValidationError('Tenant required', 'tenant_required');
  }

  validateRequiredFields(req.body, ['phone_e164', 'otp']);
  validatePhone(phone_e164);

  const result = await executeTransaction(db, async (client) => {
    // Get latest unused OTP
    const otpRes = await client.query(
      `SELECT id, otp_code, expires_at, attempts, is_used
       FROM mobile_otps
       WHERE tenant_id = $1 AND phone_e164 = $2 AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [tenant.id, phone_e164]
    );

    if (otpRes.rows.length === 0) {
      throw new AuthenticationError('Invalid OTP', 'otp_invalid');
    }

    const row = otpRes.rows[0];

    // Check expiry
    if (new Date() > new Date(row.expires_at)) {
      await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
      throw new AuthenticationError('OTP expired', 'otp_expired');
    }

    // Check attempts
    if (row.attempts >= (parseInt(process.env.OTP_MAX_ATTEMPTS) || 3)) {
      await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
      throw new AuthenticationError('Too many attempts', 'otp_attempts_exceeded');
    }

    // Verify OTP
    if (row.otp_code !== otp) {
      await client.query('UPDATE mobile_otps SET attempts = attempts + 1 WHERE id = $1', [row.id]);
      throw new AuthenticationError('Invalid OTP', 'otp_invalid');
    }

    // Mark OTP as used
    await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);

    // Upsert customer
    const custRes = await client.query(
      `INSERT INTO customers (tenant_id, phone_e164, phone_verified)
       VALUES ($1, $2, true)
       ON CONFLICT (tenant_id, phone_e164)
       DO UPDATE SET phone_verified = true, updated_at = CURRENT_TIMESTAMP
       RETURNING id, full_name, email, phone_e164`,
      [tenant.id, phone_e164]
    );

    const customer = custRes.rows[0];

    // Generate tokens as CUSTOMER
    const { accessToken, refreshToken } = tokenService.generateTokens(
      customer.id,
      'CUSTOMER',
      tenant.id,
      tenant.subdomain_slug || null
    );

    return { accessToken, refreshToken };
  });

  return sendSuccess(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    role: 'CUSTOMER'
  }, 'Login successful');
});

/**
 * Get current customer profile
 */
exports.getMe = asyncHandler(async (req, res) => {
  const { id, role } = req.user;

  if (role !== 'CUSTOMER') {
    throw new ForbiddenError('Access denied', 'forbidden');
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
    throw new NotFoundError('Customer', 'not_found');
  }

  const c = result.rows[0];

  return sendSuccess(res, {
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone_e164,
    phoneVerified: c.phone_verified,
    emailVerified: c.email_verified,
    tenant: { id: c.tenant_id, name: c.tenant_name, subdomain: c.subdomain_slug }
  });
});

/**
 * Refresh access token
 * Note: Uses custom error handling for security
 */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    const decoded = await tokenService.verifyRefreshToken(refreshToken);
    const tokens = tokenService.generateTokens(decoded.userId, decoded.role, decoded.tenantId, decoded.subdomainSlug);

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (err) {
    return sendError(res, 'Invalid refresh token', 401);
  }
};

/**
 * Logout (stateless for mobile)
 */
exports.logout = async (req, res) => {
  // Stateless logout for mobile; no blacklist persistence
  return sendSuccess(res, null, 'Logged out');
};
