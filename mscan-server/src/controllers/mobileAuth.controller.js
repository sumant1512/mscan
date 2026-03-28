/**
 * Mobile Authentication Controller
 * Handles CUSTOMER and DEALER OTP-based authentication
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

// ============================================
// Internal OTP helpers
// ============================================

async function _verifyOtpRecord(client, tenantId, phone_e164, otp) {
  const otpRes = await client.query(
    `SELECT id, otp_code, expires_at, attempts, is_used
     FROM mobile_otps
     WHERE tenant_id = $1 AND phone_e164 = $2 AND is_used = false
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, phone_e164]
  );

  if (otpRes.rows.length === 0) {
    throw new AuthenticationError('Invalid OTP', 'otp_invalid');
  }

  const row = otpRes.rows[0];

  if (new Date() > new Date(row.expires_at)) {
    await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
    throw new AuthenticationError('OTP expired', 'otp_expired');
  }

  if (row.attempts >= (parseInt(process.env.OTP_MAX_ATTEMPTS) || 3)) {
    await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
    throw new AuthenticationError('Too many attempts', 'otp_attempts_exceeded');
  }

  if (row.otp_code !== otp) {
    await client.query('UPDATE mobile_otps SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    throw new AuthenticationError('Invalid OTP', 'otp_invalid');
  }

  await client.query('UPDATE mobile_otps SET is_used = true WHERE id = $1', [row.id]);
}

// ============================================
// Customer Auth
// ============================================

/**
 * Request OTP for customer mobile login
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
 * Verify OTP and login/auto-register customer
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
    // Verify OTP
    await _verifyOtpRecord(client, tenant.id, phone_e164, otp);

    // Check if user already exists
    const existingUser = await client.query(
      `SELECT u.id, c.id as customer_id
       FROM users u
       LEFT JOIN customers c ON c.tenant_id = u.tenant_id AND c.phone_e164 = u.phone_e164
       WHERE u.tenant_id = $1 AND u.phone_e164 = $2 AND u.role = 'CUSTOMER'`,
      [tenant.id, phone_e164]
    );

    let userId, customerId, isNewUser = false;

    if (existingUser.rows.length > 0) {
      // Returning user
      userId = existingUser.rows[0].id;
      customerId = existingUser.rows[0].customer_id;

      // Ensure customers record exists
      if (!customerId) {
        const custRes = await client.query(
          `INSERT INTO customers (tenant_id, phone_e164, phone_verified)
           VALUES ($1, $2, true)
           RETURNING id`,
          [tenant.id, phone_e164]
        );
        customerId = custRes.rows[0].id;
      } else {
        await client.query(
          `UPDATE customers SET phone_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [customerId]
        );
      }
    } else {
      // New user — create users + customers records
      isNewUser = true;

      const userRes = await client.query(
        `INSERT INTO users (tenant_id, phone_e164, role, is_active)
         VALUES ($1, $2, 'CUSTOMER', true)
         RETURNING id`,
        [tenant.id, phone_e164]
      );
      userId = userRes.rows[0].id;

      const custRes = await client.query(
        `INSERT INTO customers (tenant_id, phone_e164, phone_verified)
         VALUES ($1, $2, true)
         RETURNING id`,
        [tenant.id, phone_e164]
      );
      customerId = custRes.rows[0].id;
    }

    // Generate tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(
      userId,
      'CUSTOMER',
      tenant.id,
      tenant.subdomain_slug || null
    );

    return { accessToken, refreshToken, isNewUser };
  });

  return sendSuccess(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    role: 'CUSTOMER',
    is_new_user: result.isNewUser
  }, 'Login successful');
});

// ============================================
// Dealer Auth
// ============================================

/**
 * Request OTP for dealer login (dealer must be pre-registered)
 */
exports.dealerRequestOtp = asyncHandler(async (req, res) => {
  const tenant = req.tenant;
  const { phone_e164 } = req.body;

  if (!tenant) {
    throw new ValidationError('Tenant required', 'tenant_required');
  }

  validateRequiredFields(req.body, ['phone_e164']);
  validatePhone(phone_e164);

  // Verify dealer exists in this tenant
  const dealerCheck = await db.query(
    `SELECT u.id, u.is_active, d.is_active as dealer_active
     FROM users u
     JOIN dealers d ON d.user_id = u.id AND d.tenant_id = u.tenant_id
     WHERE u.tenant_id = $1 AND u.phone_e164 = $2 AND u.role = 'DEALER'`,
    [tenant.id, phone_e164]
  );

  if (dealerCheck.rows.length === 0) {
    throw new NotFoundError('Dealer not found');
  }

  const dealer = dealerCheck.rows[0];
  if (!dealer.is_active || !dealer.dealer_active) {
    throw new ForbiddenError('Dealer account is deactivated');
  }

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

  console.log(`[Dealer OTP] Tenant ${tenant.id} ${phone_e164} → OTP ${otp}`);

  return sendSuccess(res, { expiresIn: expiryMinutes }, 'OTP sent');
});

/**
 * Verify OTP for dealer login
 */
exports.dealerVerifyOtp = asyncHandler(async (req, res) => {
  const tenant = req.tenant;
  const { phone_e164, otp } = req.body;

  if (!tenant) {
    throw new ValidationError('Tenant required', 'tenant_required');
  }

  validateRequiredFields(req.body, ['phone_e164', 'otp']);
  validatePhone(phone_e164);

  const result = await executeTransaction(db, async (client) => {
    // Verify OTP
    await _verifyOtpRecord(client, tenant.id, phone_e164, otp);

    // Get dealer user (no dealer join — one user can have multiple dealer profiles across apps)
    const userRes = await client.query(
      `SELECT id FROM users
       WHERE tenant_id = $1 AND phone_e164 = $2 AND role = 'DEALER' AND is_active = true`,
      [tenant.id, phone_e164]
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundError('Dealer not found or inactive');
    }

    const user = userRes.rows[0];

    // Generate tokens with dealer context (no dealer_id in JWT — resolved at request time via X-App-Id)
    const { accessToken, refreshToken } = tokenService.generateTokens(
      user.id,
      'DEALER',
      tenant.id,
      tenant.subdomain_slug || null
    );

    return { accessToken, refreshToken };
  });

  return sendSuccess(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    role: 'DEALER'
  }, 'Login successful');
});

// ============================================
// Profile
// ============================================

/**
 * Get current user profile (CUSTOMER or DEALER)
 */
exports.getMe = asyncHandler(async (req, res) => {
  const { id, role, tenant_id } = req.user;

  if (role === 'CUSTOMER') {
    const result = await db.query(
      `SELECT c.id, c.full_name, c.email, c.phone_e164, c.phone_verified, c.email_verified,
              c.tenant_id, t.tenant_name, t.subdomain_slug
       FROM customers c
       JOIN tenants t ON c.tenant_id = t.id
       WHERE c.phone_e164 = (SELECT phone_e164 FROM users WHERE id = $1) AND c.tenant_id = $2`,
      [id, tenant_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer');
    }

    const c = result.rows[0];
    const profileComplete = !!(c.full_name && c.email);

    return sendSuccess(res, {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone_e164,
      role: 'CUSTOMER',
      phoneVerified: c.phone_verified,
      emailVerified: c.email_verified,
      profile_complete: profileComplete,
      tenant: { id: c.tenant_id, name: c.tenant_name, subdomain: c.subdomain_slug }
    });
  }

  if (role === 'DEALER') {
    // Return user-level info only. Per-app dealer profile is fetched via
    // GET /api/mobile/v1/dealer/profile with the X-App-Id header.
    const result = await db.query(
      `SELECT u.id, u.full_name, u.phone_e164, t.tenant_name, t.subdomain_slug
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [id, tenant_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Dealer');
    }

    const d = result.rows[0];

    return sendSuccess(res, {
      id: d.id,
      full_name: d.full_name,
      phone: d.phone_e164,
      role: 'DEALER',
      tenant: { id: tenant_id, name: d.tenant_name, subdomain: d.subdomain_slug }
    });
  }

  throw new ForbiddenError('Access denied');
});

// ============================================
// Token Management
// ============================================

/**
 * Refresh access token
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
 * Logout — blacklist current tokens
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      await tokenService.blacklistTokens(
        decoded.jti,
        decoded.jti,
        decoded.userId
      );
    }

    return sendSuccess(res, null, 'Logged out');
  } catch (err) {
    // Even if blacklisting fails, still return success
    return sendSuccess(res, null, 'Logged out');
  }
};
