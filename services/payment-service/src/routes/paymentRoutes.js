const express = require('express');
const { authenticate, authorize } = require('@cloudretail/shared').middleware;
const paymentController = require('../controllers/paymentController');

const router = express.Router();

/**
 * Webhook endpoint (no authentication - Stripe calls this)
 * Note: Raw body middleware is applied in index.js before this route
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * Buyer routes
 */
router.post('/create-temp-intent', authenticate, authorize('buyer'), paymentController.createTempPaymentIntent);
router.post('/link-to-order', authenticate, authorize('buyer'), paymentController.linkPaymentToOrder);
router.post('/intent', authenticate, authorize('buyer'), paymentController.createPaymentIntent);
router.post('/confirm', authenticate, authorize('buyer'), paymentController.confirmPayment);
router.get('/history', authenticate, authorize('buyer'), paymentController.getPaymentHistory);

/**
 * Shared routes
 */
router.get('/:id', authenticate, paymentController.getPayment);

/**
 * Admin routes
 */
router.post('/:id/refund', authenticate, authorize('admin'), paymentController.createRefund);

module.exports = router;
