const db = require('../config/database');

/**
 * External App API Controller
 * Provides API endpoints for external mobile/web apps using API key authentication
 */

/**
 * Get products for the authenticated app
 * GET /api/app/:appCode/products
 */
const getProducts = async (req, res) => {
  try {
    const { verificationAppId, tenantId } = req.appContext;

    const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.points,
        p.stock_quantity,
        p.created_at,
        p.updated_at
      FROM products p
      WHERE p.tenant_id = $1 AND p.verification_app_id = $2
      ORDER BY p.product_name ASC
    `;

    const params = [tenantId, verificationAppId];

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching products for external app:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * Get user's credit balance
 * GET /api/app/:appCode/users/:userId/credits
 */
const getUserCredits = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tenantId } = req.appContext;

    // Get or create user credit account
    let result = await db.query(
      `SELECT balance, created_at, updated_at
       FROM user_credits
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      // Create initial credit account
      result = await db.query(
        `INSERT INTO user_credits (user_id, tenant_id, balance)
         VALUES ($1, $2, 0)
         RETURNING balance, created_at, updated_at`,
        [userId, tenantId]
      );
    }

    res.json({
      success: true,
      data: {
        user_id: parseInt(userId),
        balance: result.rows[0].balance,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching user credits for external app:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user credits',
      error: error.message
    });
  }
};

/**
 * Get user's credit transaction history
 * GET /api/app/:appCode/users/:userId/credit-transactions?limit=50&offset=0
 */
const getUserCreditTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tenantId, verificationAppId } = req.appContext;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Only show transactions for this app
    const result = await db.query(
      `SELECT 
        transaction_id,
        transaction_type,
        amount,
        balance_after,
        description,
        verification_app_id,
        created_at
      FROM user_credit_transactions
      WHERE user_id = $1 AND tenant_id = $2 AND verification_app_id = $3
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5`,
      [userId, tenantId, verificationAppId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM user_credit_transactions
       WHERE user_id = $1 AND tenant_id = $2 AND verification_app_id = $3`,
      [userId, tenantId, verificationAppId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        hasMore: offset + limit < parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching credit transactions for external app:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit transactions',
      error: error.message
    });
  }
};

/**
 * Record a coupon scan and add credits to user
 * POST /api/app/:appCode/scans
 * Body: { user_id, coupon_code, points }
 */
const recordScan = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { user_id, coupon_code, points } = req.body;
    const { verificationAppId, tenantId } = req.appContext;

    // Validation
    if (!user_id || !coupon_code || points === undefined) {
      return res.status(400).json({
        success: false,
        message: 'user_id, coupon_code, and points are required'
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Points must be greater than 0'
      });
    }

    await client.query('BEGIN');

    // Verify coupon exists and belongs to this app
    const couponResult = await client.query(
      `SELECT coupon_id, is_scanned, verification_app_id
       FROM coupons
       WHERE coupon_code = $1 AND tenant_id = $2`,
      [coupon_code, tenantId]
    );

    if (couponResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const coupon = couponResult.rows[0];

    // Verify coupon belongs to this app
    if (coupon.verification_app_id !== verificationAppId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'This coupon belongs to a different application'
      });
    }

    // Check if already scanned
    if (coupon.is_scanned) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This coupon has already been scanned'
      });
    }

    // Mark coupon as scanned
    await client.query(
      `UPDATE coupons
       SET is_scanned = true, 
           scanned_at = NOW(),
           scanned_by = $1
       WHERE coupon_id = $2`,
      [user_id, coupon.coupon_id]
    );

    // Get or create user credit account
    let creditResult = await client.query(
      `SELECT balance FROM user_credits
       WHERE user_id = $1 AND tenant_id = $2`,
      [user_id, tenantId]
    );

    let currentBalance;
    if (creditResult.rows.length === 0) {
      // Create new account
      creditResult = await client.query(
        `INSERT INTO user_credits (user_id, tenant_id, balance)
         VALUES ($1, $2, 0)
         RETURNING balance`,
        [user_id, tenantId]
      );
      currentBalance = 0;
    } else {
      currentBalance = creditResult.rows[0].balance;
    }

    // Add credits
    const newBalance = currentBalance + points;
    await client.query(
      `UPDATE user_credits
       SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND tenant_id = $3`,
      [newBalance, user_id, tenantId]
    );

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO user_credit_transactions 
        (user_id, tenant_id, verification_app_id, transaction_type, amount, balance_after, description)
       VALUES ($1, $2, $3, 'earn', $4, $5, $6)
       RETURNING transaction_id, created_at`,
      [
        user_id, 
        tenantId, 
        verificationAppId, 
        points, 
        newBalance, 
        `Earned ${points} points from scanning coupon ${coupon_code}`
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Scan recorded successfully',
      data: {
        transaction_id: transactionResult.rows[0].transaction_id,
        user_id: parseInt(user_id),
        points_earned: points,
        new_balance: newBalance,
        coupon_code,
        scanned_at: transactionResult.rows[0].created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording scan for external app:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record scan',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Redeem credits for a product
 * POST /api/app/:appCode/redeem
 * Body: { user_id, product_id }
 */
const redeemProduct = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { user_id, product_id } = req.body;
    const { verificationAppId, tenantId } = req.appContext;

    // Validation
    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id and product_id are required'
      });
    }

    await client.query('BEGIN');

    // Get product details and verify it belongs to this app
    const productResult = await client.query(
      `SELECT product_id, product_name, points, stock_quantity, verification_app_id
       FROM products
       WHERE product_id = $1 AND tenant_id = $2`,
      [product_id, tenantId]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productResult.rows[0];

    // Verify product belongs to this app
    if (product.verification_app_id !== verificationAppId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'This product belongs to a different application'
      });
    }

    // Check stock
    if (product.stock_quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock'
      });
    }

    // Get user's credit balance
    const creditResult = await client.query(
      `SELECT balance FROM user_credits
       WHERE user_id = $1 AND tenant_id = $2`,
      [user_id, tenantId]
    );

    if (creditResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'User has no credit account'
      });
    }

    const currentBalance = creditResult.rows[0].balance;

    // Check if user has enough credits
    if (currentBalance < product.points) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits',
        data: {
          required: product.points,
          available: currentBalance,
          shortfall: product.points - currentBalance
        }
      });
    }

    // Deduct credits
    const newBalance = currentBalance - product.points;
    await client.query(
      `UPDATE user_credits
       SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND tenant_id = $3`,
      [newBalance, user_id, tenantId]
    );

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO user_credit_transactions 
        (user_id, tenant_id, verification_app_id, transaction_type, amount, balance_after, description)
       VALUES ($1, $2, $3, 'spend', $4, $5, $6)
       RETURNING transaction_id, created_at`,
      [
        user_id,
        tenantId,
        verificationAppId,
        product.points,
        newBalance,
        `Redeemed ${product.product_name}`
      ]
    );

    // Decrement stock
    await client.query(
      `UPDATE products
       SET stock_quantity = stock_quantity - 1
       WHERE product_id = $1`,
      [product_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Product redeemed successfully',
      data: {
        transaction_id: transactionResult.rows[0].transaction_id,
        user_id: parseInt(user_id),
        product_id: parseInt(product_id),
        product_name: product.product_name,
        points_spent: product.points,
        new_balance: newBalance,
        redeemed_at: transactionResult.rows[0].created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error redeeming product for external app:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to redeem product',
      error: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getProducts,
  getUserCredits,
  getUserCreditTransactions,
  recordScan,
  redeemProduct
};
