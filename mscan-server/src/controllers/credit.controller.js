/**
 * Credit Management Controller
 * Handles credit requests, approvals, and balance tracking
 */

const db = require('../config/database');
const emailService = require('../services/email.service');

class CreditController {
  /**
   * Request credits (Tenant)
   * POST /api/credits/request
   */
  async requestCredits(req, res) {
    try {
      const { requested_amount, justification } = req.body;
      const tenantId = req.user.tenant_id;

      // Validation
      if (!requested_amount || requested_amount <= 0) {
        return res.status(400).json({
          error: 'Invalid credit amount. Must be positive integer.'
        });
      }

      if (requested_amount < 100) {
        return res.status(400).json({
          error: 'Minimum credit request is 100 credits'
        });
      }

      // Check for existing pending request
      const pendingCheck = await db.query(
        'SELECT id FROM credit_requests WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'pending']
      );

      if (pendingCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'You already have a pending credit request. Please wait for approval.'
        });
      }

      // Create credit request
      const result = await db.query(
        `INSERT INTO credit_requests (tenant_id, requested_amount, justification, status, requested_at)
         VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
         RETURNING *`,
        [tenantId, requested_amount, justification]
      );

      // TODO: Notify Super Admins of new credit request

      res.status(201).json({
        message: 'Credit request submitted successfully',
        request: result.rows[0]
      });

    } catch (error) {
      console.error('Request credits error:', error);
      res.status(500).json({ error: 'Failed to submit credit request' });
    }
  }

  /**
   * Get all pending credit requests (Super Admin)
   * GET /api/credits/requests
   */
  async getAllCreditRequests(req, res) {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Build query based on status filter
      let query, countQuery, queryParams, countParams;
      
      if (status === 'all') {
        query = `SELECT cr.*,
                t.tenant_name,
                t.email as contact_email,
                u_proc.full_name as processed_by_name
         FROM credit_requests cr
         JOIN tenants t ON cr.tenant_id = t.id
         LEFT JOIN users u_proc ON cr.processed_by = u_proc.id
         ORDER BY cr.requested_at DESC
         LIMIT $1 OFFSET $2`;
        queryParams = [limit, offset];
        
        countQuery = 'SELECT COUNT(*) FROM credit_requests';
        countParams = [];
      } else {
        query = `SELECT cr.*,
                t.tenant_name,
                t.email as contact_email,
                u_proc.full_name as processed_by_name
         FROM credit_requests cr
         JOIN tenants t ON cr.tenant_id = t.id
         LEFT JOIN users u_proc ON cr.processed_by = u_proc.id
         WHERE cr.status = $1
         ORDER BY cr.requested_at DESC
         LIMIT $2 OFFSET $3`;
        queryParams = [status, limit, offset];
        
        countQuery = 'SELECT COUNT(*) FROM credit_requests WHERE status = $1';
        countParams = [status];
      }

      const result = await db.query(query, queryParams);
      const countResult = await db.query(countQuery, countParams);

      res.json({
        requests: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      });

    } catch (error) {
      console.error('Get credit requests error:', error);
      res.status(500).json({ error: 'Failed to fetch credit requests' });
    }
  }

  /**
   * Get own credit requests (Tenant)
   * GET /api/credits/requests/my
   */
  async getMyCreditRequests(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `SELECT cr.*, u.full_name as processed_by_name
         FROM credit_requests cr
         LEFT JOIN users u ON cr.processed_by = u.id
         WHERE cr.tenant_id = $1
         ORDER BY cr.requested_at DESC`,
        [tenantId]
      );

      res.json({ requests: result.rows });

    } catch (error) {
      console.error('Get my credit requests error:', error);
      res.status(500).json({ error: 'Failed to fetch your credit requests' });
    }
  }

  /**
   * Approve credit request (Super Admin)
   * POST /api/credits/approve/:id
   */
  async approveCreditRequest(req, res) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const approvedBy = req.user.id;

      // Get credit request
      const requestResult = await client.query(
        'SELECT * FROM credit_requests WHERE id = $1 AND status = $2',
        [id, 'pending']
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Credit request not found or already processed' 
        });
      }

      const request = requestResult.rows[0];

      // Get tenant information
      const tenantResult = await client.query(
        'SELECT tenant_name, email FROM tenants WHERE id = $1',
        [request.tenant_id]
      );

      if (tenantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Tenant not found' 
        });
      }

      const tenant = tenantResult.rows[0];

      // Get current balance
      const balanceResult = await client.query(
        'SELECT * FROM tenant_credit_balance WHERE tenant_id = $1',
        [request.tenant_id]
      );

      const currentBalance = balanceResult.rows.length > 0 
        ? balanceResult.rows[0].balance 
        : 0;
      const newBalance = currentBalance + request.requested_amount;

      // Update or insert credit balance
      await client.query(
        `INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (tenant_id) 
         DO UPDATE SET 
           balance = tenant_credit_balance.balance + $3,
           total_received = tenant_credit_balance.total_received + $3,
           last_updated = CURRENT_TIMESTAMP`,
        [request.tenant_id, newBalance, request.requested_amount]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO credit_transactions 
         (tenant_id, transaction_type, amount, balance_before, balance_after, 
          reference_id, reference_type, description, created_by)
         VALUES ($1, 'CREDIT', $2, $3, $4, $5, 'CREDIT_APPROVAL', $6, $7)`,
        [
          request.tenant_id,
          request.requested_amount,
          currentBalance,
          newBalance,
          id,
          `Credit approval for request #${id}`,
          approvedBy
        ]
      );

      // Update request status
      await client.query(
        `UPDATE credit_requests 
         SET status = 'approved', 
             processed_at = CURRENT_TIMESTAMP, 
             processed_by = $1
         WHERE id = $2`,
        [approvedBy, id]
      );

      await client.query('COMMIT');

      // Send approval notification email to tenant
      emailService.sendCreditApprovalEmail(
        tenant.email,
        tenant.tenant_name,
        request.requested_amount
      ).catch(err => console.error('Email notification failed:', err));

      res.json({
        message: 'Credit request approved successfully',
        credits_added: request.requested_amount,
        new_balance: newBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Approve credit request error:', error);
      res.status(500).json({ error: 'Failed to approve credit request' });
    } finally {
      client.release();
    }
  }

  /**
   * Reject credit request (Super Admin)
   * POST /api/credits/reject/:id
   */
  async rejectCreditRequest(req, res) {
    const client = await db.getClient();
    
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const rejectedBy = req.user.id;

      if (!rejection_reason) {
        return res.status(400).json({ 
          error: 'Rejection reason is required' 
        });
      }

      // Update request status
      const result = await client.query(
        `UPDATE credit_requests 
         SET status = 'rejected', 
             processed_at = CURRENT_TIMESTAMP, 
             processed_by = $1,
             rejection_reason = $2
         WHERE id = $3 AND status = 'pending'
         RETURNING *`,
        [rejectedBy, rejection_reason, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Credit request not found or already processed' 
        });
      }

      const request = result.rows[0];

      // Get tenant information
      const tenantResult = await client.query(
        'SELECT tenant_name, email FROM tenants WHERE id = $1',
        [request.tenant_id]
      );

      const tenant = tenantResult.rows.length > 0 ? tenantResult.rows[0] : null;

      // Send rejection notification email to tenant
      if (tenant) {
        emailService.sendCreditRejectionEmail(
          tenant.email,
          tenant.tenant_name,
          request.requested_amount,
          rejection_reason
        ).catch(err => console.error('Email notification failed:', err));
      }

      await client.query('COMMIT');

      res.json({
        message: 'Credit request rejected',
        request: result.rows[0]
      });

    } catch (error) {
      console.error('Reject credit request error:', error);
      res.status(500).json({ error: 'Failed to reject credit request' });
    } finally {
      client.release();
    }
  }

  /**
   * Get credit balance (Tenant)
   * GET /api/credits/balance
   */
  async getCreditBalance(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const balanceResult = await db.query(
        'SELECT * FROM tenant_credit_balance WHERE tenant_id = $1',
        [tenantId]
      );

      // Get total coupons created count
      const couponsResult = await db.query(
        'SELECT COUNT(*) as total_coupons_created FROM coupons WHERE tenant_id = $1',
        [tenantId]
      );

      if (balanceResult.rows.length === 0) {
        return res.json({
          balance: 0,
          total_received: 0,
          total_spent: 0,
          total_coupons_created: parseInt(couponsResult.rows[0].total_coupons_created) || 0
        });
      }

      res.json({
        ...balanceResult.rows[0],
        total_coupons_created: parseInt(couponsResult.rows[0].total_coupons_created) || 0
      });

    } catch (error) {
      console.error('Get credit balance error:', error);
      res.status(500).json({ error: 'Failed to fetch credit balance' });
    }
  }

  /**
   * Get credit transactions
   * GET /api/credits/transactions
   */
  async getCreditTransactions(req, res) {
    try {
      const { page = 1, limit = 20, type } = req.query;
      const offset = (page - 1) * limit;
      
      let tenantId;
      if (req.user.role === 'SUPER_ADMIN') {
        tenantId = req.query.tenant_id; // Admin can view any tenant
      } else {
        tenantId = req.user.tenant_id; // Tenant can only view own
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      let query = `
        SELECT ct.*, t.tenant_name, u.full_name as created_by_name
        FROM credit_transactions ct
        JOIN tenants t ON ct.tenant_id = t.id
        LEFT JOIN users u ON ct.created_by = u.id
        WHERE ct.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;

      if (type) {
        query += ` AND ct.transaction_type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      query += ` ORDER BY ct.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({ transactions: result.rows });

    } catch (error) {
      console.error('Get credit transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch credit transactions' });
    }
  }
}

module.exports = new CreditController();
