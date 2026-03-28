/**
 * Cashback Service
 * Handles customer cashback operations (scan, UPI, claim, history, balance)
 */

const db = require('../config/database');
const { executeTransaction } = require('../modules/common/utils/database.util');
const { ValidationError, NotFoundError, ConflictError } = require('../modules/common/errors/AppError');

/**
 * Validate UPI ID format
 */
const validateUpiId = (upiId) => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/;
  if (!upiRegex.test(upiId)) {
    throw new ValidationError('Invalid UPI ID format. Expected format: username@bankname');
  }
};

/**
 * Scan a coupon for cashback
 */
const scanCoupon = async (customerId, tenantId, couponCode) => {
  return executeTransaction(db, async (client) => {
    // Validate coupon
    const couponRes = await client.query(
      `SELECT id, coupon_code, status, coupon_points, cashback_amount
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

    // Determine cashback amount
    const cashbackAmount = coupon.cashback_amount || coupon.coupon_points || 0;
    if (cashbackAmount <= 0) {
      throw new ValidationError('Coupon has no cashback value configured');
    }

    if (cashbackAmount > 1000) {
      console.warn(`[Cashback] Unusually high cashback: ${cashbackAmount} for coupon ${couponCode}`);
    }

    // Update coupon status
    await client.query(
      `UPDATE coupons SET status = 'used', scanned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [coupon.id]
    );

    // Create cashback transaction
    const txRes = await client.query(
      `INSERT INTO cashback_transactions (customer_id, tenant_id, coupon_code, amount, status, metadata)
       VALUES ($1, $2, $3, $4, 'PENDING', $5)
       RETURNING id`,
      [customerId, tenantId, couponCode, cashbackAmount, JSON.stringify({ coupon_id: coupon.id })]
    );

    return {
      success: true,
      cashback_amount: parseFloat(cashbackAmount),
      transaction_id: txRes.rows[0].id,
      coupon_code: couponCode
    };
  });
};

/**
 * Save UPI ID for a customer
 */
const saveUpiId = async (customerId, tenantId, upiId) => {
  validateUpiId(upiId);

  return executeTransaction(db, async (client) => {
    // Clear previous primary flags
    await client.query(
      'UPDATE customer_upi_details SET is_primary = false WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    // Upsert UPI
    const result = await client.query(
      `INSERT INTO customer_upi_details (customer_id, tenant_id, upi_id, is_primary)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (customer_id, tenant_id, upi_id)
       DO UPDATE SET is_primary = true, updated_at = CURRENT_TIMESTAMP
       RETURNING id, upi_id, is_primary`,
      [customerId, tenantId, upiId]
    );

    return result.rows[0];
  });
};

/**
 * Get saved UPI details for a customer
 */
const getUpiDetails = async (customerId, tenantId) => {
  const result = await db.query(
    `SELECT id, upi_id, is_verified, is_primary, created_at
     FROM customer_upi_details
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY is_primary DESC, created_at DESC`,
    [customerId, tenantId]
  );
  return result.rows;
};

/**
 * Claim pending cashback — update status to PROCESSING
 */
const claimCashback = async (customerId, tenantId) => {
  return executeTransaction(db, async (client) => {
    // Get primary UPI
    const upiRes = await client.query(
      'SELECT upi_id FROM customer_upi_details WHERE customer_id = $1 AND tenant_id = $2 AND is_primary = true',
      [customerId, tenantId]
    );

    if (upiRes.rows.length === 0) {
      throw new ValidationError('No UPI ID found. Please save a UPI ID first.');
    }

    const upiId = upiRes.rows[0].upi_id;

    // Get pending cashback transactions
    const pendingRes = await client.query(
      `SELECT id, amount FROM cashback_transactions
       WHERE customer_id = $1 AND tenant_id = $2 AND status = 'PENDING'
       FOR UPDATE`,
      [customerId, tenantId]
    );

    if (pendingRes.rows.length === 0) {
      throw new ValidationError('No pending cashback to claim');
    }

    const pendingIds = pendingRes.rows.map(r => r.id);
    const totalAmount = pendingRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    // Update all pending to PROCESSING with UPI
    await client.query(
      `UPDATE cashback_transactions
       SET status = 'PROCESSING', upi_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2)`,
      [upiId, pendingIds]
    );

    return {
      success: true,
      payout_amount: totalAmount,
      upi_id: upiId,
      status: 'PROCESSING',
      transactions_count: pendingIds.length
    };
  });
};

/**
 * Get cashback transaction history
 */
const getCashbackHistory = async (customerId, tenantId, { page = 1, limit = 10, status = null, from = null, to = null }) => {
  const offset = (page - 1) * limit;
  const params = [customerId, tenantId];
  let whereClause = 'customer_id = $1 AND tenant_id = $2';

  if (status) {
    params.push(status.toUpperCase());
    whereClause += ` AND status = $${params.length}`;
  }
  if (from) {
    params.push(from);
    whereClause += ` AND created_at >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    whereClause += ` AND created_at <= $${params.length}`;
  }

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM cashback_transactions WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].total);

  params.push(limit, offset);
  const dataRes = await db.query(
    `SELECT id, coupon_code, amount, upi_id, status, created_at
     FROM cashback_transactions
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { transactions: dataRes.rows, total };
};

/**
 * Get cashback balance summary
 */
const getCashbackBalance = async (customerId, tenantId) => {
  const result = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as total_earned,
       COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending,
       COALESCE(SUM(CASE WHEN status = 'PROCESSING' THEN amount ELSE 0 END), 0) as processing
     FROM cashback_transactions
     WHERE customer_id = $1 AND tenant_id = $2`,
    [customerId, tenantId]
  );

  const row = result.rows[0];
  return {
    total_earned: parseFloat(row.total_earned),
    pending: parseFloat(row.pending),
    processing: parseFloat(row.processing)
  };
};

module.exports = {
  validateUpiId,
  scanCoupon,
  saveUpiId,
  getUpiDetails,
  claimCashback,
  getCashbackHistory,
  getCashbackBalance
};
