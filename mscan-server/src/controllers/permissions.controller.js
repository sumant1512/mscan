/**
 * Permissions Controller
 * Handles HTTP requests for permission management
 */

const permissionService = require('../services/permission.service');

/**
 * Create a new permission definition
 * POST /api/v1/permissions
 * Requires: SUPER_ADMIN role
 */
const createPermission = async (req, res, next) => {
  try {
    const { code, name, description, scope, allowed_assigners } = req.body;

    // Validate required fields
    if (!code || !name || !scope) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, name, scope'
      });
    }

    const permission = await permissionService.createPermission(
      { code, name, description, scope, allowed_assigners },
      req.user.id,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: {
        permission
      }
    });
  } catch (error) {
    // Handle specific errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'PERMISSION_EXISTS',
        field: 'code'
      });
    }

    if (error.message.includes('format') || error.message.includes('length') || error.message.includes('Scope')) {
      return res.status(422).json({
        success: false,
        message: error.message,
        code: 'INVALID_PERMISSION_DATA'
      });
    }

    next(error);
  }
};

/**
 * List permissions with filtering
 * GET /api/v1/permissions
 */
const listPermissions = async (req, res, next) => {
  try {
    const {
      scope,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // For TENANT_ADMIN, only show permissions they can assign
    const filters = {
      scope,
      search,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100) // Max 100 per page
    };

    if (req.user.role === 'TENANT_ADMIN') {
      filters.assignable_by = 'TENANT_ADMIN';
    }

    const result = await permissionService.listPermissions(filters);

    res.json({
      success: true,
      data: {
        permissions: result.permissions,
        pagination: result.pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permission by code
 * GET /api/v1/permissions/:code
 */
const getPermission = async (req, res, next) => {
  try {
    const { code } = req.params;

    const permission = await permissionService.getPermissionByCode(code);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    res.json({
      success: true,
      data: {
        permission
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update permission metadata
 * PUT /api/v1/permissions/:id
 * Requires: SUPER_ADMIN role
 */
const updatePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, allowed_assigners } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (allowed_assigners !== undefined) updates.allowed_assigners = allowed_assigners;

    const permission = await permissionService.updatePermission(
      id,
      updates,
      req.user.id,
      req
    );

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: {
        permission
      }
    });
  } catch (error) {
    if (error.message === 'Permission not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('cannot be modified')) {
      return res.status(422).json({
        success: false,
        message: error.message,
        code: 'IMMUTABLE_FIELD'
      });
    }

    next(error);
  }
};

module.exports = {
  createPermission,
  listPermissions,
  getPermission,
  updatePermission
};
