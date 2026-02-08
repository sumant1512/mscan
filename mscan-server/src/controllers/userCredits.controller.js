/**
 * User Credits Controller
 * Handles user reward credits system
 */

const db = require('../config/database');

class UserCreditsController {
  /**
   * Get user credit balance
   * GET /api/users/:userId/credits
   */
  async getUserCredits(req, res) {
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenant_id;

      // Get or create credit account
      let result = await db.query(
        `SELECT * FROM user_credits 
         WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );

      if (result.rows.length === 0) {
        // Create default credit account
        result = await db.query(
          `INSERT INTO user_credits (user_id, tenant_id, credit_amount)
           VALUES ($1, $2, 0.00)
           RETURNING *`,
          [userId, tenantId]
        );
      }

      res.json({
        success: true,
        credits: result.rows[0]
      });

    } catch (error) {
      console.error('Get user credits error:', error);
      res.status(500).json({ error: 'Failed to fetch user credits' });
    }
  }

  /**
   * Get user credit transaction history
   * GET /api/users/:userId/credits/transactions
   */
  async getCreditTransactions(req, res) {
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenant_id;
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      // Get user_credit_id
      const creditAccount = await db.query(
        'SELECT id FROM user_credits WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (creditAccount.rows.length === 0) {
        return res.json({
          success: true,
          transactions: [],
          pagination: { page: 1, limit, total: 0, pages: 0 }
        });
      }

      const result = await db.query(
        `SELECT t.*, va.app_name, va.code as app_code
         FROM user_credit_transactions t
         LEFT JOIN verification_apps va ON t.verification_app_id = va.id
         WHERE t.user_credit_id = $1
         ORDER BY t.created_at DESC
         LIMIT $2 OFFSET $3`,
        [creditAccount.rows[0].id, limit, offset]
      );

      const countResult = await db.query(
        'SELECT COUNT(*) FROM user_credit_transactions WHERE user_credit_id = $1',
        [creditAccount.rows[0].id]
      );

      res.json({
        success: true,
        transactions: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      });

    } catch (error) {
      console.error('Get credit transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  /**
   * Add credits to user (Admin function)
   * POST /api/users/:userId/credits/add
   */
  async addCredits(req, res) {
    const client = await db.pool.connect();
    
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenant_id;
      const { amount, description, verification_app_id } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      await client.query('BEGIN');

      // Get or create credit account
      let creditAccount = await client.query(
        'SELECT * FROM user_credits WHERE user_id = $1 AND tenant_id = $2 FOR UPDATE',
        [userId, tenantId]
      );

      if (creditAccount.rows.length === 0) {
        creditAccount = await client.query(
          `INSERT INTO user_credits (user_id, tenant_id, credit_amount)
           VALUES ($1, $2, 0.00)
           RETURNING *`,
          [userId, tenantId]
        );
      }

      const account = creditAccount.rows[0];
      const newBalance = parseFloat(account.credit_amount) + parseFloat(amount);

      // Update balance
      await client.query(
        `UPDATE user_credits 
         SET credit_amount = $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newBalance, account.id]
      );

      // Record transaction
      await client.query(
        `INSERT INTO user_credit_transactions 
         (user_credit_id, verification_app_id, transaction_type, amount, balance_after, description, created_by)
         VALUES ($1, $2, 'earned', $3, $4, $5, $6)`,
        [account.id, verification_app_id || null, amount, newBalance, description || 'Credits added by admin', req.user.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Credits added successfully',
        new_balance: newBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Add credits error:', error);
      res.status(500).json({ error: 'Failed to add credits' });
    } finally {
      client.release();
    }
  }

  /**
   * Deduct credits from user
   * POST /api/users/:userId/credits/deduct
   */
  async deductCredits(req, res) {
    const client = await db.pool.connect();
    
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenant_id;
      const { amount, description, verification_app_id } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      await client.query('BEGIN');

      // Get credit account
      const creditAccount = await client.query(
        'SELECT * FROM user_credits WHERE user_id = $1 AND tenant_id = $2 FOR UPDATE',
        [userId, tenantId]
      );

      if (creditAccount.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User credit account not found' });
      }

      const account = creditAccount.rows[0];
      const currentBalance = parseFloat(account.credit_amount);

      if (currentBalance < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Insufficient credits',
          current_balance: currentBalance,
          required: amount
        });
      }

      const newBalance = currentBalance - parseFloat(amount);

      // Update balance
      await client.query(
        `UPDATE user_credits 
         SET credit_amount = $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newBalance, account.id]
      );

      // Record transaction
      await client.query(
        `INSERT INTO user_credit_transactions 
         (user_credit_id, verification_app_id, transaction_type, amount, balance_after, description, created_by)
         VALUES ($1, $2, 'spent', $3, $4, $5, $6)`,
        [account.id, verification_app_id || null, amount, newBalance, description || 'Credits spent', req.user.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Credits deducted successfully',
        new_balance: newBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Deduct credits error:', error);
      res.status(500).json({ error: 'Failed to deduct credits' });
    } finally {
      client.release();
    }
  }

  /**
   * Adjust user credits (Admin only)
   * POST /api/users/:userId/credits/adjust
   */
  async adjustCredits(req, res) {
    const client = await db.pool.connect();
    
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenant_id;
      const { amount, reason } = req.body;

      if (!amount || amount === 0) {
        return res.status(400).json({ error: 'Valid adjustment amount is required' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Reason for adjustment is required' });
      }

      await client.query('BEGIN');

      // Get or create credit account
      let creditAccount = await client.query(
        'SELECT * FROM user_credits WHERE user_id = $1 AND tenant_id = $2 FOR UPDATE',
        [userId, tenantId]
      );

      if (creditAccount.rows.length === 0) {
        creditAccount = await client.query(
          `INSERT INTO user_credits (user_id, tenant_id, credit_amount)
           VALUES ($1, $2, 0.00)
           RETURNING *`,
          [userId, tenantId]
        );
      }

      const account = creditAccount.rows[0];
      const newBalance = parseFloat(account.credit_amount) + parseFloat(amount);

      if (newBalance < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Adjustment would result in negative balance' });
      }

      // Update balance
      await client.query(
        `UPDATE user_credits 
         SET credit_amount = $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newBalance, account.id]
      );

      // Record transaction
      await client.query(
        `INSERT INTO user_credit_transactions 
         (user_credit_id, transaction_type, amount, balance_after, description, created_by)
         VALUES ($1, 'adjusted', $2, $3, $4, $5)`,
        [account.id, Math.abs(amount), newBalance, reason, req.user.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Credits adjusted successfully',
        adjustment: amount,
        new_balance: newBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Adjust credits error:', error);
      res.status(500).json({ error: 'Failed to adjust credits' });
    } finally {
      client.release();
    }
  }

  /**
   * Get credit statistics by app
   * GET /api/credits/stats
   */
  async getCreditStats(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `SELECT 
           va.app_name,
           va.code as app_code,
           COUNT(DISTINCT t.user_credit_id) as active_users,
           SUM(CASE WHEN t.transaction_type = 'earned' THEN t.amount ELSE 0 END) as total_earned,
           SUM(CASE WHEN t.transaction_type = 'spent' THEN t.amount ELSE 0 END) as total_spent
         FROM user_credit_transactions t
         JOIN user_credits uc ON t.user_credit_id = uc.id
         LEFT JOIN verification_apps va ON t.verification_app_id = va.id
         WHERE uc.tenant_id = $1
         GROUP BY va.id, va.app_name, va.code
         ORDER BY total_earned DESC`,
        [tenantId]
      );

      res.json({
        success: true,
        stats: result.rows
      });

    } catch (error) {
      console.error('Get credit stats error:', error);
      res.status(500).json({ error: 'Failed to fetch credit statistics' });
    }
  }
}

module.exports = new UserCreditsController();
