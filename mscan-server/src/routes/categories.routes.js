/**
 * Categories Routes
 * API endpoints for category management
 */

const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
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

// All routes require authentication and tenant user
router.use(authMiddleware.authenticate);
router.use(requireTenant);

// GET /api/categories - List categories
router.get('/', categoriesController.getCategories);

// GET /api/categories/:id - Get single category
router.get('/:id', categoriesController.getCategory);

// POST /api/categories - Create category
router.post('/', categoriesController.createCategory);

// PUT /api/categories/:id - Update category
router.put('/:id', categoriesController.updateCategory);

// DELETE /api/categories/:id - Delete category
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;
