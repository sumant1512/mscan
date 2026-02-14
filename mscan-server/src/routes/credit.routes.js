/**
 * Credit Management Routes
 * Uses unified tenant-context-based architecture
 * All routes use tenant context middleware for automatic isolation
 */

const express = require('express');
const router = express.Router();
const creditController = require('../controllers/credit.controller');
const authMiddleware = require('../middleware/auth.middleware');
const tenantContextMiddleware = require('../middleware/tenant-context.middleware');

// Middleware to check roles (for truly role-specific operations)
const requireSuperAdmin = (req, res, next) => {
  if (!req.tenantContext?.isSuperAdmin) {
    return res.status(403).json({
      error: 'Access denied. Super Admin privileges required.'
    });
  }
  next();
};

const requireTenant = (req, res, next) => {
  // Explicitly block super admin
  if (req.tenantContext?.isSuperAdmin) {
    return res.status(403).json({
      error: 'Access denied. This endpoint is for tenant admins only.'
    });
  }

  // Check for tenant context
  if (!req.tenantContext?.tenantId) {
    return res.status(403).json({
      error: 'Access denied. Tenant access required.'
    });
  }

  next();
};

// Apply auth + tenant context middleware to all routes
router.use(authMiddleware.authenticate);
router.use(tenantContextMiddleware);

// Tenant-only routes (blocked for super admin)
router.post('/request', requireTenant, creditController.requestCredits);
router.get('/balance', requireTenant, creditController.getCreditBalance);

// Unified routes (work for both super admin and tenant admin with automatic isolation)
// GET /api/credits/requests?status=pending|approved|rejected|history|all
router.get('/requests', creditController.getAllCreditRequests);

// GET /api/credits/transactions?type=CREDIT|DEBIT|REFUND|all&app_id=xxx
router.get('/transactions', creditController.getCreditTransactions);

// Super Admin only routes
router.post('/approve/:id', requireSuperAdmin, creditController.approveCreditRequest);
router.post('/reject/:id', requireSuperAdmin, creditController.rejectCreditRequest);

module.exports = router;
