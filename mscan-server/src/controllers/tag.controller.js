const tagService = require('../services/tag.service');

class TagController {

  /**
   * Get all tags
   * GET /api/tags
   * Query params:
   *   - app_id: Filter by verification app (optional)
   *   - is_active: Filter by active status (optional)
   *   - search: Search by tag name (optional)
   */
  async getAllTags(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { app_id, is_active, search } = req.query;

      console.log('=== GET TAGS DEBUG ===');
      console.log('Tenant ID:', tenantId);
      console.log('Query params:', req.query);
      console.log('app_id value:', app_id);
      console.log('app_id type:', typeof app_id);
      console.log('app_id truthy:', !!app_id);

      const filters = {};

      // Only add app_id filter if it has a value and is not "all"
      if (app_id && app_id !== '' && app_id !== 'all') {
        filters.verification_app_id = app_id;
        console.log('Added app_id filter:', app_id);
      } else {
        console.log('Skipped app_id filter (empty/undefined/all)');
      }

      // Only add is_active filter if explicitly provided
      if (is_active !== undefined) {
        filters.is_active = is_active === 'true';
      }

      // Only add search filter if it has a value
      if (search) {
        filters.search = search;
      }

      console.log('Final filters object:', JSON.stringify(filters, null, 2));

      const tags = await tagService.getAllTags(tenantId, filters);

      console.log('Tags returned:', tags.length);
      console.log('=====================');

      res.status(200).json({
        success: true,
        data: tags,
        count: tags.length
      });
    } catch (error) {
      console.error('Error in getAllTags:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tags',
        error: error.message
      });
    }
  }

  /**
   * Get tag by ID
   * GET /api/tags/:id
   */
  async getTagById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const tag = await tagService.getTagById(id, tenantId);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      res.status(200).json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Error in getTagById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tag',
        error: error.message
      });
    }
  }

  /**
   * Create new tag
   * POST /api/tags
   */
  async createTag(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const tagData = req.body;

      // Validate required fields
      if (!tagData.verification_app_id || !tagData.name) {
        return res.status(400).json({
          success: false,
          message: 'verification_app_id and name are required'
        });
      }

      // Validate that verification_app_id is not "all" or empty
      if (tagData.verification_app_id === 'all' || tagData.verification_app_id === '') {
        return res.status(400).json({
          success: false,
          message: 'Please select a specific verification app. Tags must belong to a specific app.'
        });
      }

      const tag = await tagService.createTag(tenantId, tagData);

      res.status(201).json({
        success: true,
        message: 'Tag created successfully',
        data: tag
      });
    } catch (error) {
      console.error('Error in createTag:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create tag',
        error: error.message
      });
    }
  }

  /**
   * Update existing tag
   * PUT /api/tags/:id
   */
  async updateTag(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;
      const updates = req.body;

      const tag = await tagService.updateTag(id, tenantId, updates);

      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Tag updated successfully',
        data: tag
      });
    } catch (error) {
      console.error('Error in updateTag:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update tag',
        error: error.message
      });
    }
  }

  /**
   * Delete tag
   * DELETE /api/tags/:id
   */
  async deleteTag(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenant_id;

      const result = await tagService.deleteTag(id, tenantId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteTag:', error);

      if (error.message.includes('in use')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete tag',
        error: error.message
      });
    }
  }

  /**
   * Get tags for a verification app
   * GET /api/tags/app/:appId
   */
  async getTagsForApp(req, res) {
    try {
      const { appId } = req.params;
      const tenantId = req.user.tenant_id;

      const tags = await tagService.getTagsForApp(appId, tenantId);

      res.status(200).json({
        success: true,
        data: tags,
        count: tags.length
      });
    } catch (error) {
      console.error('Error in getTagsForApp:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tags for app',
        error: error.message
      });
    }
  }

  /**
   * Get product tags
   * GET /api/products/:productId/tags
   */
  async getProductTags(req, res) {
    try {
      const { productId } = req.params;

      const tags = await tagService.getProductTags(productId);

      res.status(200).json({
        success: true,
        data: tags,
        count: tags.length
      });
    } catch (error) {
      console.error('Error in getProductTags:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product tags',
        error: error.message
      });
    }
  }
}

// Export controller instance
const controller = new TagController();

// Export bound methods
module.exports = {
  getAllTags: controller.getAllTags.bind(controller),
  getTagById: controller.getTagById.bind(controller),
  createTag: controller.createTag.bind(controller),
  updateTag: controller.updateTag.bind(controller),
  deleteTag: controller.deleteTag.bind(controller),
  getTagsForApp: controller.getTagsForApp.bind(controller),
  getProductTags: controller.getProductTags.bind(controller)
};
