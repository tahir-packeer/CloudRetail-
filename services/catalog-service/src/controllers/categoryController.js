const { createLogger } = require('@cloudretail/shared');
const Category = require('../models/Category');
const Product = require('../models/Product');

const logger = createLogger('category-controller');

/**
 * Get all categories
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Get categories error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
    });
  }
};

/**
 * Get category tree (hierarchical)
 */
const getCategoryTree = async (req, res) => {
  try {
    const tree = await Category.getTree();

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    logger.error('Get category tree error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get category tree',
    });
  }
};

/**
 * Get category by ID or slug
 */
const getCategory = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try finding by ID first (if numeric), then by slug
    let category;
    if (/^\d+$/.test(identifier)) {
      category = await Category.findById(parseInt(identifier));
    } else {
      category = await Category.findBySlug(identifier);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    logger.error('Get category error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get category',
    });
  }
};

/**
 * Get products by category
 */
const getCategoryProducts = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find category
    let category;
    if (/^\d+$/.test(identifier)) {
      category = await Category.findById(parseInt(identifier));
    } else {
      category = await Category.findBySlug(identifier);
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Get products with filtering
    const filters = {
      categoryId: category.id,
      status: 'active',
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC',
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
    };

    const result = await Product.search(filters);

    res.json({
      success: true,
      data: {
        category,
        products: result.data,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get category products error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get category products',
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryTree,
  getCategory,
  getCategoryProducts,
};
