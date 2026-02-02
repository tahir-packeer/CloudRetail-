const express = require('express');
const { authenticate, authorize } = require('@cloudretail/shared').middleware;
const productController = require('../controllers/productController');

const router = express.Router();

/**
 * Public routes (but accept authentication if provided)
 */
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/search', optionalAuth, productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id', productController.getProduct);

/**
 * Protected routes - Seller and Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  productController.deleteProduct
);

router.post(
  '/:id/images',
  authenticate,
  authorize('seller', 'admin'),
  productController.uploadImages
);

/**
 * Stock management - Internal use (order service)
 */
router.patch(
  '/:id/stock',
  authenticate,
  productController.updateStock
);

module.exports = router;
