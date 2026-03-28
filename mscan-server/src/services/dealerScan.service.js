/**
 * Dealer Scan Service
 * Handles dealer QR code scanning and point awarding
 */

const db = require('../config/database');
const { executeTransaction } = require('../modules/common/utils/database.util');
const { ValidationError, NotFoundError, ConflictError } = require('../modules/common/errors/AppError');

/**
 * Process a dealer scan — validate coupon, award points, update coupon status
 */
const processDealerScan = async (dealerId, tenantId, couponCode) => {
  return executeTransaction(db, async (client) => {
    // Get dealer info
    const dealerRes = await client.query(
      'SELECT id, user_id FROM dealers WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [dealerId, tenantId]
    );
    if (dealerRes.rows.length === 0) {
      throw new NotFoundError('Dealer not found or inactive');
    }

    // Validate coupon
    const couponRes = await client.query(
      `SELECT id, coupon_code, status, coupon_points, cashback_amount, batch_id
       FROM coupons
       WHERE coupon_code = $1 AND tenant_id = $2
       FOR UPDATE`,
      [couponCode, tenantId]
    );

    if (couponRes.rows.length === 0) {
      throw new NotFoundError('Coupon not found');
    }

    const coupon = couponRes.rows[0];

    if (coupon.status !== 'active') {
      throw new ConflictError('Coupon has already been used or is inactive');
    }

    // Determine points to award
    const pointsToAward = coupon.coupon_points || 0;
    if (pointsToAward <= 0) {
      throw new ValidationError('Coupon has no points value configured');
    }

    if (pointsToAward > 1000) {
      console.warn(`[DealerScan] Unusually high points value: ${pointsToAward} for coupon ${couponCode}`);
    }

    // Update coupon status to USED
    await client.query(
      `UPDATE coupons SET status = 'used', scanned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [coupon.id]
    );

    // Update dealer points balance (upsert)
    await client.query(
      `INSERT INTO dealer_points (dealer_id, tenant_id, balance)
       VALUES ($1, $2, $3)
       ON CONFLICT (dealer_id, tenant_id)
       DO UPDATE SET balance = dealer_points.balance + $3, updated_at = CURRENT_TIMESTAMP`,
      [dealerId, tenantId, pointsToAward]
    );

    // Create point transaction record
    await client.query(
      `INSERT INTO dealer_point_transactions (dealer_id, tenant_id, amount, type, reason, reference_id, reference_type, metadata)
       VALUES ($1, $2, $3, 'CREDIT', 'scan', $4, 'coupon', $5)`,
      [dealerId, tenantId, pointsToAward, coupon.id, JSON.stringify({ coupon_code: couponCode })]
    );

    // Record scan session
    await client.query(
      `INSERT INTO scan_sessions (tenant_id, coupon_id, scanned_by, scan_type, status)
       VALUES ($1, $2, $3, 'dealer', 'completed')`,
      [tenantId, coupon.id, dealerRes.rows[0].user_id]
    );

    // Get updated balance
    const balanceRes = await client.query(
      'SELECT balance FROM dealer_points WHERE dealer_id = $1 AND tenant_id = $2',
      [dealerId, tenantId]
    );

    return {
      success: true,
      points_awarded: pointsToAward,
      dealer_balance: balanceRes.rows[0].balance,
      coupon_code: couponCode
    };
  });
};

/**
 * Get dealer points balance
 */
const getPoints = async (dealerId, tenantId) => {
  const result = await db.query(
    'SELECT COALESCE(balance, 0) as balance FROM dealer_points WHERE dealer_id = $1 AND tenant_id = $2',
    [dealerId, tenantId]
  );
  return { balance: result.rows.length > 0 ? result.rows[0].balance : 0, currency: 'points' };
};

/**
 * Get dealer point transaction history
 */
const getPointHistory = async (dealerId, tenantId, { page = 1, limit = 10, from = null, to = null }) => {
  const offset = (page - 1) * limit;
  const params = [dealerId, tenantId];
  let whereClause = 'dealer_id = $1 AND tenant_id = $2';

  if (from) {
    params.push(from);
    whereClause += ` AND created_at >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    whereClause += ` AND created_at <= $${params.length}`;
  }

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM dealer_point_transactions WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].total);

  params.push(limit, offset);
  const dataRes = await db.query(
    `SELECT id, amount, type, reason, metadata->>'coupon_code' as coupon_code, created_at
     FROM dealer_point_transactions
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { transactions: dataRes.rows, total };
};

/**
 * Get dealer profile
 */
const getProfile = async (userId, tenantId) => {
  const result = await db.query(
    `SELECT u.id, u.full_name, u.email, u.phone_e164,
            d.id as dealer_id, d.dealer_code, d.shop_name, d.address, d.pincode, d.city, d.state,
            COALESCE(dp.balance, 0) as points_balance,
            t.tenant_name, t.subdomain_slug
     FROM users u
     JOIN dealers d ON d.user_id = u.id AND d.tenant_id = u.tenant_id
     LEFT JOIN dealer_points dp ON dp.dealer_id = d.id AND dp.tenant_id = d.tenant_id
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.id = $1 AND u.tenant_id = $2`,
    [userId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Dealer');
  }

  const d = result.rows[0];
  return {
    id: d.id,
    full_name: d.full_name,
    email: d.email,
    phone: d.phone_e164,
    dealer: {
      id: d.dealer_id,
      code: d.dealer_code,
      shop_name: d.shop_name,
      address: d.address,
      pincode: d.pincode,
      city: d.city,
      state: d.state,
      points: d.points_balance
    },
    tenant: { id: tenantId, name: d.tenant_name, subdomain: d.subdomain_slug }
  };
};

module.exports = {
  processDealerScan,
  getPoints,
  getPointHistory,
  getProfile
};
