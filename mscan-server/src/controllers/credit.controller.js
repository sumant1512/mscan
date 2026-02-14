/**
 * Credit Management Controller
 * Handles credit requests, approvals, and balance tracking
 * Uses unified service layer with tenant-context-based isolation
 */

const db = require("../config/database");
const emailService = require("../services/email.service");
const creditService = require("../services/credit.service");

class CreditController {
  /**
   * Request credits (Tenant Admin only)
   * POST /api/credits/request
   * Super admins cannot request credits (they approve them)
   */
  async requestCredits(req, res) {
    try {
      const { tenantId, isSuperAdmin, userId } = req.tenantContext;

      // This endpoint is only for tenant admins
      if (isSuperAdmin) {
        return res.status(403).json({
          error:
            "Super admins cannot request credits. This endpoint is for tenant admins only.",
        });
      }

      const { requested_amount, justification } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          error: "Tenant ID not found. This endpoint requires tenant context.",
        });
      }

      // Validation
      if (!requested_amount || requested_amount <= 0) {
        return res.status(400).json({
          error: "Invalid credit amount. Must be positive integer.",
        });
      }

      if (requested_amount < 100) {
        return res.status(400).json({
          error: "Minimum credit request is 100 credits",
        });
      }

      // Check for existing pending request
      const pendingCheck = await db.query(
        "SELECT id FROM credit_requests WHERE tenant_id = $1 AND status = $2",
        [tenantId, "pending"],
      );

      if (pendingCheck.rows.length > 0) {
        return res.status(409).json({
          error:
            "You already have a pending credit request. Please wait for approval.",
        });
      }

      // Create credit request
      const result = await db.query(
        `INSERT INTO credit_requests (tenant_id, requested_by, requested_amount, justification, status, requested_at)
         VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
         RETURNING *`,
        [tenantId, userId, requested_amount, justification],
      );

      // TODO: Notify Super Admins of new credit request

      res.status(201).json({
        message: "Credit request submitted successfully",
        request: result.rows[0],
      });
    } catch (error) {
      console.error("Request credits error:", error);
      res.status(500).json({ error: "Failed to submit credit request" });
    }
  }

  /**
   * Get credit requests with unified filtering
   * GET /api/credits/requests
   * Uses tenant context middleware for isolation
   * Supports status filtering: pending|approved|rejected|history|all
   * Supports tenant filtering: tenant_id=xxx (super admin only)
   */
  async getAllCreditRequests(req, res) {
    try {
      const { status = "pending", page = 1, limit = 20 } = req.query;
      const { tenantId, isSuperAdmin } = req.tenantContext;

      // Use unified service layer
      const result = await creditService.getRequests({
        tenantId,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        isSuperAdmin,
      });

      res.json(result);
    } catch (error) {
      console.error("Get credit requests error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch credit requests" });
    }
  }

  /**
   * Approve credit request (Super Admin)
   * POST /api/credits/approve/:id
   */
  async approveCreditRequest(req, res) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { userId } = req.tenantContext;
      const approvedBy = userId;

      // Get credit request
      const requestResult = await client.query(
        "SELECT * FROM credit_requests WHERE id = $1 AND status = $2",
        [id, "pending"],
      );

      if (requestResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Credit request not found or already processed",
        });
      }

      const request = requestResult.rows[0];

      // Get tenant information
      const tenantResult = await client.query(
        "SELECT tenant_name, email FROM tenants WHERE id = $1",
        [request.tenant_id],
      );

      if (tenantResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Tenant not found",
        });
      }

      const tenant = tenantResult.rows[0];

      // Get current balance
      const balanceResult = await client.query(
        "SELECT * FROM tenant_credit_balance WHERE tenant_id = $1",
        [request.tenant_id],
      );

      const currentBalance =
        balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;
      const newBalance = currentBalance + request.requested_amount;

      // Update or insert credit balance
      await client.query(
        `INSERT INTO tenant_credit_balance (tenant_id, balance, total_received, total_spent)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           balance = tenant_credit_balance.balance + $3,
           total_received = tenant_credit_balance.total_received + $3,
           updated_at = CURRENT_TIMESTAMP`,
        [request.tenant_id, newBalance, request.requested_amount],
      );

      // Create transaction record
      // Note: created_by is the requester (who initiated), not the approver
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
          request.requested_by, // Use requester's ID, not approver's ID
        ],
      );

      // Update request status
      await client.query(
        `UPDATE credit_requests 
         SET status = 'approved', 
             processed_at = CURRENT_TIMESTAMP, 
             processed_by = $1
         WHERE id = $2`,
        [approvedBy, id],
      );

      await client.query("COMMIT");

      // Send approval notification email to tenant
      emailService
        .sendCreditApprovalEmail(
          tenant.email,
          tenant.tenant_name,
          request.requested_amount,
        )
        .catch((err) => console.error("Email notification failed:", err));

      res.json({
        message: "Credit request approved successfully",
        credits_added: request.requested_amount,
        new_balance: newBalance,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Approve credit request error:", error);
      res.status(500).json({ error: "Failed to approve credit request" });
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
      const { userId } = req.tenantContext;
      const rejectedBy = userId;

      if (!rejection_reason) {
        return res.status(400).json({
          error: "Rejection reason is required",
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
        [rejectedBy, rejection_reason, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Credit request not found or already processed",
        });
      }

      const request = result.rows[0];

      // Get tenant information
      const tenantResult = await client.query(
        "SELECT tenant_name, email FROM tenants WHERE id = $1",
        [request.tenant_id],
      );

      const tenant = tenantResult.rows.length > 0 ? tenantResult.rows[0] : null;

      // Send rejection notification email to tenant
      if (tenant) {
        emailService
          .sendCreditRejectionEmail(
            tenant.email,
            tenant.tenant_name,
            request.requested_amount,
            rejection_reason,
          )
          .catch((err) => console.error("Email notification failed:", err));
      }

      await client.query("COMMIT");

      res.json({
        message: "Credit request rejected",
        request: result.rows[0],
      });
    } catch (error) {
      console.error("Reject credit request error:", error);
      res.status(500).json({ error: "Failed to reject credit request" });
    } finally {
      client.release();
    }
  }

  /**
   * Get credit balance
   * GET /api/credits/balance
   * Uses tenant context for isolation
   */
  async getCreditBalance(req, res) {
    try {
      const { tenantId } = req.tenantContext;

      if (!tenantId) {
        return res.status(400).json({
          error: "Tenant ID required. This endpoint requires tenant context.",
        });
      }

      const balance = await creditService.getBalance(tenantId);
      res.json(balance);
    } catch (error) {
      console.error("Get credit balance error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch credit balance" });
    }
  }

  /**
   * Get credit transactions with unified filtering
   * GET /api/credits/transactions
   * Uses tenant context middleware for isolation
   * Supports type filtering: CREDIT|DEBIT|REFUND|all
   */
  async getCreditTransactions(req, res) {
    try {
      const { page = 1, limit = 20, type = "all", app_id } = req.query;
      const { tenantId, isSuperAdmin } = req.tenantContext;

      // Use unified service layer
      const result = await creditService.getTransactions({
        tenantId,
        type,
        appId: app_id,
        page: parseInt(page),
        limit: parseInt(limit),
        isSuperAdmin,
      });

      res.json(result);
    } catch (error) {
      console.error("Get credit transactions error:", error);
      res
        .status(500)
        .json({
          error: error.message || "Failed to fetch credit transactions",
        });
    }
  }
}

module.exports = new CreditController();
