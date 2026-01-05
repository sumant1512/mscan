/**
 * Token Service - JWT Management
 */
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId, role, tenantId = null, subdomainSlug = null) => {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  const accessToken = jwt.sign(
    {
      userId,
      role,
      tenantId,
      subdomainSlug,
      jti: accessJti,
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '30m' }
  );

  const refreshToken = jwt.sign(
    {
      userId,
      role,
      tenantId,
      subdomainSlug,
      jti: refreshJti,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return {
    accessToken,
    refreshToken,
    accessJti,
    refreshJti
  };
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token is blacklisted
    const blacklistCheck = await db.query(
      'SELECT id FROM token_blacklist WHERE token_jti = $1',
      [decoded.jti]
    );

    if (blacklistCheck.rows.length > 0) {
      throw new Error('Token has been revoked');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Blacklist tokens (for logout)
 */
const blacklistTokens = async (accessJti, refreshJti, userId) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // Decode tokens to get expiry times (for cleanup)
    const accessExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Blacklist access token
    await client.query(
      `INSERT INTO token_blacklist (token_jti, user_id, token_type, expires_at)
       VALUES ($1, $2, 'ACCESS', $3)`,
      [accessJti, userId, accessExpiry]
    );

    // Blacklist refresh token
    await client.query(
      `INSERT INTO token_blacklist (token_jti, user_id, token_type, expires_at)
       VALUES ($1, $2, 'REFRESH', $3)`,
      [refreshJti, userId, refreshExpiry]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Clean up expired blacklisted tokens (run periodically)
 */
const cleanupExpiredBlacklist = async () => {
  await db.query(
    'DELETE FROM token_blacklist WHERE expires_at < NOW()'
  );
};

module.exports = {
  generateTokens,
  verifyRefreshToken,
  blacklistTokens,
  cleanupExpiredBlacklist
};
