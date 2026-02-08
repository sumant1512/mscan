/**
 * Tenant Users Controller
 * Handles HTTP requests for tenant user management
 */

const tenantUserService = require('../services/tenantUser.service');
const permissionService = require('../services/permission.service');
const emailService = require('../services/email.service');

/**
 * Create a tenant user with permissions
 * POST /api/v1/tenants/:tenantId/users
 */
const createTenantUser = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { email, full_name, phone, role, permission_ids, send_welcome_email } = req.body;

    // Validate required fields
    if (!email || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, full_name, role'
      });
    }

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create users in other tenants'
      });
    }

    const result = await tenantUserService.createUser(
      tenantId,
      { email, full_name, phone, role },
      permission_ids || [],
      req.user.id,
      req.user.role,
      req
    );

    // Send welcome email if requested (especially for Tenant Admins)
    let welcomeEmailSent = false;
    if (send_welcome_email === true && result.user) {
      try {
        await emailService.sendTenantAdminWelcomeEmail(
          result.user.email,
          result.user.full_name,
          result.tenant
        );
        welcomeEmailSent = true;
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request, just log the error
      }
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...result,
        welcome_email_sent: welcomeEmailSent
      },
      warnings: welcomeEmailSent ? undefined : (send_welcome_email ? [{
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'User created but welcome email could not be sent'
      }] : undefined)
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'USER_EXISTS'
      });
    }

    if (error.message.includes('Unauthorized permission')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: 'UNAUTHORIZED_PERMISSION_ASSIGNMENT'
      });
    }

    if (error.message.includes('Role must be')) {
      return res.status(422).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

/**
 * List users in a tenant
 * GET /api/v1/tenants/:tenantId/users
 */
const listTenantUsers = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { role, search, page = 1, limit = 50 } = req.query;

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot access users from other tenants'
      });
    }

    const result = await tenantUserService.listUsers(tenantId, {
      role,
      search,
      include_permissions: true,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    });

    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: result.pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user details with permissions
 * GET /api/v1/tenants/:tenantId/users/:userId
 */
const getTenantUser = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot access users from other tenants'
      });
    }

    const user = await tenantUserService.getUserWithPermissions(userId, tenantId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a tenant user (soft delete)
 * DELETE /api/v1/tenants/:tenantId/users/:userId
 */
const deleteTenantUser = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete users from other tenants'
      });
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await tenantUserService.deleteUser(userId, tenantId, req.user.id, req);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { user }
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already deleted')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

/**
 * Get effective permissions for a user
 * GET /api/v1/tenants/:tenantId/users/:userId/permissions
 */
const getUserPermissions = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot access users from other tenants'
      });
    }

    const permissions = await tenantUserService.getEffectivePermissions(userId, tenantId);

    // Get full permission details
    const permissionDetails = await Promise.all(
      permissions.map(code => permissionService.getPermissionByCode(code))
    );

    res.json({
      success: true,
      data: {
        user_id: userId,
        tenant_id: tenantId,
        permissions: permissionDetails.filter(p => p !== null)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign permissions to a user
 * POST /api/v1/tenants/:tenantId/users/:userId/permissions
 */
const assignUserPermissions = async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;
    const { permission_ids } = req.body;

    if (!permission_ids || !Array.isArray(permission_ids) || permission_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'permission_ids array is required'
      });
    }

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot assign permissions to users in other tenants'
      });
    }

    const assignments = await tenantUserService.assignPermissionsToUser(
      userId,
      tenantId,
      permission_ids,
      req.user.id,
      req.user.role,
      req
    );

    res.status(201).json({
      success: true,
      message: `${assignments.length} permission(s) assigned successfully`,
      data: {
        assignments
      }
    });
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: 'UNAUTHORIZED_PERMISSION_ASSIGNMENT'
      });
    }

    next(error);
  }
};

/**
 * Assign tenant-level permissions
 * POST /api/v1/tenants/:tenantId/permissions
 */
const assignTenantPermissions = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { permission_ids } = req.body;

    if (!permission_ids || !Array.isArray(permission_ids) || permission_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'permission_ids array is required'
      });
    }

    // Validate tenant access
    if (req.user.role !== 'SUPER_ADMIN' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot assign permissions to other tenants'
      });
    }

    const assignments = await tenantUserService.assignPermissionsToTenant(
      tenantId,
      permission_ids,
      req.user.id,
      req
    );

    res.status(201).json({
      success: true,
      message: `${assignments.length} tenant-level permission(s) assigned successfully`,
      data: {
        assignments
      }
    });
  } catch (error) {
    if (error.message.includes('TENANT scope')) {
      return res.status(422).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

module.exports = {
  createTenantUser,
  listTenantUsers,
  getTenantUser,
  deleteTenantUser,
  getUserPermissions,
  assignUserPermissions,
  assignTenantPermissions
};
