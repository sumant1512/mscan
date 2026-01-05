/**
 * Tenant Management Routes
 * All routes require SUPER_ADMIN role
 */

const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Middleware to check Super Admin role
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied. Super Admin privileges required.' 
    });
  }
  next();
};

// Public endpoints (no auth required) - for tenant registration form
router.get('/check-slug/:slug', tenantController.checkSlugAvailability);
router.get('/suggest-slugs', tenantController.getSuggestedSlugs);

// Apply auth middleware to protected routes
router.use(authMiddleware.authenticate);
router.use(requireSuperAdmin);

// Tenant CRUD operations
router.post('/', tenantController.createTenant);
router.get('/', tenantController.getAllTenants);
router.get('/:id', tenantController.getTenantById);
router.put('/:id', tenantController.updateTenant);
router.patch('/:id/status', tenantController.toggleTenantStatus);

module.exports = router;
