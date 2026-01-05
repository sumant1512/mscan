/**
 * Authentication Controller
 */
const db = require('../config/database');
const otpService = require('../services/otp.service');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');

/**
 * Request OTP - Step 1 of login
 */
const requestOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if user exists (tenant-scoped)
    // Note: Super admin can login from root domain (no tenant context)
    let userResult;
    if (req.tenant) {
      // Tenant subdomain - scope to tenant only
      userResult = await db.query(
        'SELECT id, is_active, tenant_id FROM users WHERE email = $1 AND tenant_id = $2',
        [email.toLowerCase(), req.tenant.id]
      );
      
      // Issue 4: Provide clear error if user doesn't exist in this tenant
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please check your email or contact your administrator.'
        });
      }
    } else {
      // Root domain - allow super admin only
      userResult = await db.query(
        'SELECT id, is_active, tenant_id, role FROM users WHERE email = $1 AND role = \'SUPER_ADMIN\'',
        [email.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        // Don't reveal if email exists - security
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    // Check rate limit
    const rateLimit = otpService.checkRateLimit(email);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again in ${rateLimit.waitMinutes} minutes`
      });
    }

    // Generate and store OTP
    const otp = await otpService.createOTP(email);

    // Send OTP via email
    try {
      await emailService.sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email address',
      expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP - Step 2 of login
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verification = await otpService.verifyOTP(email.toLowerCase(), otp);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: verification.message
      });
    }

    // Get user details (tenant-scoped)
    let userResult;
    if (req.tenant) {
      // Tenant subdomain - scope to tenant only
      userResult = await db.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.tenant_id, u.phone,
                t.tenant_name, t.subdomain_slug
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1 AND u.is_active = true AND u.tenant_id = $2`,
        [email.toLowerCase(), req.tenant.id]
      );
      
      // Issue 4: Provide clear error for wrong tenant
      if (userResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to this tenant. Please login from your tenant\'s subdomain.'
        });
      }
    } else {
      // Root domain - allow super admin only
      userResult = await db.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.tenant_id, u.phone,
                t.tenant_name, t.subdomain_slug
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1 AND u.is_active = true AND u.role = 'SUPER_ADMIN'`,
        [email.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only super admin can login from main domain.'
        });
      }
    }

    const user = userResult.rows[0];

    // Generate tokens with subdomain
    const { accessToken, refreshToken } = tokenService.generateTokens(
      user.id,
      user.role,
      user.tenant_id,
      user.subdomain_slug
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'LOGIN', $2, $3)`,
      [user.id, req.ip, req.get('user-agent') || 'unknown']
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        userType: user.role,
        subdomain: user.subdomain_slug || null
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user context (after login)
 */
const getUserContext = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone, u.tenant_id,
              t.tenant_name, t.email as tenant_email, t.subdomain_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Validate subdomain matches user's tenant (if not super admin)
    if (user.role !== 'SUPER_ADMIN' && user.subdomain_slug) {
      const requestSubdomain = req.subdomain || null;
      
      if (requestSubdomain !== user.subdomain_slug) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Subdomain mismatch',
          data: {
            expectedSubdomain: user.subdomain_slug,
            currentSubdomain: requestSubdomain
          }
        });
      }
    }

    const context = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
    };

    // Add tenant info for non-super-admin users
    if (user.tenant_id) {
      context.tenant = {
        id: user.tenant_id,
        companyName: user.tenant_name,
        contactEmail: user.tenant_email,
        subdomain: user.subdomain_slug
      };
    }

    // Add permissions based on role
    context.permissions = getPermissionsByRole(user.role);

    res.json({
      success: true,
      data: context
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = await tokenService.verifyRefreshToken(refreshToken);

    // Generate new tokens with subdomain
    const tokens = tokenService.generateTokens(
      decoded.userId,
      decoded.role,
      decoded.tenantId,
      decoded.subdomainSlug
    );

    // Blacklist old tokens
    await tokenService.blacklistTokens(
      decoded.jti, // old refresh token jti
      decoded.jti,
      decoded.userId
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
};

/**
 * Logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const accessJti = req.user?.jti; // from auth middleware

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Decode refresh token to get jti
    const decoded = tokenService.verifyRefreshToken(refreshToken);

    // Blacklist both tokens
    await tokenService.blacklistTokens(
      accessJti || decoded.jti,
      decoded.jti,
      decoded.userId
    );

    // Log audit
    await db.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'LOGOUT', $2, $3)`,
      [decoded.userId, req.ip, req.get('user-agent') || 'unknown']
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    // Even if there's an error, return success for logout
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};

/**
 * Get permissions by role
 */
const getPermissionsByRole = (role) => {
  const permissions = {
    SUPER_ADMIN: [
      'view_all_tenants',
      'create_customer',
      'manage_users',
      'view_system_stats',
      'access_admin_panel'
    ],
    TENANT_ADMIN: [
      'view_tenant_data',
      'manage_tenant_users',
      'view_tenant_stats'
    ],
    TENANT_USER: [
      'view_tenant_data',
      'view_own_profile'
    ]
  };

  return permissions[role] || [];
};

module.exports = {
  requestOTP,
  verifyOTP,
  getUserContext,
  refreshAccessToken,
  logout
};
