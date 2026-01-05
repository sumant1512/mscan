/**
 * Categories Controller
 * Handles category CRUD operations
 */

const db = require('../config/database');

/**
 * Get all categories for tenant
 */
const getCategories = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { search, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT c.*, 
             COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      WHERE c.tenant_id = $1
    `;
    
    const params = [tenantId];
    
    // Add search filter
    if (search) {
      query += ` AND c.name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY c.id ORDER BY c.name ASC`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM categories WHERE tenant_id = $1';
    const countParams = [tenantId];
    
    if (search) {
      countQuery += ' AND name ILIKE $2';
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      categories: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
};

/**
 * Get single category
 */
const getCategory = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT c.*, 
              COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       WHERE c.id = $1 AND c.tenant_id = $2
       GROUP BY c.id`,
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category'
    });
  }
};

/**
 * Create new category
 */
const createCategory = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { name, description, icon, is_active = true } = req.body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }
    
    // Check for duplicate name
    const duplicateCheck = await db.query(
      'SELECT id FROM categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)',
      [tenantId, name.trim()]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }
    
    const result = await db.query(
      `INSERT INTO categories (tenant_id, name, description, icon, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, name.trim(), description?.trim() || null, icon?.trim() || null, is_active]
    );
    
    res.status(201).json({
      success: true,
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
};

/**
 * Update category
 */
const updateCategory = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { name, description, icon, is_active } = req.body;
    
    // Check if category exists and belongs to tenant
    const existingCategory = await db.query(
      'SELECT * FROM categories WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Validation
    if (name && name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name cannot be empty'
      });
    }
    
    // Check for duplicate name (excluding current category)
    if (name) {
      const duplicateCheck = await db.query(
        'SELECT id FROM categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [tenantId, name.trim(), id]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'A category with this name already exists'
        });
      }
    }
    
    const result = await db.query(
      `UPDATE categories 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [name?.trim(), description?.trim(), icon?.trim(), is_active, id, tenantId]
    );
    
    res.json({
      success: true,
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

/**
 * Delete category
 */
const deleteCategory = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    
    // Check if category has products
    const productCheck = await db.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [id]
    );
    
    const productCount = parseInt(productCheck.rows[0].count);
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category with ${productCount} product(s). Remove products first.`
      });
    }
    
    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};
