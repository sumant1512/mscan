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
          pt.name as template_name,
          COALESCE(
            json_object_agg(pav.attribute_key, pav.attribute_value)
            FILTER (WHERE pav.attribute_key IS NOT NULL),
            '{}'::json
          ) as attributes
        FROM products p
        LEFT JOIN verification_apps va ON p.verification_app_id = va.id
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        LEFT JOIN product_attribute_values pav ON p.id = pav.product_id
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
        GROUP BY p.id, va.app_name, va.code, pt.name
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
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
          pt.name as template_name,
          pt.id as template_id,
          COALESCE(
            json_object_agg(pav.attribute_key, pav.attribute_value)
            FILTER (WHERE pav.attribute_key IS NOT NULL),
            '{}'::json
          ) as attributes
        FROM products p
        LEFT JOIN verification_apps va ON p.verification_app_id = va.id
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        LEFT JOIN product_attribute_values pav ON p.id = pav.product_id
        WHERE p.id = $1 AND p.tenant_id = $2
        GROUP BY p.id, va.app_name, va.code, pt.name, pt.id
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
        product_sku,
        description,
        verification_app_id,
        price,
        currency = 'USD',
        image_url,
        template_id,
        attributes = {}
      } = req.body;

      // Validation
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      // Check if SKU already exists for this tenant
      if (product_sku) {
        const existing = await client.query(
          'SELECT id FROM products WHERE tenant_id = $1 AND product_sku = $2',
          [tenantId, product_sku]
        );

        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Product SKU already exists' });
        }
      }

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

      // Insert product
      const productResult = await client.query(
        `INSERT INTO products
         (tenant_id, product_name, product_sku, description, price, currency, image_url, verification_app_id, template_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          tenantId,
          product_name,
          product_sku || null,
          description || null,
          price || null,
          currency,
          image_url || null,
          verification_app_id && verification_app_id !== '' ? verification_app_id : null,
          template_id || null
        ]
      );

      const productId = productResult.rows[0].id;

      // Insert attribute values
      if (template_id && Object.keys(attributes).length > 0) {
        for (const [key, value] of Object.entries(attributes)) {
          // Skip null/undefined values
          if (value === null || value === undefined) continue;

          await client.query(
            `INSERT INTO product_attribute_values (product_id, attribute_key, attribute_value)
             VALUES ($1, $2, $3)`,
            [productId, key, JSON.stringify(value)]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch complete product with attributes
      const completeProduct = await client.query(`
        SELECT
          p.*,
          COALESCE(
            json_object_agg(pav.attribute_key, pav.attribute_value)
            FILTER (WHERE pav.attribute_key IS NOT NULL),
            '{}'::json
          ) as attributes
        FROM products p
        LEFT JOIN product_attribute_values pav ON p.id = pav.product_id
        WHERE p.id = $1
        GROUP BY p.id
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
        product_sku,
        description,
        price,
        currency,
        image_url,
        is_active,
        template_id,
        attributes
      } = req.body;

      // Check if product exists and belongs to tenant
      const existing = await client.query(
        'SELECT id, template_id FROM products WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if SKU already exists for another product
      if (product_sku) {
        const skuCheck = await client.query(
          'SELECT id FROM products WHERE tenant_id = $1 AND product_sku = $2 AND id != $3',
          [tenantId, product_sku, id]
        );

        if (skuCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Product SKU already exists' });
        }
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

      // Update product
      const result = await client.query(
        `UPDATE products
         SET product_name = COALESCE($1, product_name),
             product_sku = COALESCE($2, product_sku),
             description = COALESCE($3, description),
             price = COALESCE($4, price),
             currency = COALESCE($5, currency),
             image_url = COALESCE($6, image_url),
             is_active = COALESCE($7, is_active),
             template_id = COALESCE($8, template_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND tenant_id = $10
         RETURNING *`,
        [
          product_name,
          product_sku,
          description,
          price,
          currency,
          image_url,
          is_active,
          template_id,
          id,
          tenantId
        ]
      );

      // Update attributes if provided
      if (attributes && effectiveTemplateId) {
        // Delete existing attribute values for this product
        await client.query(
          'DELETE FROM product_attribute_values WHERE product_id = $1',
          [id]
        );

        // Insert new attribute values
        for (const [key, value] of Object.entries(attributes)) {
          // Skip null/undefined values
          if (value === null || value === undefined) continue;

          await client.query(
            `INSERT INTO product_attribute_values (product_id, attribute_key, attribute_value)
             VALUES ($1, $2, $3)`,
            [id, key, JSON.stringify(value)]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch complete product with attributes
      const completeProduct = await client.query(`
        SELECT
          p.*,
          COALESCE(
            json_object_agg(pav.attribute_key, pav.attribute_value)
            FILTER (WHERE pav.attribute_key IS NOT NULL),
            '{}'::json
          ) as attributes
        FROM products p
        LEFT JOIN product_attribute_values pav ON p.id = pav.product_id
        WHERE p.id = $1
        GROUP BY p.id
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
          pt.name as template_name,
          json_agg(
            json_build_object(
              'key', ta.attribute_key,
              'name', ta.attribute_name,
              'value', pav.attribute_value,
              'data_type', ta.data_type,
              'field_group', ta.field_group
            ) ORDER BY ta.display_order
          ) FILTER (WHERE ta.id IS NOT NULL) as attributes
        FROM products p
        LEFT JOIN product_templates pt ON p.template_id = pt.id
        LEFT JOIN template_attributes ta ON pt.id = ta.template_id
        LEFT JOIN product_attribute_values pav ON p.id = pav.product_id AND ta.attribute_key = pav.attribute_key
        WHERE p.id = $1 AND p.tenant_id = $2
        GROUP BY p.id, p.template_id, pt.name
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({
        product_id: result.rows[0].product_id,
        template: {
          id: result.rows[0].template_id,
          name: result.rows[0].template_name
        },
        attributes: result.rows[0].attributes || []
      });
    } catch (error) {
      console.error('Get product attributes error:', error);
      res.status(500).json({ error: 'Failed to fetch product attributes', message: error.message });
    }
  }
};

module.exports = productsController;
