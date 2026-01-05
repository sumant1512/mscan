/**
 * Authentication Middleware
 */
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Verify JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Check if token is blacklisted
    const blacklistCheck = await db.query(
      'SELECT id FROM token_blacklist WHERE token_jti = $1',
      [decoded.jti]
    );

    if (blacklistCheck.rows.length > 0) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      tenant_id: decoded.tenantId || null
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * Authorize based on roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    console.log(`🔐 Authorization Check: User role="${req.user.role}", Allowed roles=[${allowedRoles.join(', ')}]`);
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Authorization DENIED: "${req.user.role}" not in [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    console.log(`✅ Authorization GRANTED`);
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
