const { createLogger, validation, redisClient } = require('@cloudretail/shared');
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const multer = require('multer');
const storageService = require('../services/storageService');

const logger = createLogger('product-controller');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 5242880), // 5MB
  },
}).array('images', 5); // Max 5 images

/**
 * Create product
 */
const createProduct = async (req, res) => {
  try {
    const { isValid, errors, value } = validation.validate(
      validation.productCreateSchema,
      req.body
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Ensure seller can only create products for themselves
    // Auto-assign sellerId from authenticated user
    if (req.user.role === 'seller') {
      value.sellerId = req.user.userId;
    } else if (!value.sellerId) {
      // Admin must specify sellerId
      return res.status(400).json({
        success: false,
        message: 'Seller ID is required',
      });
    }

    // Map stockQuantity to stock if provided
    if (value.stockQuantity !== undefined) {
      value.stock = value.stockQuantity;
      delete value.stockQuantity;
    }

    // Create slug from name if not provided
    if (!value.slug) {
      value.slug = value.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Extract images before creating product
    const images = value.images || [];
    delete value.images;

    const product = await Product.create(value);

    // Add images to product_images table
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await ProductImage.create(product.id, {
          imageUrl: images[i],
          displayOrder: i,
          isPrimary: i === 0,
        });
      }
    }

    logger.info('Product created', { productId: product.id, sellerId: value.sellerId });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    logger.error('Create product error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get product by ID
 */
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get product images
    const images = await ProductImage.findByProductId(id);

    // Increment view count (async, don't wait)
    Product.incrementViews(id).catch(err =>
      logger.warn('Failed to increment views', { productId: id, error: err.message })
    );

    res.json({
      success: true,
      data: {
        product: {
          ...product,
          images: images.map(img => img.imageUrl),
        },
      },
    });
  } catch (error) {
    logger.error('Get product error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get product',
    });
  }
};

/**
 * Search products
 */
const searchProducts = async (req, res) => {
  try {
    // Handle 'me' as seller ID to get current user's products
    let sellerId = req.query.seller ? parseInt(req.query.seller) : null;
    if (req.query.seller === 'me' && req.user) {
      sellerId = req.user.userId;
    }

    const filters = {
      query: req.query.q,
      categoryId: req.query.category ? parseInt(req.query.category) : null,
      sellerId: sellerId,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      status: req.query.status || 'active',
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC',
    };

    const result = await Product.search(filters);

    // Fetch images for each product
    const productsWithImages = await Promise.all(
      result.data.map(async (product) => {
        const images = await ProductImage.findByProductId(product.id);
        return {
          ...product,
          images: images.map(img => img.imageUrl),
        };
      })
    );

    res.json({
      success: true,
      data: productsWithImages,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Search products error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update product
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Ensure seller can only update their own products
    if (req.user.role === 'seller' && req.user.userId !== product.sellerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own products',
      });
    }

    const { isValid, errors, value } = validation.validate(
      validation.productUpdateSchema,
      req.body
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Map stockQuantity to stock if provided
    if (value.stockQuantity !== undefined) {
      value.stock = value.stockQuantity;
      delete value.stockQuantity;
    }

    // Map categoryId to category_id for database
    if (value.categoryId !== undefined) {
      value.category_id = value.categoryId;
      delete value.categoryId;
    }

    // Extract images before updating product
    const images = value.images;
    delete value.images;

    const updatedProduct = await Product.update(id, value);

    // Update images if provided
    if (images && images.length > 0) {
      // Delete existing images
      const existingImages = await ProductImage.findByProductId(id);
      for (const img of existingImages) {
        await ProductImage.delete(img.id);
      }
      
      // Add new images
      for (let i = 0; i < images.length; i++) {
        await ProductImage.create(id, {
          imageUrl: images[i],
          displayOrder: i,
          isPrimary: i === 0,
        });
      }
    }

    logger.info('Product updated', { productId: id });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct },
    });
  } catch (error) {
    logger.error('Update product error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete product
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Ensure seller can only delete their own products
    if (req.user.role === 'seller' && req.user.userId !== product.sellerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own products',
      });
    }

    await Product.delete(id);

    logger.info('Product deleted', { productId: id });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    logger.error('Delete product error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
    });
  }
};

/**
 * Upload product images
 */
const uploadImages = (req, res) => {
  upload(req, res, async err => {
    if (err) {
      logger.error('File upload error', { error: err.message });
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }

    try {
      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Verify ownership
      if (req.user.role === 'seller' && req.user.userId !== product.sellerId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      // Process each file
      const uploadedImages = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        storageService.validateFile(file);

        const { url, thumbnailUrl } = await storageService.saveFile(
          file.buffer,
          file.originalname,
          'products'
        );

        const image = await ProductImage.create(id, {
          imageUrl: url,
          thumbnailUrl,
          displayOrder: i,
          isPrimary: i === 0, // First image is primary
        });

        uploadedImages.push(image);
      }

      logger.info('Images uploaded', { productId: id, count: uploadedImages.length });

      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: { images: uploadedImages },
      });
    } catch (error) {
      logger.error('Image upload processing error', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process images',
      });
    }
  });
};

/**
 * Get featured products
 */
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const products = await Product.getFeatured(limit);

    // Note: Images can be fetched separately via /products/:id endpoint
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('Get featured products error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get featured products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update product stock (for order fulfillment)
 */
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number',
      });
    }

    const product = await Product.findById(parseInt(id));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Calculate what the new stock will be
    const newStock = product.stock + quantity;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        data: {
          currentStock: product.stock,
          requestedChange: quantity,
        },
      });
    }

    // Pass the change amount (quantity) directly - Product.updateStock does stock + quantity
    await Product.updateStock(parseInt(id), quantity);

    logger.info('Stock updated', {
      productId: id,
      oldStock: product.stock,
      change: quantity,
      newStock: newStock,
    });

    res.json({
      success: true,
      message: 'Stock updated',
      data: {
        productId: id,
        oldStock: product.stock,
        newStock: newStock,
      },
    });
  } catch (error) {
    logger.error('Update stock error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createProduct,
  getProduct,
  searchProducts,
  updateProduct,
  deleteProduct,
  uploadImages,
  getFeaturedProducts,
  updateStock,
};
