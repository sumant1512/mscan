/**
 * Rewards System Controller
 * Handles verification apps, coupons, and scans
 */

const db = require('../config/database');
const pool = db.pool;
const creditCalculator = require('../services/credit-calculator.service');
const couponGenerator = require('../services/coupon-generator.service');

class RewardsController {
  /**
   * Create verification app (Tenant)
   * POST /api/verification-apps
   */
  async createVerificationApp(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const crypto = require('crypto');
      const {
        app_name,
        description,
        logo_url,
        primary_color,
        secondary_color,
        welcome_message,
        scan_success_message,
        scan_failure_message,
        post_scan_redirect_url,
        template_id
      } = req.body;

      if (!app_name) {
        return res.status(400).json({ error: 'App name is required' });
      }

      if (!template_id) {
        return res.status(400).json({ error: 'Product template is required. Please create a template first.' });
      }

      // Validate template exists and belongs to tenant
      const templateCheck = await db.query(
        'SELECT id FROM product_templates WHERE id = $1 AND tenant_id = $2',
        [template_id, tenantId]
      );

      if (templateCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid template ID or template does not belong to your tenant' });
      }

      // Generate URL-friendly code from app name
      let code = app_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if code already exists for this tenant, if so, append number
      const existingCode = await db.query(
        `SELECT code FROM verification_apps WHERE tenant_id = $1 AND code LIKE $2`,
        [tenantId, `${code}%`]
      );

      if (existingCode.rows.length > 0) {
        code = `${code}-${existingCode.rows.length + 1}`;
      }

      // Generate API key
      const apiKey = crypto.randomBytes(32).toString('hex');

      const result = await db.query(
        `INSERT INTO verification_apps
         (tenant_id, app_name, code, api_key, description, logo_url, primary_color, secondary_color,
          welcome_message, scan_success_message, scan_failure_message, post_scan_redirect_url, template_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
         RETURNING *`,
        [tenantId, app_name, code, apiKey, description, logo_url, primary_color, secondary_color,
         welcome_message || 'Welcome! Scan your QR code to redeem your reward.',
         scan_success_message || 'Success! Your coupon has been verified.',
         scan_failure_message || 'Sorry, this coupon is not valid.',
         post_scan_redirect_url, template_id]
      );

      res.status(201).json({
        message: 'Verification app created successfully',
        app: result.rows[0],
        important: 'Please save the API key. It will not be shown again in full.'
      });

    } catch (error) {
      console.error('Create verification app error:', error);
      res.status(500).json({ error: 'Failed to create verification app' });
    }
  }

  /**
   * Get verification apps (Tenant)
   * GET /api/verification-apps
   */
  async getVerificationApps(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `SELECT va.id AS verification_app_id,
                va.app_name,
                va.code,
                va.description,
                va.logo_url,
                va.primary_color,
                va.secondary_color,
                va.welcome_message,
                va.scan_success_message,
                va.scan_failure_message,
                va.post_scan_redirect_url,
                va.is_active,
                va.tenant_id,
                va.template_id,
                pt.template_name,
                va.created_at,
                va.updated_at,
                COUNT(DISTINCT c.id) as total_coupons,
                COUNT(DISTINCT s.id) as total_scans
         FROM verification_apps va
         LEFT JOIN coupons c ON va.id = c.verification_app_id
         LEFT JOIN scans s ON c.id = s.coupon_id
         LEFT JOIN product_templates pt ON va.template_id = pt.id
         WHERE va.tenant_id = $1
         GROUP BY va.id, pt.id, pt.template_name
         ORDER BY va.created_at DESC`,
        [tenantId]
      );

      res.json({ apps: result.rows });

    } catch (error) {
      console.error('Get verification apps error:', error);
      res.status(500).json({ error: 'Failed to fetch verification apps' });
    }
  }

  /**
   * Get single verification app (Tenant)
   * GET /api/verification-apps/:id
   */
  async getVerificationAppById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `SELECT va.id AS verification_app_id,
                va.app_name,
                va.code,
                va.description,
                va.logo_url,
                va.primary_color,
                va.secondary_color,
                va.welcome_message,
                va.scan_success_message,
                va.scan_failure_message,
                va.post_scan_redirect_url,
                va.is_active,
                va.tenant_id,
                va.template_id,
                pt.template_name,
                va.created_at,
                va.updated_at,
                COUNT(DISTINCT c.id) as total_coupons,
                COUNT(DISTINCT s.id) as total_scans
         FROM verification_apps va
         LEFT JOIN coupons c ON va.id = c.verification_app_id
         LEFT JOIN scans s ON c.id = s.coupon_id
         LEFT JOIN product_templates pt ON va.template_id = pt.id
         WHERE va.id = $1 AND va.tenant_id = $2
         GROUP BY va.id, va.app_name, va.code, va.description, va.logo_url, va.primary_color, va.secondary_color, va.welcome_message, va.scan_success_message, va.scan_failure_message, va.post_scan_redirect_url, va.is_active, va.tenant_id, va.template_id, pt.template_name, va.created_at, va.updated_at`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Verification app not found' });
      }

      res.json({ app: result.rows[0] });

    } catch (error) {
      console.error('Get verification app by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch verification app' });
    }
  }

  /**
   * Update verification app (Tenant)
   * PUT /api/verification-apps/:id
   */
  async updateVerificationApp(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;
      const updates = req.body;

      const result = await db.query(
        `UPDATE verification_apps
         SET app_name = COALESCE($1, app_name),
             description = COALESCE($2, description),
             logo_url = COALESCE($3, logo_url),
             primary_color = COALESCE($4, primary_color),
             secondary_color = COALESCE($5, secondary_color),
             welcome_message = COALESCE($6, welcome_message),
             scan_success_message = COALESCE($7, scan_success_message),
             scan_failure_message = COALESCE($8, scan_failure_message),
             post_scan_redirect_url = COALESCE($9, post_scan_redirect_url),
             template_id = COALESCE($10, template_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $11 AND tenant_id = $12
         RETURNING *`,
        [updates.app_name, updates.description, updates.logo_url, updates.primary_color,
         updates.secondary_color, updates.welcome_message, updates.scan_success_message,
         updates.scan_failure_message, updates.post_scan_redirect_url,
         updates.template_id, id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Verification app not found' });
      }

      res.json({
        message: 'Verification app updated successfully',
        app: result.rows[0]
      });

    } catch (error) {
      console.error('Update verification app error:', error);
      res.status(500).json({ error: 'Failed to update verification app' });
    }
  }

  /**
   * Create coupon (Tenant)
   * POST /api/coupons
   * Supports both single coupon and batch generation
   */
  async createCoupon(req, res) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const tenantId = req.user.tenant_id;
      const {
        verification_app_id,
        discount_type,
        discount_value,
        discount_currency,
        buy_quantity,
        get_quantity,
        min_purchase_amount,
        expiry_date,
        total_usage_limit,
        per_user_usage_limit,
        description,
        terms,
        product_id,
        coupon_generation_type, // 'SINGLE' or 'BATCH'
        batch_quantity,
        quantity // Alias for batch_quantity (for E2E test compatibility)
      } = req.body;

      // Support 'quantity' as an alias for 'batch_quantity'
      // Auto-detect batch mode when quantity > 1
      let actualBatchQuantity = batch_quantity || quantity || 1;
      let actualGenerationType = coupon_generation_type;

      // Auto-detect batch mode
      if (!actualGenerationType && actualBatchQuantity > 1) {
        actualGenerationType = 'BATCH';
      } else if (!actualGenerationType) {
        actualGenerationType = 'SINGLE';
      }

      // Validation
      if (!discount_value || !expiry_date) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'discount_value and expiry_date are required'
        });
      }

      // Enforce FIXED_AMOUNT only
      if (discount_type && discount_type !== 'FIXED_AMOUNT') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Only FIXED_AMOUNT discount type is supported'
        });
      }

      // Validate batch quantity
      const isBatch = actualGenerationType === 'BATCH';

      if (isBatch && (!actualBatchQuantity || actualBatchQuantity < 1)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Batch quantity must be at least 1'
        });
      }

      if (isBatch && actualBatchQuantity > 500) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Batch quantity cannot exceed 500 coupons per request'
        });
      }

      // Calculate credit cost (simple: quantity × discount_value)
      const costCalculation = creditCalculator.calculateCouponCreditCost({
        discount_value,
        total_usage_limit,
        expiry_date,
        is_batch: isBatch,
        batch_quantity: actualBatchQuantity
      });

      // Check credit balance
      const balanceResult = await client.query(
        'SELECT balance FROM tenant_credit_balance WHERE tenant_id = $1',
        [tenantId]
      );

      const currentBalance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;

      if (currentBalance < costCalculation.total) {
        await client.query('ROLLBACK');
        return res.status(402).json({
          error: 'Insufficient credits',
          required: costCalculation.total,
          available: currentBalance,
          breakdown: costCalculation.breakdown
        });
      }

      // Generate batch ID for batch coupons
      const batchId = isBatch ? require('crypto').randomUUID() : null;
      const maxScansPerCode = 1; // Default: each coupon can be scanned once
      const createdCoupons = [];
      
      // Set default values if not provided
      const finalTotalUsageLimit = total_usage_limit !== undefined ? total_usage_limit : 1;
      const finalPerUserUsageLimit = per_user_usage_limit !== undefined ? per_user_usage_limit : 1;

      // Generate coupons (single or batch)
      for (let i = 0; i < actualBatchQuantity; i++) {
        // Generate unique random coupon code
        let couponCode;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
          couponCode = couponGenerator.generateCouponCode();
          const check = await client.query(
            'SELECT id FROM coupons WHERE coupon_code = $1',
            [couponCode]
          );
          isUnique = check.rows.length === 0;
          attempts++;
        }

        if (!isUnique) {
          await client.query('ROLLBACK');
          return res.status(500).json({ error: 'Failed to generate unique coupon code' });
        }

        // Generate sequential reference (CP-001, CP-002, etc.)
        const referenceResult = await client.query(
          'SELECT get_next_coupon_reference($1) as ref',
          [tenantId]
        );
        const couponReference = referenceResult.rows[0].ref;

        // Generate QR code with coupon_points
        const couponPoints = req.body.coupon_points || discount_value; // Default to discount_value if not specified
        const qrData = couponGenerator.generateQRData({ 
          coupon_code: couponCode, 
          tenant_id: tenantId,
          discount_type: 'FIXED_AMOUNT',
          discount_value,
          coupon_points: couponPoints,
          expiry_date
        });
        const qrCodeUrl = await couponGenerator.generateQRCodeImage(couponCode, qrData.url);

        // Create coupon
        const couponResult = await client.query(
          `INSERT INTO coupons 
           (tenant_id, verification_app_id, coupon_code, coupon_reference, discount_type, discount_value,
            discount_currency, buy_quantity, get_quantity, min_purchase_amount,
            expiry_date, total_usage_limit, per_user_usage_limit, qr_code_url,
            description, terms, credit_cost, status, max_scans_per_code, batch_id, batch_quantity,
            product_id, coupon_points)
           VALUES ($1, $2, $3, $4, 'FIXED_AMOUNT', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'draft', $17, $18, $19, $20, $21)
           RETURNING *`,
          [tenantId, verification_app_id, couponCode, couponReference, discount_value,
           discount_currency || 'USD', buy_quantity, get_quantity, min_purchase_amount,
           expiry_date, finalTotalUsageLimit, finalPerUserUsageLimit, qrCodeUrl,
           description, terms, discount_value, // Each coupon stores its own cost
           maxScansPerCode, batchId, i === 0 ? actualBatchQuantity : null, // Only first coupon stores batch quantity
           product_id || null, couponPoints]
        );

        createdCoupons.push(couponResult.rows[0]);
      }

      // Deduct credits (once for all coupons)
      const newBalance = currentBalance - costCalculation.total;
      await client.query(
        `UPDATE tenant_credit_balance 
         SET balance = $1,
             total_spent = total_spent + $2,
             last_updated = CURRENT_TIMESTAMP
         WHERE tenant_id = $3`,
        [newBalance, costCalculation.total, tenantId]
      );

      // Create transaction record
      const transactionDesc = isBatch 
        ? `Batch coupon creation: ${actualBatchQuantity} coupons`
        : `Coupon creation: ${createdCoupons[0].coupon_code}`;
      
      await client.query(
        `INSERT INTO credit_transactions 
         (tenant_id, transaction_type, amount, balance_before, balance_after,
          reference_id, reference_type, description, created_by)
         VALUES ($1, 'DEBIT', $2, $3, $4, $5, 'COUPON_CREATION', $6, $7)`,
        [tenantId, costCalculation.total, currentBalance, newBalance,
         createdCoupons[0].id, transactionDesc, req.user.id]
      );

      await client.query('COMMIT');

      // Return response
      if (isBatch) {
        // Ensure batch_id is present in each coupon object
        const couponsWithBatchId = createdCoupons.map(coupon => ({
          ...coupon,
          batch_id: batchId
        }));

        res.status(201).json({
          message: `${actualBatchQuantity} coupons created successfully`,
          coupons: couponsWithBatchId,
          batch_id: batchId,
          credit_cost: costCalculation.total,
          new_balance: newBalance
        });
      } else {
        res.status(201).json({
          message: 'Coupon created successfully',
          coupon: createdCoupons[0],
          credit_cost: costCalculation.total,
          new_balance: newBalance
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create coupon error:', error);
      res.status(500).json({ error: 'Failed to create coupon' });
    } finally {
      client.release();
    }
  }

  /**
   * Create multiple batches of coupons in a single operation
   * POST /api/rewards/coupons/multi-batch
   */
  async createMultiBatchCoupons(req, res) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const tenantId = req.user.tenant_id;
      const { verificationAppId, batches } = req.body;

      // Validation
      if (!verificationAppId || !batches || !Array.isArray(batches) || batches.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'verificationAppId and batches array are required'
        });
      }

      // Validate each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch.description || !batch.quantity || !batch.discountAmount || !batch.expiryDate) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Batch ${i + 1}: description, quantity, discountAmount, and expiryDate are required`
          });
        }
        if (batch.quantity < 1 || batch.quantity > 500) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Batch ${i + 1}: quantity must be between 1 and 500`
          });
        }
        if (batch.discountAmount < 0.01) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Batch ${i + 1}: discountAmount must be at least 0.01`
          });
        }
        // Validate expiry date is in the future
        const expiryDate = new Date(batch.expiryDate);
        if (expiryDate <= new Date()) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Batch ${i + 1}: expiry date must be in the future`
          });
        }
      }

      // Calculate total cost across all batches
      let totalCost = 0;
      for (const batch of batches) {
        totalCost += batch.quantity * batch.discountAmount;
      }

      // Check credit balance
      const balanceResult = await client.query(
        'SELECT balance FROM tenant_credit_balance WHERE tenant_id = $1',
        [tenantId]
      );

      const currentBalance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;

      if (currentBalance < totalCost) {
        await client.query('ROLLBACK');
        return res.status(402).json({
          error: 'Insufficient credits',
          required: totalCost,
          available: currentBalance
        });
      }

      // Create all coupons across all batches
      const allCreatedCoupons = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchId = require('crypto').randomUUID();

        for (let i = 0; i < batch.quantity; i++) {
          // Generate unique random coupon code
          let couponCode;
          let isUnique = false;
          let attempts = 0;
          
          while (!isUnique && attempts < 10) {
            couponCode = couponGenerator.generateCouponCode();
            const check = await client.query(
              'SELECT id FROM coupons WHERE coupon_code = $1',
              [couponCode]
            );
            isUnique = check.rows.length === 0;
            attempts++;
          }

          if (!isUnique) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Failed to generate unique coupon code' });
          }

          // Generate sequential reference
          const referenceResult = await client.query(
            'SELECT get_next_coupon_reference($1) as ref',
            [tenantId]
          );
          const couponReference = referenceResult.rows[0].ref;

          // Generate QR code with coupon_points
          const couponPoints = batch.couponPoints || batch.discountAmount; // Default to discount amount if not specified
          const qrData = couponGenerator.generateQRData({ 
            coupon_code: couponCode, 
            tenant_id: tenantId,
            discount_type: 'FIXED_AMOUNT',
            discount_value: batch.discountAmount,
            coupon_points: couponPoints,
            expiry_date: batch.expiryDate
          });
          const qrCodeUrl = await couponGenerator.generateQRCodeImage(couponCode, qrData.url);

          // Create coupon
          const couponResult = await client.query(
            `INSERT INTO coupons 
             (tenant_id, verification_app_id, coupon_code, coupon_reference, discount_type, discount_value,
              discount_currency, expiry_date, total_usage_limit, per_user_usage_limit, qr_code_url,
              description, credit_cost, status, max_scans_per_code, batch_id, batch_quantity,
              product_id, coupon_points)
             VALUES ($1, $2, $3, $4, 'FIXED_AMOUNT', $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, $14, $15, $16, $17)
             RETURNING *`,
            [tenantId, verificationAppId, couponCode, couponReference, batch.discountAmount,
             'USD', batch.expiryDate, 1, 1, qrCodeUrl,
             batch.description, batch.discountAmount, // Each coupon stores its own cost and description
             1, // max_scans_per_code
             batchId,
             i === 0 ? batch.quantity : null, // Only first coupon in batch stores batch quantity
             batch.productId || null, // product_id
             couponPoints] // coupon_points
          );

          allCreatedCoupons.push(couponResult.rows[0]);
        }
      }

      // Deduct credits (once for all coupons)
      const newBalance = currentBalance - totalCost;
      await client.query(
        `UPDATE tenant_credit_balance 
         SET balance = $1,
             total_spent = total_spent + $2,
             last_updated = CURRENT_TIMESTAMP
         WHERE tenant_id = $3`,
        [newBalance, totalCost, tenantId]
      );

      // Create transaction record
      const transactionDesc = `Multi-batch coupon creation: ${allCreatedCoupons.length} coupons across ${batches.length} batches`;
      
      await client.query(
        `INSERT INTO credit_transactions 
         (tenant_id, transaction_type, amount, balance_before, balance_after,
          reference_id, reference_type, description, created_by)
         VALUES ($1, 'DEBIT', $2, $3, $4, $5, 'COUPON_CREATION', $6, $7)`,
        [tenantId, totalCost, currentBalance, newBalance,
         allCreatedCoupons[0].id, transactionDesc, req.user.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: `${allCreatedCoupons.length} coupons created successfully across ${batches.length} batches`,
        coupons: allCreatedCoupons,
        credit_cost: totalCost,
        new_balance: newBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create multi-batch coupons error:', error);
      res.status(500).json({ error: 'Failed to create coupons' });
    } finally {
      client.release();
    }
  }

  /**
   * Get coupons (Tenant)
   * GET /api/coupons
   */
  async getCoupons(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { status, verification_app_id, page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT c.*, va.app_name,
               COUNT(DISTINCT s.id) as total_scans
        FROM coupons c
        LEFT JOIN verification_apps va ON c.verification_app_id = va.id
        LEFT JOIN scans s ON c.id = s.coupon_id
        WHERE c.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;

      if (status) {
        query += ` AND c.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (verification_app_id) {
        query += ` AND c.verification_app_id = $${paramIndex}`;
        params.push(verification_app_id);
        paramIndex++;
      }

      if (search) {
        query += ` AND (c.coupon_code ILIKE $${paramIndex} OR c.coupon_reference ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` GROUP BY c.id, va.app_name ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM coupons c
        WHERE c.tenant_id = $1
      `;
      const countParams = [tenantId];
      let countParamIndex = 2;

      if (status) {
        countQuery += ` AND c.status = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
      }

      if (verification_app_id) {
        countQuery += ` AND c.verification_app_id = $${countParamIndex}`;
        countParams.push(verification_app_id);
        countParamIndex++;
      }

      if (search) {
        countQuery += ` AND (c.coupon_code ILIKE $${countParamIndex} OR c.coupon_reference ILIKE $${countParamIndex} OR c.description ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({ 
        coupons: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: offset + result.rows.length < total
        }
      });

    } catch (error) {
      console.error('Get coupons error:', error);
      res.status(500).json({ error: 'Failed to fetch coupons' });
    }
  }

  /**
   * Get coupon by ID (Tenant)
   * GET /api/coupons/:id
   */
  async getCouponById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `SELECT c.*, va.app_name,
                COUNT(DISTINCT s.id) as total_scans,
                COUNT(DISTINCT CASE WHEN s.scan_status = 'SUCCESS' THEN s.id END) as successful_scans
         FROM coupons c
         LEFT JOIN verification_apps va ON c.verification_app_id = va.id
         LEFT JOIN scans s ON c.id = s.coupon_id
         WHERE c.id = $1 AND c.tenant_id = $2
         GROUP BY c.id, va.app_name`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.json({ coupon: result.rows[0] });

    } catch (error) {
      console.error('Get coupon error:', error);
      res.status(500).json({ error: 'Failed to fetch coupon' });
    }
  }

  /**
   * Update coupon status (Tenant)
   * PATCH /api/coupons/:id/status
   */
  async updateCouponStatus(req, res) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { status } = req.body;
      const tenantId = req.user.tenant_id;

      if (!['active', 'inactive'].includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Status must be active or inactive' 
        });
      }

      // Get current coupon details
      const currentCoupon = await client.query(
        'SELECT * FROM coupons WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (currentCoupon.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Coupon not found' });
      }

      const coupon = currentCoupon.rows[0];

      // Update coupon status
      const result = await client.query(
        `UPDATE coupons 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [status, id, tenantId]
      );

      // If deactivating an active coupon, refund the credits
      if (coupon.status === 'active' && status === 'inactive' && coupon.credit_cost > 0) {
        // Get current balance
        const balanceResult = await client.query(
          'SELECT balance FROM tenant_credit_balance WHERE tenant_id = $1',
          [tenantId]
        );

        const currentBalance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;
        const newBalance = currentBalance + coupon.credit_cost;

        // Update balance with refund
        await client.query(
          `UPDATE tenant_credit_balance 
           SET balance = $1,
               total_spent = total_spent - $2,
               last_updated = CURRENT_TIMESTAMP
           WHERE tenant_id = $3`,
          [newBalance, coupon.credit_cost, tenantId]
        );

        // Record transaction
        await client.query(
          `INSERT INTO credit_transactions 
           (tenant_id, transaction_type, amount, balance_before, balance_after, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            tenantId,
            'CREDIT',
            coupon.credit_cost,
            currentBalance,
            newBalance,
            `Refund for deactivated coupon: ${coupon.coupon_code}`
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        message: status === 'inactive' && coupon.status === 'active' 
          ? `Coupon deactivated and ${coupon.credit_cost} credits refunded`
          : 'Coupon status updated successfully',
        coupon: result.rows[0],
        refunded_credits: status === 'inactive' && coupon.status === 'active' ? coupon.credit_cost : 0
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update coupon status error:', error);
      res.status(500).json({ error: 'Failed to update coupon status' });
    } finally {
      client.release();
    }
  }

  /**
   * Verify coupon scan (Public)
   * POST /api/scans/verify
   */
  async verifyScan(req, res) {
    const client = await db.getClient();
    
    try {
      const { coupon_code, location_lat, location_lng } = req.body;
      const device_info = req.get('user-agent');
      const ip_address = req.ip;

      // Get coupon
      const couponResult = await client.query(
        'SELECT * FROM coupons WHERE coupon_code = $1',
        [coupon_code]
      );

      if (couponResult.rows.length === 0) {
        // Log failed scan
        await client.query(
          `INSERT INTO scans (coupon_id, tenant_id, scan_status, device_info, user_agent, ip_address)
           VALUES (NULL, NULL, 'INVALID', $1, $2, $3)`,
          [device_info, device_info, ip_address]
        );

        return res.status(404).json({ 
          error: 'Invalid Coupon',
          message: 'This coupon code is not valid.'
        });
      }

      const coupon = couponResult.rows[0];
      let scan_status = 'SUCCESS';
      let errorMessage = null;

      // Check lifecycle status first
      if (coupon.status === 'draft') {
        scan_status = 'NOT_ACTIVE';
        errorMessage = 'Coupon has not been activated';
      }
      else if (coupon.status === 'printed') {
        scan_status = 'NOT_PRINTED';
        errorMessage = 'Coupon has not been activated';
      }
      else if (coupon.status === 'used') {
        scan_status = 'USED';
        errorMessage = 'Coupon has already been used';
      }
      else if (coupon.status === 'inactive') {
        scan_status = 'INACTIVE';
        errorMessage = 'Coupon has been deactivated';
      }
      else if (coupon.status === 'expired') {
        scan_status = 'EXPIRED';
        errorMessage = 'Coupon has expired';
      }
      else if (coupon.status === 'exhausted') {
        scan_status = 'EXHAUSTED';
        errorMessage = 'Coupon limit reached';
      }
      // Only proceed with further checks if status is 'active'
      else if (coupon.status === 'active') {
        // CRITICAL FIX: Check max_scans_per_code for single-use/limited-use coupons
        // Verify that coupons haven't exceeded their per-code scan limit
        if (coupon.max_scans_per_code) {
          const scanCountResult = await client.query(
            'SELECT COUNT(*) as scan_count FROM scans WHERE coupon_id = $1 AND scan_status = $2',
            [coupon.id, 'SUCCESS']
          );
          
          const scanCount = parseInt(scanCountResult.rows[0].scan_count);
          
          if (scanCount >= coupon.max_scans_per_code) {
            scan_status = 'USED';
            errorMessage = `This coupon has reached its scan limit (${coupon.max_scans_per_code} scan${coupon.max_scans_per_code > 1 ? 's' : ''})`;
          }
        }
        
        // Check expiry date
        if (scan_status === 'SUCCESS' && new Date(coupon.expiry_date) < new Date()) {
          scan_status = 'EXPIRED';
          errorMessage = 'Coupon Expired';
        }
        // Check if exhausted
        else if (scan_status === 'SUCCESS' && coupon.total_usage_limit && coupon.current_usage_count >= coupon.total_usage_limit) {
          scan_status = 'EXHAUSTED';
          errorMessage = 'Coupon Limit Reached';
        }
      }

      // Log scan
      await client.query(
        `INSERT INTO scans 
         (coupon_id, tenant_id, scan_status, location_lat, location_lng, device_info, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [coupon.id, coupon.tenant_id, scan_status, location_lat, location_lng, 
         device_info, device_info, ip_address]
      );

      // If successful, increment usage count and mark as used
      if (scan_status === 'SUCCESS') {
        // Get current scan count for this coupon
        const scanCountResult = await client.query(
          'SELECT COUNT(*) as scan_count FROM scans WHERE coupon_id = $1 AND scan_status = $2',
          [coupon.id, 'SUCCESS']
        );
        const currentScanCount = parseInt(scanCountResult.rows[0].scan_count);
        
        await client.query(
          `UPDATE coupons 
           SET current_usage_count = current_usage_count + 1,
               status = CASE 
                 WHEN (total_usage_limit IS NOT NULL AND current_usage_count + 1 >= total_usage_limit) 
                   THEN 'exhausted'::VARCHAR
                 WHEN (max_scans_per_code IS NOT NULL AND $2 + 1 >= max_scans_per_code)
                   THEN 'used'::VARCHAR
                 ELSE status
               END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [coupon.id, currentScanCount]
        );

        // Get verification app for custom messages
        const appResult = await client.query(
          'SELECT id AS verification_app_id, app_name, code, description, logo_url, primary_color, secondary_color, welcome_message, scan_success_message, scan_failure_message, post_scan_redirect_url, is_active, tenant_id, created_at, updated_at FROM verification_apps WHERE id = $1',
          [coupon.verification_app_id]
        );

        const successMessage = appResult.rows.length > 0 
          ? appResult.rows[0].scan_success_message 
          : 'Success! Your coupon has been verified.';

        return res.json({
          success: true,
          message: successMessage,
          coupon: {
            code: coupon.coupon_code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            terms: coupon.terms
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: errorMessage,
          message: `Sorry, this coupon is ${scan_status.toLowerCase()}.`
        });
      }

    } catch (error) {
      console.error('Verify scan error:', error);
      res.status(500).json({ error: 'Failed to verify coupon' });
    } finally {
      client.release();
    }
  }

  /**
   * Get scan history (Tenant)
   * GET /api/scans/history
   */
  async getScanHistory(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { page = 1, limit = 20, status, coupon_id } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT s.*, c.coupon_code
        FROM scans s
        LEFT JOIN coupons c ON s.coupon_id = c.id
        WHERE s.tenant_id = $1
      `;
      const params = [tenantId];
      let paramIndex = 2;

      if (status) {
        query += ` AND s.scan_status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (coupon_id) {
        query += ` AND s.coupon_id = $${paramIndex}`;
        params.push(coupon_id);
        paramIndex++;
      }

      query += ` ORDER BY s.scan_timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({ scans: result.rows });

    } catch (error) {
      console.error('Get scan history error:', error);
      res.status(500).json({ error: 'Failed to fetch scan history' });
    }
  }

  /**
   * Get scan analytics (Tenant)
   * GET /api/scans/analytics
   */
  async getScanAnalytics(req, res) {
    try {
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `SELECT 
          COUNT(*) as total_scans,
          COUNT(CASE WHEN scan_status = 'SUCCESS' THEN 1 END) as successful_scans,
          COUNT(CASE WHEN scan_status = 'EXPIRED' THEN 1 END) as expired_scans,
          COUNT(CASE WHEN scan_status = 'EXHAUSTED' THEN 1 END) as exhausted_scans,
          COUNT(CASE WHEN scan_status = 'INVALID' THEN 1 END) as invalid_scans
         FROM scans
         WHERE tenant_id = $1`,
        [tenantId]
      );

      res.json({ analytics: result.rows[0] });

    } catch (error) {
      console.error('Get scan analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch scan analytics' });
    }
  }

  /**
   * Activate coupons by range
   * POST /api/rewards/coupons/activate-range
   */
  async activateCouponRange(req, res) {
    const client = await db.getClient();
    try {
      const tenantId = req.user.tenant_id;
      const { from_reference, to_reference, status_filter = 'printed', activation_note } = req.body;

      // Validation
      if (!from_reference || !to_reference) {
        return res.status(400).json({ error: 'from_reference and to_reference are required' });
      }

      // Validate that from_reference <= to_reference (alphabetically)
      if (from_reference > to_reference) {
        return res.status(400).json({ 
          error: `Invalid range: '${from_reference}' is greater than '${to_reference}' alphabetically. Use sequential references like CP-001 to CP-050.`,
          hint: 'Use POST /api/rewards/coupons/bulk-activate with coupon_ids array for specific coupons'
        });
      }

      await client.query('BEGIN');

      // Find coupons in the alphabetical range between from_reference and to_reference
      const findResult = await client.query(
        `SELECT id, coupon_code, coupon_reference, status 
         FROM coupons
         WHERE tenant_id = $1
           AND coupon_reference >= $2
           AND coupon_reference <= $3
           AND status = $4
         ORDER BY coupon_reference
         LIMIT 1000`,
        [tenantId, from_reference, to_reference, status_filter]
      );

      const coupons = findResult.rows;

      if (coupons.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: `No coupons found with status '${status_filter}' between references ${from_reference} and ${to_reference}`,
          found: 0
        });
      }

      // Activate coupons
      const couponIds = coupons.map(c => c.id);
      const updateResult = await client.query(
        `UPDATE coupons
         SET status = 'active',
             activated_at = CURRENT_TIMESTAMP,
             activation_note = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2)
           AND tenant_id = $3
         RETURNING id, coupon_code, coupon_reference`,
        [activation_note, couponIds, tenantId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        activated_count: updateResult.rowCount,
        skipped_count: coupons.length - updateResult.rowCount,
        message: `${updateResult.rowCount} coupons activated successfully`,
        activated_references: updateResult.rows.map(r => r.coupon_reference),
        activated_codes: updateResult.rows.map(r => r.coupon_code)
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Activate coupon range error:', error);
      res.status(500).json({ error: 'Failed to activate coupon range', details: error.message });
    } finally {
      client.release();
    }
  }

  /**
   * Activate all coupons in a batch
   * POST /api/rewards/coupons/activate-batch
   */
  async activateCouponBatch(req, res) {
    const client = await db.getClient();
    try {
      const tenantId = req.user.tenant_id;
      const { batch_id, activation_note } = req.body;

      if (!batch_id) {
        return res.status(400).json({ error: 'batch_id is required' });
      }

      await client.query('BEGIN');

      // Find all printed coupons in the batch
      const findResult = await client.query(
        `SELECT id, coupon_code, status
         FROM coupons
         WHERE tenant_id = $1
           AND batch_id = $2
           AND status = 'printed'`,
        [tenantId, batch_id]
      );

      if (findResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'No printed coupons found in this batch'
        });
      }

      // Activate all printed coupons
      const couponIds = findResult.rows.map(c => c.id);
      const updateResult = await client.query(
        `UPDATE coupons
         SET status = 'active',
             activated_at = CURRENT_TIMESTAMP,
             activation_note = COALESCE($1, 'Batch activation - ' || $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($3)
           AND tenant_id = $4
         RETURNING id, coupon_code`,
        [activation_note, batch_id, couponIds, tenantId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        batch_id,
        activated_count: updateResult.rowCount,
        message: `${updateResult.rowCount} coupons activated in batch`,
        activated_codes: updateResult.rows.map(r => r.coupon_code)
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Activate batch error:', error);
      res.status(500).json({ error: 'Failed to activate batch', details: error.message });
    } finally {
      client.release();
    }
  }

  /**
   * Mark coupon(s) as printed
   * PATCH /api/rewards/coupons/:id/print
   */
  async markCouponAsPrinted(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `UPDATE coupons
         SET status = CASE 
                        WHEN status = 'draft' THEN 'printed'::VARCHAR
                        ELSE status 
                      END,
             printed_at = CURRENT_TIMESTAMP,
             printed_count = COALESCE(printed_count, 0) + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, coupon_code, status, printed_at, printed_count`,
        [id, tenantId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.json({
        success: true,
        coupon: result.rows[0],
        message: 'Coupon marked as printed'
      });

    } catch (error) {
      console.error('Mark as printed error:', error);
      res.status(500).json({ error: 'Failed to mark coupon as printed' });
    }
  }

  /**
   * Bulk mark coupons as printed
   * POST /api/rewards/coupons/bulk-print
   */
  async bulkMarkAsPrinted(req, res) {
    const client = await db.getClient();
    try {
      const tenantId = req.user.tenant_id;
      const { coupon_ids } = req.body;

      if (!coupon_ids || !Array.isArray(coupon_ids) || coupon_ids.length === 0) {
        return res.status(400).json({ error: 'coupon_ids array is required' });
      }

      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE coupons
         SET status = CASE 
                        WHEN status = 'draft' THEN 'printed'::VARCHAR
                        ELSE status 
                      END,
             printed_at = CURRENT_TIMESTAMP,
             printed_count = COALESCE(printed_count, 0) + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1) AND tenant_id = $2
         RETURNING id, coupon_code, status, printed_count`,
        [coupon_ids, tenantId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        printed_count: result.rowCount,
        message: `${result.rowCount} coupons marked as printed`,
        coupons: result.rows
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Bulk print error:', error);
      res.status(500).json({ error: 'Failed to mark coupons as printed' });
    } finally {
      client.release();
    }
  }

  /**
   * Bulk activate selected coupons
   * POST /api/rewards/coupons/bulk-activate
   */
  async bulkActivateCoupons(req, res) {
    const client = await db.getClient();
    try {
      const tenantId = req.user.tenant_id;
      const { coupon_ids, activation_note } = req.body;

      if (!coupon_ids || !Array.isArray(coupon_ids) || coupon_ids.length === 0) {
        return res.status(400).json({ error: 'coupon_ids array is required' });
      }

      await client.query('BEGIN');

      // Find coupons that can be activated (status: printed or draft)
      const findResult = await client.query(
        `SELECT id, coupon_code, status
         FROM coupons
         WHERE id = ANY($1)
           AND tenant_id = $2
           AND status IN ('draft', 'printed')`,
        [coupon_ids, tenantId]
      );

      if (findResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'No coupons found with draft or printed status',
          found: 0
        });
      }

      // Activate the coupons
      const activateIds = findResult.rows.map(c => c.id);
      const result = await client.query(
        `UPDATE coupons
         SET status = 'active',
             activated_at = CURRENT_TIMESTAMP,
             activation_note = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2) AND tenant_id = $3
         RETURNING id, coupon_code, status`,
        [activation_note || 'Bulk activation from selection', activateIds, tenantId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        activated_count: result.rowCount,
        requested_count: coupon_ids.length,
        message: `${result.rowCount} coupons activated`,
        coupons: result.rows
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Bulk activate error:', error);
      res.status(500).json({ error: 'Failed to activate coupons', details: error.message });
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate coupons by range
   * POST /api/rewards/coupons/deactivate-range
   */
  async deactivateCouponRange(req, res) {
    const client = await db.getClient();
    try {
      const tenantId = req.user.tenant_id;
      const { from_reference, to_reference, deactivation_reason } = req.body;

      if (!from_reference || !to_reference || !deactivation_reason) {
        return res.status(400).json({ 
          error: 'from_reference, to_reference, and deactivation_reason are required' 
        });
      }

      // Validate that from_reference <= to_reference (alphabetically)
      if (from_reference > to_reference) {
        return res.status(400).json({ 
          error: `Invalid range: '${from_reference}' is greater than '${to_reference}' alphabetically. Use sequential references like CP-001 to CP-050.`,
          hint: 'For specific coupons, select and deactivate them individually'
        });
      }

      await client.query('BEGIN');

      // Deactivate coupons in alphabetical range using coupon_reference
      const result = await client.query(
        `UPDATE coupons
         SET status = 'inactive',
             deactivation_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $2
           AND coupon_reference >= $3
           AND coupon_reference <= $4
           AND status NOT IN ('used', 'expired', 'exhausted')
         RETURNING id, coupon_code, coupon_reference`,
        [deactivation_reason, tenantId, from_reference, to_reference]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        deactivated_count: result.rowCount,
        message: `${result.rowCount} coupons deactivated`,
        deactivated_references: result.rows.map(r => r.coupon_reference),
        deactivated_codes: result.rows.map(r => r.coupon_code)
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Deactivate range error:', error);
      res.status(500).json({ error: 'Failed to deactivate coupon range' });
    } finally {
      client.release();
    }
  }

  /**
   * Regenerate API key for verification app (Tenant)
   * POST /api/verification-apps/:id/regenerate-key
   */
  async regenerateApiKey(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;
      const crypto = require('crypto');

      // Generate new API key
      const newApiKey = crypto.randomBytes(32).toString('hex');

      const result = await db.query(
        `UPDATE verification_apps 
         SET api_key = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3
         RETURNING id, app_name, code, api_key, created_at`,
        [newApiKey, id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Verification app not found' });
      }

      res.json({
        message: 'API key regenerated successfully',
        app: result.rows[0],
        warning: 'The old API key is now invalid. Update your external applications with the new key.'
      });

    } catch (error) {
      console.error('Regenerate API key error:', error);
      res.status(500).json({ error: 'Failed to regenerate API key' });
    }
  }

  /**
   * Delete verification app (Tenant)
   * DELETE /api/verification-apps/:id
   */
  async deleteVerificationApp(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      // First, check if app exists and get stats
      const appCheck = await db.query(
        `SELECT va.id AS verification_app_id,
                va.app_name,
                va.code,
                va.description,
                va.logo_url,
                va.primary_color,
                va.secondary_color,
                va.welcome_message,
                va.scan_success_message,
                va.scan_failure_message,
                va.post_scan_redirect_url,
                va.is_active,
                va.tenant_id,
                va.created_at,
                va.updated_at,
                COUNT(DISTINCT c.id) as total_coupons,
                COUNT(DISTINCT p.id) as total_products
         FROM verification_apps va
         LEFT JOIN coupons c ON va.id = c.verification_app_id
         LEFT JOIN products p ON va.id = p.verification_app_id
         WHERE va.id = $1 AND va.tenant_id = $2
         GROUP BY va.id, va.app_name, va.code, va.description, va.logo_url, va.primary_color, va.secondary_color, va.welcome_message, va.scan_success_message, va.scan_failure_message, va.post_scan_redirect_url, va.is_active, va.tenant_id, va.created_at, va.updated_at`,
        [id, tenantId]
      );

      if (appCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Verification app not found' });
      }

      const app = appCheck.rows[0];

      // Delete the app (cascade will handle related data)
      await db.query(
        `DELETE FROM verification_apps WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      res.json({
        message: 'Verification app deleted successfully',
        deleted_data: {
          app_name: app.app_name,
          coupons_deleted: parseInt(app.total_coupons),
          products_deleted: parseInt(app.total_products)
        }
      });

    } catch (error) {
      console.error('Delete verification app error:', error);
      res.status(500).json({ error: 'Failed to delete verification app' });
    }
  }

  /**
   * Toggle verification app status (Tenant)
   * PATCH /api/verification-apps/:id/toggle-status
   */
  async toggleAppStatus(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const result = await db.query(
        `UPDATE verification_apps
         SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, app_name, is_active`,
        [id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Verification app not found' });
      }

      const app = result.rows[0];
      res.json({
        message: `Verification app ${app.is_active ? 'activated' : 'deactivated'} successfully`,
        app
      });

    } catch (error) {
      console.error('Toggle app status error:', error);
      res.status(500).json({ error: 'Failed to toggle app status' });
    }
  }

  /**
   * Mark batch as printed
   * POST /api/rewards/coupons/batch/:batch_id/print
   */
  async batchPrint(req, res) {
    try {
      const { batch_id } = req.params;
      const { print_note } = req.body;
      const tenantId = req.user.tenant_id;

      // Verify batch belongs to tenant
      const batchCheck = await db.query(
        `SELECT COUNT(*) as count FROM coupons
         WHERE batch_id = $1 AND tenant_id = $2`,
        [batch_id, tenantId]
      );

      if (parseInt(batchCheck.rows[0].count) === 0) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      // Update all coupons in batch to printed status
      const result = await db.query(
        `UPDATE coupons
         SET status = 'printed',
             printed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = $1 AND tenant_id = $2 AND status = 'draft'
         RETURNING coupon_code`,
        [batch_id, tenantId]
      );

      res.json({
        success: true,
        batch_id,
        printed_count: result.rows.length,
        message: `${result.rows.length} coupons marked as printed`,
        print_note: print_note || null
      });

    } catch (error) {
      console.error('Batch print error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark batch as printed'
      });
    }
  }

  /**
   * Activate entire batch
   * POST /api/rewards/coupons/batch/:batch_id/activate
   */
  async batchActivate(req, res) {
    try {
      const { batch_id } = req.params;
      const { activation_note } = req.body;
      const tenantId = req.user.tenant_id;

      // Verify batch belongs to tenant and get count
      const batchCheck = await db.query(
        `SELECT COUNT(*) as count FROM coupons
         WHERE batch_id = $1 AND tenant_id = $2`,
        [batch_id, tenantId]
      );

      if (parseInt(batchCheck.rows[0].count) === 0) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      // Check if any coupons are in draft status (not printed)
      const draftCheck = await db.query(
        `SELECT COUNT(*) as count FROM coupons
         WHERE batch_id = $1 AND tenant_id = $2 AND status = 'draft'`,
        [batch_id, tenantId]
      );

      if (parseInt(draftCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot activate batch with unprinted coupons. Please mark batch as printed first.'
        });
      }

      // Activate all coupons in batch
      const result = await db.query(
        `UPDATE coupons
         SET status = 'active',
             activation_note = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = $1 AND tenant_id = $2 AND status = 'printed'
         RETURNING coupon_code`,
        [batch_id, tenantId, activation_note || null]
      );

      const activatedCodes = result.rows.map(r => r.coupon_code);

      res.json({
        success: true,
        batch_id,
        activated_count: result.rows.length,
        message: `${result.rows.length} coupons activated successfully`,
        activated_codes: activatedCodes,
        activation_note: activation_note || null
      });

    } catch (error) {
      console.error('Batch activate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to activate batch'
      });
    }
  }

  /**
   * Deactivate entire batch
   * POST /api/rewards/coupons/batch/:batch_id/deactivate
   */
  async batchDeactivate(req, res) {
    try {
      const { batch_id } = req.params;
      const { deactivation_reason } = req.body;
      const tenantId = req.user.tenant_id;

      // Deactivate all active coupons in batch
      const result = await db.query(
        `UPDATE coupons
         SET status = 'inactive',
             deactivation_reason = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = $1 AND tenant_id = $2 AND status = 'active'
         RETURNING coupon_code`,
        [batch_id, tenantId, deactivation_reason || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active coupons found in batch'
        });
      }

      res.json({
        success: true,
        batch_id,
        deactivated_count: result.rows.length,
        message: `${result.rows.length} coupons deactivated`,
        deactivation_reason: deactivation_reason || null
      });

    } catch (error) {
      console.error('Batch deactivate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate batch'
      });
    }
  }

  /**
   * Get batch statistics
   * GET /api/rewards/coupons/batch/:batch_id/stats
   */
  async batchStats(req, res) {
    try {
      const { batch_id } = req.params;
      const tenantId = req.user.tenant_id;

      // Get batch statistics
      const stats = await db.query(
        `SELECT
           batch_id,
           COUNT(*)::int as total_coupons,
           COUNT(*) FILTER (WHERE status = 'draft')::int as draft_count,
           COUNT(*) FILTER (WHERE status = 'printed')::int as printed_count,
           COUNT(*) FILTER (WHERE status = 'active')::int as active_count,
           COUNT(*) FILTER (WHERE status = 'used')::int as used_count,
           COUNT(*) FILTER (WHERE status = 'inactive')::int as inactive_count,
           COUNT(*) FILTER (WHERE status = 'expired')::int as expired_count,
           MIN(created_at) as created_at,
           MAX(updated_at) as last_updated
         FROM coupons
         WHERE batch_id = $1 AND tenant_id = $2
         GROUP BY batch_id`,
        [batch_id, tenantId]
      );

      if (stats.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      const row = stats.rows[0];
      res.json({
        success: true,
        batch_id: row.batch_id,
        total_coupons: row.total_coupons,
        status_counts: {
          draft: row.draft_count,
          printed: row.printed_count,
          active: row.active_count,
          used: row.used_count,
          inactive: row.inactive_count,
          expired: row.expired_count
        },
        created_at: row.created_at,
        last_updated: row.last_updated
      });

    } catch (error) {
      console.error('Batch stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get batch statistics'
      });
    }
  }
}

module.exports = new RewardsController();
