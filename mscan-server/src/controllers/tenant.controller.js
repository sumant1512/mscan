/**
 * Tenant Management Controller
 * Handles CRUD operations for tenants (Super Admin only)
 */

const pool = require('../config/database');
const emailService = require('../services/email.service');
const SlugGenerator = require('../services/slug-generator.service');

class TenantController {
  /**
   * Create a new tenant
   * POST /api/tenants
   * Role: SUPER_ADMIN only
   */
  async createTenant(req, res) {
    const client = await pool.getClient();
    
    try {
      const { 
        tenant_name, 
        subdomain_slug,
        contact_person, 
        email, 
        phone, 
        address 
      } = req.body;
      const createdBy = req.user.id;

      // Validation
      if (!tenant_name || !email) {
        return res.status(400).json({
          error: 'Tenant name and email are required'
        });
      }

      // Check for duplicate email
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE email = $1',
        [email]
      );

      if (existingTenant.rows.length > 0) {
        return res.status(409).json({
          error: 'A tenant with this email already exists'
        });
      }

      // Handle subdomain slug
      let slug = subdomain_slug;
      
      if (!slug) {
        // Auto-generate if not provided
        slug = await SlugGenerator.generateUniqueSlug(tenant_name);
      } else {
        // Validate custom slug
        const validation = SlugGenerator.validateSlug(slug);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
        
        // Check availability
        const available = await SlugGenerator.isSlugAvailable(slug);
        if (!available) {
          const suggestions = await SlugGenerator.generateSuggestions(tenant_name);
          return res.status(409).json({
            error: 'Subdomain is already taken',
            suggestions
          });
        }
      }

      await client.query('BEGIN');

      // Create tenant with subdomain
      const result = await client.query(
        `INSERT INTO tenants (tenant_name, subdomain_slug, email, phone, contact_person, address, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [tenant_name, slug, email, phone, contact_person, address]
      );

      const tenant = result.rows[0];

      // Create tenant admin user
      await client.query(
        `INSERT INTO users (tenant_id, email, full_name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, 'TENANT_ADMIN', true)`,
        [tenant.id, email, contact_person || tenant_name, phone]
      );

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [createdBy, 'CREATE_TENANT', 'TENANT', tenant.id, req.ip, req.get('user-agent')]
      );

      await client.query('COMMIT');

      // Send welcome email to tenant
      emailService.sendWelcomeEmail(
        tenant.email,
        tenant.tenant_name
      ).catch(err => console.error('Welcome email failed:', err));

      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseDomain = process.env.DOMAIN_BASE || 'localhost';
      const port = process.env.NODE_ENV === 'production' ? '' : ':4200';
      const subdomainUrl = `${protocol}://${slug}.${baseDomain}${port}`;

      res.status(201).json({
        message: 'Tenant created successfully',
        tenant: {
          id: tenant.id,
          tenant_name: tenant.tenant_name,
          subdomain_slug: tenant.subdomain_slug,
          email: tenant.email,
          phone: tenant.phone,
          contact_person: tenant.contact_person,
          address: tenant.address,
          is_active: tenant.is_active,
          created_at: tenant.created_at
        },
        subdomain_url: subdomainUrl
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create tenant error:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    } finally {
      client.release();
    }
  }

  /**
   * Get all tenants with admin details
   * GET /api/tenants
   * Role: SUPER_ADMIN only
   * Returns all tenants with their admin count and admin details (no pagination)
   */
  async getAllTenants(req, res) {
    try {
      // Simple query - get all tenants with admin count
      const query = `SELECT t.*, 
           COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'TENANT_ADMIN') as tenant_admin_count
           FROM tenants t
           LEFT JOIN users u ON u.tenant_id = t.id
           GROUP BY t.id
           ORDER BY t.created_at DESC`;

      const result = await pool.query(query);

      // Map is_active to status for frontend
      const tenants = result.rows.map(tenant => ({
        ...tenant,
        status: tenant.is_active ? 'active' : 'inactive',
        tenant_admin_count: parseInt(tenant.tenant_admin_count || 0)
      }));

      // Fetch all admins for all tenants in one query
      if (tenants.length > 0) {
        const tenantIds = tenants.map(t => t.id);
        
        const adminsQuery = `
          SELECT 
            u.id,
            u.email,
            u.full_name,
            u.phone,
            u.role,
            u.tenant_id,
            u.is_active,
            u.created_at,
            u.updated_at
          FROM users u
          WHERE u.tenant_id = ANY($1) 
            AND u.role = 'TENANT_ADMIN'
          ORDER BY u.created_at DESC
        `;
        
        const adminsResult = await pool.query(adminsQuery, [tenantIds]);
        
        // Group admins by tenant_id
        const adminsByTenant = {};
        adminsResult.rows.forEach(admin => {
          if (!adminsByTenant[admin.tenant_id]) {
            adminsByTenant[admin.tenant_id] = [];
          }
          adminsByTenant[admin.tenant_id].push(admin);
        });
        
        // Add admins array to each tenant
        tenants.forEach(tenant => {
          tenant.admins = adminsByTenant[tenant.id] || [];
        });
      }

      res.json({
        tenants,
        total: tenants.length
      });

    } catch (error) {
      console.error('Get tenants error:', error);
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }

  /**
   * Get tenant by ID
   * GET /api/tenants/:id
   * Role: SUPER_ADMIN only
   */
  async getTenantById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT t.*, 
                tcb.balance as credit_balance,
                tcb.total_received as total_credits_received,
                tcb.total_spent as total_credits_spent,
                (SELECT COUNT(*) FROM credit_requests WHERE tenant_id = t.id AND status = 'pending') as pending_credit_requests,
                (SELECT COUNT(*) FROM coupons WHERE tenant_id = t.id) as total_coupons
         FROM tenants t
         LEFT JOIN tenant_credit_balance tcb ON t.id = tcb.tenant_id
         WHERE t.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const tenant = result.rows[0];
      // Map is_active to status for frontend
      tenant.status = tenant.is_active ? 'active' : 'inactive';

      res.json({ tenant });

    } catch (error) {
      console.error('Get tenant error:', error);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  }

  /**
   * Update tenant
   * PUT /api/tenants/:id
   * Role: SUPER_ADMIN only
   */
  async updateTenant(req, res) {
    const client = await pool.getClient();
    
    try {
      const { id } = req.params;
      const { tenant_name, contact_person, email, phone, address } = req.body;
      const updatedBy = req.user.id;

      // Check if tenant exists
      const existingTenant = await client.query(
        'SELECT * FROM tenants WHERE id = $1',
        [id]
      );

      if (existingTenant.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Check for duplicate email (excluding current tenant)
      if (email) {
        const duplicateCheck = await client.query(
          'SELECT id FROM tenants WHERE email = $1 AND id != $2',
          [email, id]
        );

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            error: 'Another tenant with this email already exists'
          });
        }
      }

      // Update tenant (subdomain_slug is NOT updated)
      const result = await client.query(
        `UPDATE tenants 
         SET tenant_name = COALESCE($1, tenant_name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             contact_person = COALESCE($4, contact_person),
             address = COALESCE($5, address),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [tenant_name, email, phone, contact_person, address, id]
      );

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [updatedBy, 'UPDATE_TENANT', 'TENANT', id, req.ip, req.get('user-agent')]
      );

      res.json({
        message: 'Tenant updated successfully',
        tenant: result.rows[0]
      });

    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(500).json({ error: 'Failed to update tenant' });
    } finally {
      client.release();
    }
  }

  /**
   * Toggle tenant status (activate/deactivate)
   * PATCH /api/tenants/:id/status
   * Role: SUPER_ADMIN only
   */
  async toggleTenantStatus(req, res) {
    const client = await pool.getClient();
    
    try {
      const { id } = req.params;
      const { is_active, reason } = req.body;
      const updatedBy = req.user.id;

      if (is_active === undefined) {
        return res.status(400).json({ error: 'is_active field is required' });
      }

      // Update status
      const result = await client.query(
        `UPDATE tenants 
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [is_active, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const action = is_active ? 'ACTIVATE_TENANT' : 'DEACTIVATE_TENANT';

      // Log audit with reason
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [updatedBy, action, 'TENANT', id, req.ip, req.get('user-agent')]
      );

      await client.query('COMMIT');

      // Send status change notification email to tenant
      emailService.sendTenantStatusChangeEmail(
        result.rows[0].email,
        result.rows[0].tenant_name,
        is_active
      ).catch(err => console.error('Status change email failed:', err));

      res.json({
        message: `Tenant ${is_active ? 'activated' : 'deactivated'} successfully`,
        tenant: result.rows[0]
      });

    } catch (error) {
      console.error('Toggle tenant status error:', error);
      res.status(500).json({ error: 'Failed to update tenant status' });
    } finally {
      client.release();
    }
  }

  /**
   * Check subdomain availability (real-time validation)
   * GET /api/tenants/check-slug/:slug
   * Public endpoint for registration form
   */
  async checkSlugAvailability(req, res) {
    try {
      const { slug } = req.params;
      
      // Validate format
      const validation = SlugGenerator.validateSlug(slug);
      if (!validation.valid) {
        return res.json({
          available: false,
          error: validation.error
        });
      }
      
      // Check availability
      const available = await SlugGenerator.isSlugAvailable(slug);
      
      res.json({
        available,
        slug,
        message: available ? 'Subdomain is available' : 'Subdomain is already taken'
      });
    } catch (error) {
      console.error('Check slug error:', error);
      res.status(500).json({ error: 'Failed to check subdomain availability' });
    }
  }

  /**
   * Get subdomain suggestions based on tenant name
   * GET /api/tenants/suggest-slugs?tenantName=...
   * Public endpoint for registration form
   */
  async getSuggestedSlugs(req, res) {
    try {
      const { tenantName } = req.query;
      
      if (!tenantName) {
        return res.status(400).json({ error: 'Tenant name is required' });
      }
      
      const suggestions = await SlugGenerator.generateSuggestions(tenantName);
      
      res.json({
        suggestions,
        count: suggestions.length
      });
    } catch (error) {
      console.error('Suggest slugs error:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  }

  /**
   * Get all Tenant Admins for a specific tenant
   * GET /api/tenants/:tenantId/admins
   * Role: SUPER_ADMIN only
   */
  async getTenantAdmins(req, res) {
    try {
      const { tenantId } = req.params;

      // Get tenant info
      const tenantResult = await pool.query(
        'SELECT id, tenant_name, subdomain_slug, email FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Tenant not found' 
        });
      }

      const tenant = tenantResult.rows[0];

      // Get all TENANT_ADMIN users for this tenant
      const adminsResult = await pool.query(
        `SELECT 
          u.id,
          u.email,
          u.full_name,
          u.phone,
          u.role,
          u.tenant_id,
          u.is_active,
          u.created_at,
          u.updated_at
         FROM users u
         WHERE u.tenant_id = $1 
           AND u.role = 'TENANT_ADMIN'
         ORDER BY u.created_at DESC`,
        [tenantId]
      );

      res.json({
        success: true,
        data: {
          admins: adminsResult.rows,
          tenant: {
            id: tenant.id,
            name: tenant.tenant_name,
            domain: `${tenant.subdomain_slug}.${process.env.DOMAIN_BASE || 'mscan.com'}`,
            subdomain: tenant.subdomain_slug
          }
        }
      });

    } catch (error) {
      console.error('Get tenant admins error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch tenant admins' 
      });
    }
  }
}

module.exports = new TenantController();

