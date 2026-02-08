/**
 * API Configuration Controller
 *
 * Handles API key management and configuration for verification apps
 * Supports Mobile App API v2 and E-commerce API
 */

const db = require('../config/database');
const crypto = require('crypto');

/**
 * Generate a secure API key
 */
function generateApiKey(prefix = 'sk') {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

/**
 * Hash API key for storage (SHA-256)
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * GET /api/verification-apps/:id/api-config
 * Get API configuration for a verification app
 */
exports.getApiConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const result = await db.query(`
      SELECT
        id,
        app_name,
        code as app_code,
        template_id,
        mobile_api_enabled,
        ecommerce_api_enabled,
        mobile_api_key,
        ecommerce_api_key,
        api_rate_limits,
        api_field_mappings
      FROM verification_apps
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    const config = result.rows[0];

    // Don't send full API keys in response (security)
    if (config.mobile_api_key) {
      config.mobile_api_key_preview = `${config.mobile_api_key.substring(0, 12)}...`;
      delete config.mobile_api_key;
    }

    if (config.ecommerce_api_key) {
      config.ecommerce_api_key_preview = `${config.ecommerce_api_key.substring(0, 12)}...`;
      delete config.ecommerce_api_key;
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching API config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API configuration',
      error: error.message
    });
  }
};

/**
 * PUT /api/verification-apps/:id/api-config
 * Update API configuration (enable/disable APIs, rate limits, field mappings)
 */
exports.updateApiConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const {
      mobile_api_enabled,
      ecommerce_api_enabled,
      template_id,
      api_rate_limits,
      api_field_mappings
    } = req.body;

    // Check if app exists
    const appCheck = await db.query(
      'SELECT id FROM verification_apps WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (mobile_api_enabled !== undefined) {
      updates.push(`mobile_api_enabled = $${paramIndex}`);
      params.push(mobile_api_enabled);
      paramIndex++;
    }

    if (ecommerce_api_enabled !== undefined) {
      updates.push(`ecommerce_api_enabled = $${paramIndex}`);
      params.push(ecommerce_api_enabled);
      paramIndex++;
    }

    if (template_id !== undefined) {
      updates.push(`template_id = $${paramIndex}`);
      params.push(template_id || null);
      paramIndex++;
    }

    if (api_rate_limits) {
      updates.push(`api_rate_limits = $${paramIndex}`);
      params.push(JSON.stringify(api_rate_limits));
      paramIndex++;
    }

    if (api_field_mappings) {
      updates.push(`api_field_mappings = $${paramIndex}`);
      params.push(JSON.stringify(api_field_mappings));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update fields provided'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id, tenantId);

    const query = `
      UPDATE verification_apps
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      message: 'API configuration updated successfully',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating API config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API configuration',
      error: error.message
    });
  }
};

/**
 * POST /api/verification-apps/:id/regenerate-mobile-key
 * Regenerate Mobile API key
 */
exports.regenerateMobileKey = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Check if app exists
    const appCheck = await db.query(
      'SELECT id, app_name FROM verification_apps WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    // Generate new API key
    const newApiKey = generateApiKey('mobile');

    // Update database
    const result = await db.query(`
      UPDATE verification_apps
      SET mobile_api_key = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, app_name, mobile_api_enabled
    `, [newApiKey, id, tenantId]);

    res.json({
      success: true,
      message: 'Mobile API key regenerated successfully',
      api_key: newApiKey,
      warning: 'This is the only time you will see the full API key. Please save it securely.',
      app: result.rows[0]
    });
  } catch (error) {
    console.error('Error regenerating mobile API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate mobile API key',
      error: error.message
    });
  }
};

/**
 * POST /api/verification-apps/:id/regenerate-ecommerce-key
 * Regenerate E-commerce API key
 */
exports.regenerateEcommerceKey = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Check if app exists
    const appCheck = await db.query(
      'SELECT id, app_name FROM verification_apps WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    // Generate new API key
    const newApiKey = generateApiKey('ecommerce');

    // Update database
    const result = await db.query(`
      UPDATE verification_apps
      SET ecommerce_api_key = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, app_name, ecommerce_api_enabled
    `, [newApiKey, id, tenantId]);

    res.json({
      success: true,
      message: 'E-commerce API key regenerated successfully',
      api_key: newApiKey,
      warning: 'This is the only time you will see the full API key. Please save it securely.',
      app: result.rows[0]
    });
  } catch (error) {
    console.error('Error regenerating e-commerce API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate e-commerce API key',
      error: error.message
    });
  }
};

/**
 * POST /api/verification-apps/:id/enable-mobile-api
 * Enable Mobile API and generate initial key
 */
exports.enableMobileApi = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Check if app exists
    const appCheck = await db.query(
      'SELECT id, app_name, mobile_api_enabled, mobile_api_key FROM verification_apps WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    if (appCheck.rows[0].mobile_api_enabled && appCheck.rows[0].mobile_api_key) {
      return res.status(400).json({
        success: false,
        message: 'Mobile API is already enabled for this app'
      });
    }

    // Generate new API key
    const newApiKey = generateApiKey('mobile');

    // Enable and set key
    const result = await db.query(`
      UPDATE verification_apps
      SET mobile_api_enabled = true,
          mobile_api_key = $1,
          api_rate_limits = COALESCE(api_rate_limits, '{"mobile_rpm": 60, "ecommerce_rpm": 120}'::jsonb),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, app_name, mobile_api_enabled
    `, [newApiKey, id, tenantId]);

    res.json({
      success: true,
      message: 'Mobile API enabled successfully',
      api_key: newApiKey,
      warning: 'This is the only time you will see the full API key. Please save it securely.',
      app: result.rows[0]
    });
  } catch (error) {
    console.error('Error enabling mobile API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable mobile API',
      error: error.message
    });
  }
};

/**
 * POST /api/verification-apps/:id/enable-ecommerce-api
 * Enable E-commerce API and generate initial key
 */
exports.enableEcommerceApi = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Check if app exists
    const appCheck = await db.query(
      'SELECT id, app_name, ecommerce_api_enabled, ecommerce_api_key FROM verification_apps WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    if (appCheck.rows[0].ecommerce_api_enabled && appCheck.rows[0].ecommerce_api_key) {
      return res.status(400).json({
        success: false,
        message: 'E-commerce API is already enabled for this app'
      });
    }

    // Generate new API key
    const newApiKey = generateApiKey('ecommerce');

    // Enable and set key
    const result = await db.query(`
      UPDATE verification_apps
      SET ecommerce_api_enabled = true,
          ecommerce_api_key = $1,
          api_rate_limits = COALESCE(api_rate_limits, '{"mobile_rpm": 60, "ecommerce_rpm": 120}'::jsonb),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, app_name, ecommerce_api_enabled
    `, [newApiKey, id, tenantId]);

    res.json({
      success: true,
      message: 'E-commerce API enabled successfully',
      api_key: newApiKey,
      warning: 'This is the only time you will see the full API key. Please save it securely.',
      app: result.rows[0]
    });
  } catch (error) {
    console.error('Error enabling e-commerce API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable e-commerce API',
      error: error.message
    });
  }
};

/**
 * GET /api/verification-apps/:id/api-usage
 * Get API usage statistics
 */
exports.getApiUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { days = 7, api_type } = req.query;

    // Check if app exists
    const appCheck = await db.query(
      'SELECT id FROM verification_apps WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification app not found'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    let query = `
      SELECT
        api_type,
        COUNT(*) as total_requests,
        AVG(response_time_ms)::INTEGER as avg_response_time_ms,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
        DATE(request_timestamp) as date
      FROM api_usage_logs
      WHERE verification_app_id = $1
        AND request_timestamp >= $2
    `;

    const params = [id, cutoffDate];

    if (api_type) {
      query += ` AND api_type = $3`;
      params.push(api_type);
    }

    query += `
      GROUP BY api_type, DATE(request_timestamp)
      ORDER BY date DESC, api_type
    `;

    const result = await db.query(query, params);

    // Get totals
    let totalsQuery = `
      SELECT
        api_type,
        COUNT(*) as total_requests
      FROM api_usage_logs
      WHERE verification_app_id = $1
        AND request_timestamp >= $2
    `;

    const totalsParams = [id, cutoffDate];

    if (api_type) {
      totalsQuery += ` AND api_type = $3`;
      totalsParams.push(api_type);
    }

    totalsQuery += ` GROUP BY api_type`;

    const totalsResult = await db.query(totalsQuery, totalsParams);

    res.json({
      success: true,
      usage: {
        daily: result.rows,
        totals: totalsResult.rows,
        period_days: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Error fetching API usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API usage',
      error: error.message
    });
  }
};
