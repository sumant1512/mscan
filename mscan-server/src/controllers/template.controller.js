const templateService = require('../services/template.service');
const db = require('../config/database');

class TemplateController {

  /**
   * Get all templates
   * GET /api/templates
   */
  async getAllTemplates(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        search: req.query.search,
        include_system: req.query.include_system !== undefined ? req.query.include_system === 'true' : true
      };

      const templates = await templateService.getAllTemplates(tenantId, filters);

      // Transform templates to match frontend expectations (backward compatibility)
      const transformedTemplates = templates.map(t => ({
        id: t.id,
        tenant_id: t.tenant_id,
        name: t.template_name, // Map template_name to name
        description: t.description,
        icon: t.icon || '📋', // Default icon if not present
        is_system_template: false, // All templates are tenant-specific now
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
        attribute_count: t.custom_fields ? (Array.isArray(t.custom_fields) ? t.custom_fields.length : 0) : 0,
        product_count: t.product_count || 0,
        app_count: t.app_count || 0
      }));

      // Calculate pagination
      const total = transformedTemplates.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTemplates = transformedTemplates.slice(startIndex, endIndex);

      res.status(200).json({
        templates: paginatedTemplates,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages
        }
      });
    } catch (error) {
      console.error('Error in getAllTemplates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates',
        error: error.message
      });
    }
  }

  /**
   * Get template by ID
   * GET /api/templates/:id
   */
  async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const template = await templateService.getTemplateById(id, tenantId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Return raw template with JSONB fields (variant_config, custom_fields)
      res.status(200).json({
        success: true,
        data: template,
        message: 'Template retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch template',
        error: error.message
      });
    }
  }

  /**
   * Create new template
   * POST /api/templates
   */
  async createTemplate(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const templateData = req.body;

      // Validate required fields
      if (!templateData.template_name || !templateData.industry_type || !templateData.variant_config || !templateData.custom_fields) {
        return res.status(400).json({
          success: false,
          message: 'template_name, industry_type, variant_config, and custom_fields are required'
        });
      }

      const template = await templateService.createTemplate(tenantId, templateData);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template
      });
    } catch (error) {
      console.error('Error in createTemplate:', error);

      if (error.message.includes('variant_config') || error.message.includes('custom_fields') || error.message.includes('industry_type')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid template configuration',
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create template',
        error: error.message
      });
    }
  }

  /**
   * Update existing template
   * PUT /api/templates/:id
   */
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;
      const updates = req.body;

      const template = await templateService.updateTemplate(id, tenantId, updates);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        data: template
      });
    } catch (error) {
      console.error('Error in updateTemplate:', error);

      if (error.message.includes('Cannot update template')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('variant_config') || error.message.includes('custom_fields') || error.message.includes('industry_type')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid template configuration',
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update template',
        error: error.message
      });
    }
  }

  /**
   * Delete template
   * DELETE /api/templates/:id
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const result = await templateService.deleteTemplate(id, tenantId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteTemplate:', error);

      if (error.message.includes('Cannot delete template')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete template',
        error: error.message
      });
    }
  }

  /**
   * Get templates for a verification app
   * GET /api/templates/app/:appId
   */
  async getTemplatesForApp(req, res) {
    try {
      const { appId } = req.params;
      const tenantId = req.user.tenant_id;

      const templates = await templateService.getTemplatesForApp(appId, tenantId);

      res.status(200).json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      console.error('Error in getTemplatesForApp:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates for app',
        error: error.message
      });
    }
  }

  /**
   * Duplicate template
   * POST /api/templates/:id/duplicate
   */
  async duplicateTemplate(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for duplicated template'
        });
      }

      // Get source template
      const sourceTemplate = await templateService.getTemplateById(id, tenantId);

      if (!sourceTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Source template not found'
        });
      }

      // Create duplicate with new name
      const duplicateData = {
        template_name: name,
        description: sourceTemplate.description,
        variant_config: sourceTemplate.variant_config,
        custom_fields: sourceTemplate.custom_fields,
        is_active: true
      };

      const newTemplate = await templateService.createTemplate(tenantId, duplicateData);

      res.status(201).json({
        success: true,
        message: 'Template duplicated successfully',
        template: newTemplate
      });
    } catch (error) {
      console.error('Error in duplicateTemplate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate template',
        error: error.message
      });
    }
  }

  /**
   * Toggle template status (activate/deactivate)
   * PATCH /api/templates/:id/toggle-status
   */
  async toggleTemplateStatus(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const template = await templateService.toggleTemplateStatus(id, tenantId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      const action = template.is_active ? 'activated' : 'deactivated';

      res.status(200).json({
        success: true,
        message: `Template ${action} successfully`,
        data: template
      });
    } catch (error) {
      console.error('Error in toggleTemplateStatus:', error);

      if (error.message.includes('Cannot deactivate')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to toggle template status',
        error: error.message
      });
    }
  }

}

// Export controller instance
const controller = new TemplateController();

// Export bound methods
module.exports = {
  getAllTemplates: controller.getAllTemplates.bind(controller),
  getTemplateById: controller.getTemplateById.bind(controller),
  createTemplate: controller.createTemplate.bind(controller),
  updateTemplate: controller.updateTemplate.bind(controller),
  deleteTemplate: controller.deleteTemplate.bind(controller),
  getTemplatesForApp: controller.getTemplatesForApp.bind(controller),
  duplicateTemplate: controller.duplicateTemplate.bind(controller),
  toggleTemplateStatus: controller.toggleTemplateStatus.bind(controller)
};
