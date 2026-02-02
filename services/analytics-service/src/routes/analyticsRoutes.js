const express = require('express');
const { middleware } = require('@cloudretail/shared');
const { authenticate, authorize } = middleware;
const {
  getDashboard,
  getSalesData,
  getTopProducts,
  getMySellerMetrics,
  getMySellerSalesData,
  getSellerMetrics,
  getTopSellers,
  refreshMetrics,
} = require('../controllers/analyticsController');

const router = express.Router();

// Public/authenticated routes
router.get('/dashboard', authenticate, authorize('admin'), getDashboard);
router.get('/sales', authenticate, authorize('admin'), getSalesData);
router.get('/products/top', authenticate, getTopProducts);
router.get('/sellers/top', authenticate, authorize('admin'), getTopSellers);

// Seller routes
router.get('/seller/me', authenticate, authorize('seller'), getMySellerMetrics);
router.get('/seller/me/sales', authenticate, authorize('seller'), getMySellerSalesData);
router.get('/seller/:sellerId', authenticate, authorize('seller', 'admin'), getSellerMetrics);

// Admin routes
router.post('/refresh', authenticate, authorize('admin'), refreshMetrics);

module.exports = router;
