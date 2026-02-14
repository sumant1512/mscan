/**
 * Products Controller (Enhanced with Dynamic Attributes)
 * Handles product catalog management for tenants with template-based attributes
 */

const db = require('../config/database');
const attributeValidator = require('../services/attributeValidator.service');

const productsController = {
  /**
   * GET /api/products
   * Get all products for tenant with dynamic attributes
   */
  async getProducts(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { page = 1, limit = 50, search = '', app_id, template_id } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT
          p.*,
          va.app_name,
          va.code as app_code,
          pt.template_name,
          pt.variant_config,
          pt.custom_fields
        FROM products p
        LEFT JOIN verification_apps va ON p.verification_app_id = va.id
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        WHERE p.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;

      // Optionally filter by app_id if provided (skip if "all" or empty)
      if (app_id && app_id !== '' && app_id !== 'all') {
        query += ` AND p.verification_app_id = $${paramIndex}`;
        params.push(app_id);
        paramIndex++;
      }

      // Filter by template_id if provided
      if (template_id) {
        query += ` AND p.template_id = $${paramIndex}`;
        params.push(template_id);
        paramIndex++;
      }

      if (search) {
        query += ` AND (p.product_name ILIKE $${paramIndex} OR p.product_sku ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += `
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count with filters
      let countQuery = 'SELECT COUNT(*) FROM products WHERE tenant_id = $1';
      const countParams = [tenantId];
      let countIndex = 2;

      if (app_id && app_id !== '' && app_id !== 'all') {
        countQuery += ` AND verification_app_id = $${countIndex}`;
        countParams.push(app_id);
        countIndex++;
      }

      if (template_id) {
        countQuery += ` AND template_id = $${countIndex}`;
        countParams.push(template_id);
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
      res.status(500).json({ error: 'Failed to fetch products', message: error.message });
    }
  },

  /**
   * GET /api/products/:id
   * Get single product with dynamic attributes
   */
  async getProduct(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        SELECT
          p.*,
          va.app_name,
          va.code as app_code,
          pt.template_name,
          pt.id as template_id,
          pt.variant_config,
          pt.custom_fields
        FROM products p
        LEFT JOIN verification_apps va ON p.verification_app_id = va.id
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        WHERE p.id = $1 AND p.tenant_id = $2
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ product: result.rows[0] });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product', message: error.message });
    }
  },

  /**
   * POST /api/products
   * Create new product with dynamic attributes
   */
  async createProduct(req, res) {
    const client = await db.pool.connect();

    try {
      const tenantId = req.user.tenant_id;
      const {
        product_name,
        verification_app_id,
        price,
        image_url,
        thumbnail_url,
        product_images = [],
        template_id,
        attributes = {}
      } = req.body;

      // Validation
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      if (!thumbnail_url) {
        return res.status(400).json({ error: 'Thumbnail image is required' });
      }

      if (!verification_app_id) {
        return res.status(400).json({ error: 'Verification app is required' });
      }

      // Get currency from verification app
      const appResult = await client.query(
        'SELECT currency FROM verification_apps WHERE id = $1 AND tenant_id = $2',
        [verification_app_id, tenantId]
      );

      if (appResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid verification app' });
      }

      const currency = appResult.rows[0].currency || 'INR';

      // Validate attributes if template_id is provided
      if (template_id) {
        const validation = await attributeValidator.validateAttributes(template_id, attributes);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Attribute validation failed',
            validation_errors: validation.errors
          });
        }
      }

      await client.query('BEGIN');

      // Insert product with attributes in JSONB column
      const productResult = await client.query(
        `INSERT INTO products
         (tenant_id, product_name, price, currency, image_url, thumbnail_url, product_images, verification_app_id, template_id, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          tenantId,
          product_name,
          price || null,
          currency,
          image_url || null,
          thumbnail_url,
          JSON.stringify(product_images || []),
          verification_app_id,
          template_id || null,
          JSON.stringify(attributes || {})
        ]
      );

      const productId = productResult.rows[0].id;

      await client.query('COMMIT');

      // Fetch complete product with template info
      const completeProduct = await client.query(`
        SELECT
          p.*,
          pt.template_name,
          pt.variant_config,
          pt.custom_fields
        FROM products p
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        WHERE p.id = $1
      `, [productId]);

      res.status(201).json({
        message: 'Product created successfully',
        product: completeProduct.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product', message: error.message });
    } finally {
      client.release();
    }
  },

  /**
   * PUT /api/products/:id
   * Update product with dynamic attributes
   */
  async updateProduct(req, res) {
    const client = await db.pool.connect();

    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;
      const {
        product_name,
        price,
        image_url,
        thumbnail_url,
        product_images,
        is_active,
        template_id,
        attributes
      } = req.body;

      // Check if product exists and belongs to tenant
      const existing = await client.query(
        'SELECT id, template_id, verification_app_id FROM products WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Validate attributes if provided and template exists
      const effectiveTemplateId = template_id || existing.rows[0].template_id;
      if (attributes && effectiveTemplateId) {
        const validation = await attributeValidator.validateAttributes(effectiveTemplateId, attributes);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Attribute validation failed',
            validation_errors: validation.errors
          });
        }
      }

      await client.query('BEGIN');

      // Update product with attributes in JSONB column (currency is not updatable - it comes from verification app)
      const result = await client.query(
        `UPDATE products
         SET product_name = COALESCE($1, product_name),
             price = COALESCE($2, price),
             image_url = COALESCE($3, image_url),
             thumbnail_url = COALESCE($4, thumbnail_url),
             product_images = COALESCE($5, product_images),
             is_active = COALESCE($6, is_active),
             template_id = COALESCE($7, template_id),
             attributes = COALESCE($8, attributes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND tenant_id = $10
         RETURNING *`,
        [
          product_name,
          price,
          image_url,
          thumbnail_url,
          product_images ? JSON.stringify(product_images) : null,
          is_active,
          template_id,
          attributes ? JSON.stringify(attributes) : null,
          id,
          tenantId
        ]
      );

      await client.query('COMMIT');

      // Fetch complete product with template info
      const completeProduct = await client.query(`
        SELECT
          p.*,
          pt.template_name,
          pt.variant_config,
          pt.custom_fields
        FROM products p
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        WHERE p.id = $1
      `, [id]);

      res.json({
        message: 'Product updated successfully',
        product: completeProduct.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product', message: error.message });
    } finally {
      client.release();
    }
  },

  /**
   * DELETE /api/products/:id
   * Delete product (attributes cascade automatically)
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

      // Delete product (attribute values will cascade due to ON DELETE CASCADE)
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
      res.status(500).json({ error: 'Failed to delete product', message: error.message });
    }
  },

  /**
   * GET /api/products/:id/attributes
   * Get product attributes with template metadata
   */
  async getProductAttributes(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        SELECT
          p.id as product_id,
          p.template_id,
          p.attributes,
          pt.template_name,
          pt.variant_config,
          pt.custom_fields
        FROM products p
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        WHERE p.id = $1 AND p.tenant_id = $2
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({
        product_id: result.rows[0].product_id,
        template: {
          id: result.rows[0].template_id,
          name: result.rows[0].template_name,
          variant_config: result.rows[0].variant_config,
          custom_fields: result.rows[0].custom_fields
        },
        attributes: result.rows[0].attributes || {}
      });
    } catch (error) {
      console.error('Get product attributes error:', error);
      res.status(500).json({ error: 'Failed to fetch product attributes', message: error.message });
    }
  }
};

module.exports = productsController;
