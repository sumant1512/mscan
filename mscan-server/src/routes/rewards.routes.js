/**
 * Rewards System Routes
 */

const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewards.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Middleware to check tenant role
const requireTenant = (req, res, next) => {
  if (!req.user.tenant_id) {
    return res.status(403).json({ 
      error: 'Access denied. Tenant access required.' 
    });
  }
  next();
};

// Public routes (no auth required)
router.post('/scans/verify', rewardsController.verifyScan);

// Apply auth middleware for protected routes
router.use(authMiddleware.authenticate);

// Verification app routes (Tenant)
router.post('/verification-apps', requireTenant, rewardsController.createVerificationApp);
router.get('/verification-apps', requireTenant, rewardsController.getVerificationApps);
router.get('/verification-apps/:id', requireTenant, rewardsController.getVerificationAppById);
router.put('/verification-apps/:id', requireTenant, rewardsController.updateVerificationApp);

// Coupon routes (Tenant)
router.post('/coupons', requireTenant, rewardsController.createCoupon);
router.post('/coupons/multi-batch', requireTenant, rewardsController.createMultiBatchCoupons);
router.get('/coupons', requireTenant, rewardsController.getCoupons);
router.get('/coupons/:id', requireTenant, rewardsController.getCouponById);
router.patch('/coupons/:id/status', requireTenant, rewardsController.updateCouponStatus);

// Coupon lifecycle routes (Tenant)
router.post('/coupons/activate-range', requireTenant, rewardsController.activateCouponRange);
router.post('/coupons/activate-batch', requireTenant, rewardsController.activateCouponBatch);
router.post('/coupons/bulk-activate', requireTenant, rewardsController.bulkActivateCoupons);
router.patch('/coupons/:id/print', requireTenant, rewardsController.markCouponAsPrinted);
router.post('/coupons/bulk-print', requireTenant, rewardsController.bulkMarkAsPrinted);
router.post('/coupons/deactivate-range', requireTenant, rewardsController.deactivateCouponRange);

// Scan routes (Tenant)
router.get('/scans/history', requireTenant, rewardsController.getScanHistory);
router.get('/scans/analytics', requireTenant, rewardsController.getScanAnalytics);

module.exports = router;
