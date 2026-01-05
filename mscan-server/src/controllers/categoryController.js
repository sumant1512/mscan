/**
 * Product Categories Controller
 * Handles CRUD operations for product categories
 */

const db = require('../config/database');

/**
 * Create a new category
 */
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const tenantId = req.user.tenant_id;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category already exists
    const existingCategory = await db.query(
      'SELECT id FROM product_categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)',
      [tenantId, name.trim()]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category
    const result = await db.query(
      `INSERT INTO product_categories (tenant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at`,
      [tenantId, name.trim(), description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Get all categories for tenant
 */
const getCategories = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const result = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        COUNT(p.id) as product_count
       FROM product_categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1
       GROUP BY c.id, c.name, c.description, c.created_at
       ORDER BY c.name ASC`,
      [tenantId]
    );

    res.json({
      success: true,
      categories: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * Get single category by ID
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        COUNT(p.id) as product_count
       FROM product_categories c
       LEFT JOIN products p ON p.category_id = c.id
       WHERE c.id = $1 AND c.tenant_id = $2
       GROUP BY c.id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

/**
 * Update category
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const tenantId = req.user.tenant_id;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category exists
    const existing = await db.query(
      'SELECT id FROM product_categories WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check for duplicate name
    const duplicate = await db.query(
      'SELECT id FROM product_categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [tenantId, name.trim(), id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Update category
    const result = await db.query(
      `UPDATE product_categories 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, name, description, updated_at`,
      [name.trim(), description || null, id, tenantId]
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Delete category
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    // Check if category has products
    const productsCheck = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (parseInt(productsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products. Please reassign or delete products first.',
        product_count: parseInt(productsCheck.rows[0].count)
      });
    }

    // Delete category
    const result = await db.query(
      'DELETE FROM product_categories WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
