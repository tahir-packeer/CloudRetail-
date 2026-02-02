const express = require('express');
const { authenticate, authorize } = require('@cloudretail/shared').middleware;
const orderController = require('../controllers/orderController');

const router = express.Router();

/**
 * Buyer routes
 */
router.post('/', authenticate, authorize('buyer'), orderController.createOrder);
router.get('/my-orders', authenticate, authorize('buyer'), orderController.getUserOrders);

/**
 * Seller routes
 */
router.get('/seller-orders', authenticate, authorize('seller', 'admin'), orderController.getSellerOrders);

/**
 * Shared routes (with role-based authorization in controller)
 */
router.get('/:id', authenticate, orderController.getOrder);
router.get('/:id/history', authenticate, orderController.getOrderHistory);

/**
 * Admin/Seller routes for status updates
 */
router.patch('/:id/status', authenticate, authorize('seller', 'admin'), orderController.updateOrderStatus);

/**
 * Payment service route (internal - no user authentication needed)
 */
router.patch('/:id/payment-status', orderController.updatePaymentStatus);

module.exports = router;
