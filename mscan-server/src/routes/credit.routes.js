/**
 * Credit Management Routes
 */

const express = require('express');
const router = express.Router();
const creditController = require('../controllers/credit.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Middleware to check roles
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied. Super Admin privileges required.' 
    });
  }
  next();
};

const requireTenant = (req, res, next) => {
  // Explicitly block super admin
  if (req.user.role === 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Access denied. This endpoint is for tenant admins only.'
    });
  }

  // Check for tenant context
  if (!req.user.tenant_id) {
    return res.status(403).json({
      error: 'Access denied. Tenant access required.'
    });
  }

  next();
};

// Apply auth middleware to all routes
router.use(authMiddleware.authenticate);

// Tenant-only routes (blocked for super admin)
router.post('/request', requireTenant, creditController.requestCredits);
router.get('/requests/my', requireTenant, creditController.getMyCreditRequests);
router.get('/balance', requireTenant, creditController.getCreditBalance);

// Shared routes (works for both super admin and tenant admin)
router.get('/transactions', creditController.getCreditTransactions);

// Super Admin routes
router.get('/requests', requireSuperAdmin, creditController.getAllCreditRequests);
router.post('/approve/:id', requireSuperAdmin, creditController.approveCreditRequest);
router.post('/reject/:id', requireSuperAdmin, creditController.rejectCreditRequest);

module.exports = router;
