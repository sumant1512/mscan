/**
 * Products Controller
 * Handles product catalog management for tenants
 */

const db = require('../config/database');

const productsController = {
  /**
   * GET /api/products
   * Get all products for tenant
   */
  async getProducts(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { page = 1, limit = 50, search = '', category = '', app_id } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT p.*, c.name as category_name, va.app_name, va.code as app_code
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN verification_apps va ON p.verification_app_id = va.id
        WHERE p.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;
      
      // Optionally filter by app_id if provided
      if (app_id) {
        query += ` AND p.verification_app_id = $${paramIndex}`;
        params.push(app_id);
        paramIndex++;
      }

      if (search) {
        query += ` AND (p.product_name ILIKE $${paramIndex} OR p.product_sku ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (category) {
        query += ` AND p.category_id = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count with filters
      let countQuery = 'SELECT COUNT(*) FROM products WHERE tenant_id = $1';
      const countParams = [tenantId];
      let countIndex = 2;
      
      if (app_id) {
        countQuery += ` AND verification_app_id = $${countIndex}`;
        countParams.push(app_id);
        countIndex++;
      }

      const countResult = await db.query(countQuery, countParams);

      res.json({
        products: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  },

  /**
   * GET /api/products/:id
   * Get single product
   */
  async getProduct(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const result = await db.query(
        'SELECT * FROM products WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ product: result.rows[0] });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  },

  /**
   * POST /api/products
   * Create new product
   */
  async createProduct(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const {
        product_name,
        product_sku,
        description,
        category_id,
        verification_app_id,
        price,
        currency = 'USD',
        image_url
      } = req.body;

      // Validation
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      // Check if SKU already exists for this tenant
      if (product_sku) {
        const existing = await db.query(
          'SELECT id FROM products WHERE tenant_id = $1 AND product_sku = $2',
          [tenantId, product_sku]
        );

        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Product SKU already exists' });
        }
      }

      const result = await db.query(
        `INSERT INTO products 
         (tenant_id, product_name, product_sku, description, category_id, price, currency, image_url, verification_app_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          tenantId,
          product_name,
          product_sku || null,
          description || null,
          category_id && category_id !== '' ? category_id : null,
          price || null,
          currency,
          image_url || null,
          verification_app_id && verification_app_id !== '' ? verification_app_id : null
        ]
      );

      res.status(201).json({
        message: 'Product created successfully',
        product: result.rows[0]
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  },

  /**
   * PUT /api/products/:id
   * Update product
   */
  async updateProduct(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;
      const {
        product_name,
        product_sku,
        description,
        category_id,
        price,
        currency,
        image_url,
        is_active
      } = req.body;

      // Check if product exists and belongs to tenant
      const existing = await db.query(
        'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if SKU already exists for another product
      if (product_sku) {
        const skuCheck = await db.query(
          'SELECT id FROM products WHERE tenant_id = $1 AND product_sku = $2 AND id != $3',
          [tenantId, product_sku, id]
        );

        if (skuCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Product SKU already exists' });
        }
      }

      const result = await db.query(
        `UPDATE products 
         SET product_name = COALESCE($1, product_name),
             product_sku = COALESCE($2, product_sku),
             description = COALESCE($3, description),
             category_id = COALESCE($4, category_id),
             price = COALESCE($5, price),
             currency = COALESCE($6, currency),
             image_url = COALESCE($7, image_url),
             is_active = COALESCE($8, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND tenant_id = $10
         RETURNING *`,
        [
          product_name,
          product_sku,
          description,
          category_id && category_id !== '' ? parseInt(category_id) : null,
          price,
          currency,
          image_url,
          is_active,
          id,
          tenantId
        ]
      );

      res.json({
        message: 'Product updated successfully',
        product: result.rows[0]
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  },

  /**
   * DELETE /api/products/:id
   * Delete product
   */
  async deleteProduct(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      // Check if product has associated coupons
      const couponsCheck = await db.query(
        'SELECT COUNT(*) FROM coupons WHERE product_id = $1',
        [id]
      );

      if (parseInt(couponsCheck.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Cannot delete product with associated coupons',
          coupon_count: parseInt(couponsCheck.rows[0].count)
        });
      }

      const result = await db.query(
        'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
};

module.exports = productsController;
