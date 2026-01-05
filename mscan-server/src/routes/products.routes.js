/**
 * Products Routes
 * API endpoints for product management
 */

const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
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

// GET /api/products - List products
router.get('/', productsController.getProducts);

// GET /api/products/:id - Get single product
router.get('/:id', productsController.getProduct);

// POST /api/products - Create product
router.post('/', productsController.createProduct);

// PUT /api/products/:id - Update product
router.put('/:id', productsController.updateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', productsController.deleteProduct);

module.exports = router;
