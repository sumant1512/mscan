/**
 * Feature Service
 * Handles feature flag definition, tenant assignment, and validation
 */

const db = require('../config/database');
const auditService = require('./audit.service');

/**
 * Create a new feature definition
 * @param {Object} data - Feature data
 * @param {string} data.code - Unique feature code (e.g., 'advanced-reporting')
 * @param {string} data.name - Human-readable name
 * @param {string} data.description - Description of what feature does
 * @param {boolean} data.default_enabled - Whether new tenants get this by default
 * @param {string} actorId - ID of user creating the feature
 * @param {Object} req - Express request object for audit logging
 * @returns {Promise<Object>} Created feature
 */
async function createFeature(data, actorId, req = null) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Validate feature code format (kebab-case or snake_case)
    const codeRegex = /^[a-z][a-z0-9_-]*$/;
    if (!codeRegex.test(data.code)) {
      throw new Error('Feature code must be lowercase alphanumeric with hyphens or underscores');
    }

    // Validate code length
    if (data.code.length < 3 || data.code.length > 100) {
      throw new Error('Feature code must be between 3 and 100 characters');
    }

    // Check for duplicate code
    const duplicateCheck = await client.query(
      'SELECT id FROM features WHERE code = $1',
      [data.code]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error(`Feature with code '${data.code}' already exists`);
    }

    // Insert feature
    const result = await client.query(
      `INSERT INTO features (code, name, description, default_enabled, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.code, data.name, data.description || null, data.default_enabled || false, actorId]
    );

    const feature = result.rows[0];

    // Log audit entry
    if (req) {
      await auditService.logFeatureCreation(feature.id, actorId, {
        feature_code: feature.code,
        feature_name: feature.name
      }, req, client);
    }

    await client.query('COMMIT');

    return feature;
  } catch (error) {
    await client.query('ROLLBACK');

    // Log failed attempt if req provided
    if (req && actorId) {
      try {
        await auditService.logFailedOperation('CREATE_FEATURE_FAILED', actorId, {
          attempted_code: data.code,
          error: error.message
        }, req);
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all features
 * @returns {Promise<Array>} List of features
 */
async function getFeatures() {
  const result = await db.query(
    'SELECT * FROM features ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Get feature by ID
 * @param {string} id - Feature ID
 * @returns {Promise<Object|null>} Feature or null if not found
 */
async function getFeatureById(id) {
  const result = await db.query(
    'SELECT * FROM features WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get feature by code
 * @param {string} code - Feature code
 * @returns {Promise<Object|null>} Feature or null if not found
 */
async function getFeatureByCode(code) {
  const result = await db.query(
    'SELECT * FROM features WHERE code = $1',
    [code]
  );
  return result.rows[0] || null;
}

/**
 * Update feature
 * @param {string} id - Feature ID
 * @param {Object} data - Update data
 * @param {string} actorId - User making the change
 * @param {Object} req - Express request
 * @returns {Promise<Object>} Updated feature
 */
async function updateFeature(id, data, actorId, req = null) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Get current feature
    const current = await client.query(
      'SELECT * FROM features WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      throw new Error('Feature not found');
    }

    const oldFeature = current.rows[0];

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (data.default_enabled !== undefined) {
      updates.push(`default_enabled = $${paramIndex++}`);
      values.push(data.default_enabled);
    }

    if (updates.length === 0) {
      return oldFeature;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.query(
      `UPDATE features SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const updatedFeature = result.rows[0];

    // Log audit entry
    if (req) {
      await auditService.logFeatureUpdate(updatedFeature.id, actorId, {
        feature_code: updatedFeature.code,
        changes: data
      }, req, client);
    }

    await client.query('COMMIT');

    return updatedFeature;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete feature
 * @param {string} id - Feature ID
 * @param {string} actorId - User making the change
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function deleteFeature(id, actorId, req = null) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Get feature for audit
    const feature = await client.query(
      'SELECT * FROM features WHERE id = $1',
      [id]
    );

    if (feature.rows.length === 0) {
      throw new Error('Feature not found');
    }

    // Delete tenant feature assignments first
    await client.query(
      'DELETE FROM tenant_features WHERE feature_id = $1',
      [id]
    );

    // Delete feature
    await client.query(
      'DELETE FROM features WHERE id = $1',
      [id]
    );

    // Log audit entry
    if (req) {
      await auditService.logFeatureDeletion(id, actorId, {
        feature_code: feature.rows[0].code,
        feature_name: feature.rows[0].name
      }, req, client);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Enable feature for tenant
 * @param {string} featureId - Feature ID
 * @param {string} tenantId - Tenant ID
 * @param {string} actorId - User enabling the feature
 * @param {Object} req - Express request
 * @returns {Promise<Object>} Tenant feature record
 */
async function enableFeatureForTenant(featureId, tenantId, actorId, req = null) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Verify feature exists
    const feature = await client.query(
      'SELECT * FROM features WHERE id = $1 AND is_active = true',
      [featureId]
    );

    if (feature.rows.length === 0) {
      throw new Error('Feature not found or inactive');
    }

    // Upsert tenant feature
    const result = await client.query(
      `INSERT INTO tenant_features (tenant_id, feature_id, enabled, enabled_by)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (tenant_id, feature_id)
       DO UPDATE SET
         enabled = true,
         enabled_at = CURRENT_TIMESTAMP,
         enabled_by = $3
       RETURNING *`,
      [tenantId, featureId, actorId]
    );

    const tenantFeature = result.rows[0];

    // Log audit entry
    if (req) {
      await auditService.logFeatureEnable(tenantFeature.id, actorId, {
        feature_code: feature.rows[0].code,
        tenant_id: tenantId
      }, req, client);
    }

    await client.query('COMMIT');

    return tenantFeature;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Disable feature for tenant
 * @param {string} featureId - Feature ID
 * @param {string} tenantId - Tenant ID
 * @param {string} actorId - User disabling the feature
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function disableFeatureForTenant(featureId, tenantId, actorId, req = null) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Get feature for audit
    const feature = await client.query(
      'SELECT * FROM features WHERE id = $1',
      [featureId]
    );

    if (feature.rows.length === 0) {
      throw new Error('Feature not found');
    }

    // Delete or disable tenant feature
    const result = await client.query(
      `UPDATE tenant_features
       SET enabled = false, enabled_at = CURRENT_TIMESTAMP, enabled_by = $3
       WHERE tenant_id = $1 AND feature_id = $2`,
      [tenantId, featureId, actorId]
    );

    // Log audit entry
    if (req) {
      await auditService.logFeatureDisable(featureId, actorId, {
        feature_code: feature.rows[0].code,
        tenant_id: tenantId
      }, req, client);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if feature is enabled for tenant
 * @param {string} featureCode - Feature code
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Whether feature is enabled
 */
async function isFeatureEnabledForTenant(featureCode, tenantId) {
  const result = await db.query(
    'SELECT is_feature_enabled_for_tenant($1, $2) as enabled',
    [featureCode, tenantId]
  );
  return result.rows[0].enabled;
}

/**
 * Get all features for a tenant with their enabled status
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} List of features with tenant status
 */
async function getTenantFeatures(tenantId) {
  const result = await db.query(
    `SELECT
       f.*,
       COALESCE(tf.enabled, f.default_enabled) as enabled_for_tenant,
       tf.enabled_at,
       tf.enabled_by
     FROM features f
     LEFT JOIN tenant_features tf ON f.id = tf.feature_id AND tf.tenant_id = $1
     WHERE f.is_active = true
     ORDER BY f.created_at DESC`,
    [tenantId]
  );
  return result.rows;
}

module.exports = {
  createFeature,
  getFeatures,
  getFeatureById,
  getFeatureByCode,
  updateFeature,
  deleteFeature,
  enableFeatureForTenant,
  disableFeatureForTenant,
  isFeatureEnabledForTenant,
  getTenantFeatures
};