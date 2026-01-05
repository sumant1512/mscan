/**
 * User Management Controller
 */
const db = require('../config/database');
const emailService = require('../services/email.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Create Customer (Tenant) - Super Admin Only
 */
const createCustomer = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    const {
      companyName,
      adminEmail,
      adminName,
      contactPhone,
      address
    } = req.body;

    // Validation
    if (!companyName || !adminEmail || !adminName) {
      return res.status(400).json({
        success: false,
        message: 'Company name, admin email, and admin name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email already exists
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Check if company already exists
    const companyCheck = await db.query(
      'SELECT id FROM tenants WHERE contact_email = $1',
      [adminEmail.toLowerCase()]
    );

    if (companyCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A company with this contact email already exists'
      });
    }

    await client.query('BEGIN');

    // Create tenant
    const tenantResult = await client.query(
      `INSERT INTO tenants (tenant_name, email, phone, address, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, tenant_name, email`,
      [companyName, adminEmail.toLowerCase(), contactPhone || null, address || null]
    );

    const tenant = tenantResult.rows[0];

    // Create tenant admin user
    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, full_name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, 'TENANT_ADMIN', true)
       RETURNING id, email, full_name, role`,
      [tenant.id, adminEmail.toLowerCase(), adminName, contactPhone || null]
    );

    const user = userResult.rows[0];

    // Log audit
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
       VALUES ($1, 'CREATE_CUSTOMER', 'TENANT', $2, $3, $4)`,
      [req.user.id, tenant.id, req.ip, req.get('user-agent') || 'unknown']
    );

    await client.query('COMMIT');

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.email, companyName).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        tenant: {
          id: tenant.id,
          companyName: tenant.tenant_name,
          contactEmail: tenant.email
        },
        admin: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get User Profile
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.tenant_id, u.is_active, u.created_at,
              t.tenant_name
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    const profile = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at
    };

    if (user.tenant_id) {
      profile.tenant = {
        id: user.tenant_id,
        companyName: user.tenant_name
      };
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update User Profile
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, phone } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required'
      });
    }

    const result = await db.query(
      `UPDATE users
       SET full_name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, full_name, phone, role`,
      [fullName, phone || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Log audit
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, 'UPDATE_PROFILE', 'USER', $2)`,
      [userId, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Customers (Tenants) - Super Admin Only
 */
const getAllCustomers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.tenant_name, t.email, t.phone, 
              t.address, t.is_active, t.created_at,
              COUNT(u.id) as user_count
       FROM tenants t
       LEFT JOIN users u ON t.id = u.tenant_id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        companyName: row.tenant_name,
        contactEmail: row.email,
        contactPhone: row.phone,
        address: row.address,
        isActive: row.is_active,
        userCount: parseInt(row.user_count),
        createdAt: row.created_at
      }))
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getUserProfile,
  updateUserProfile,
  getAllCustomers
};
