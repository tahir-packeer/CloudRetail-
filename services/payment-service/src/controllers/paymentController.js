const { createLogger } = require('@cloudretail/shared');
const Payment = require('../models/Payment');
const axios = require('axios');

// Initialize Stripe only if valid key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_')) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const logger = createLogger('payment-controller');
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const USE_DEMO_MODE = !stripe;

/**
 * Create temporary payment intent (before order is created)
 */
const createTempPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, currency, items } = req.body;

    if (!amount || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount and items are required',
      });
    }

    // Create Stripe payment intent
    let paymentIntent;
    
    if (USE_DEMO_MODE) {
      paymentIntent = {
        id: `pi_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        client_secret: `pi_demo_secret_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: currency || 'lkr',
      };
      logger.info('Using demo payment mode (Stripe not configured)');
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'lkr',
        metadata: {
          userId: userId.toString(),
          items: JSON.stringify(items.map(i => ({ productId: i.productId, quantity: i.quantity }))),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
    }

    // Create temporary payment record (no orderId yet)
    const payment = await Payment.create({
      orderId: null, // Will be linked later
      userId,
      amount,
      currency: (currency || 'LKR').toUpperCase(),
      paymentMethod: 'card',
      paymentIntentId: paymentIntent.id,
      status: 'pending',
    });

    logger.info('Temporary payment intent created', {
      paymentId: payment.id,
      userId,
      amount,
      demoMode: USE_DEMO_MODE,
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created',
      data: {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        publishableKey: USE_DEMO_MODE ? 'pk_test_demo' : process.env.STRIPE_PUBLISHABLE_KEY,
        demoMode: USE_DEMO_MODE,
      },
    });
  } catch (error) {
    logger.error('Create temp payment intent error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Link payment to order after successful payment
 */
const linkPaymentToOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentId, orderId, paymentIntentId } = req.body;

    if (!paymentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and Order ID are required',
      });
    }

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify payment belongs to user
    if (payment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update payment with orderId and mark as succeeded
    await Payment.linkToOrder(paymentId, orderId);
    await Payment.updateStatus(paymentId, 'succeeded', {
      chargeId: paymentIntentId,
      metadata: { linkedAt: new Date().toISOString() }
    });

    // Update order payment status
    try {
      await axios.patch(
        `${ORDER_SERVICE_URL}/api/orders/${orderId}/payment-status`,
        {
          paymentStatus: 'completed',
          paymentIntentId: paymentIntentId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization,
          },
        }
      );
    } catch (error) {
      logger.error('Failed to update order payment status', {
        error: error.message,
        orderId,
      });
    }

    logger.info('Payment linked to order', {
      paymentId,
      orderId,
      userId,
    });

    res.json({
      success: true,
      message: 'Payment linked to order successfully',
    });
  } catch (error) {
    logger.error('Link payment to order error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to link payment to order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create payment intent for order
 */
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    // Get order details from Order Service
    const orderResponse = await axios.get(`${ORDER_SERVICE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: req.headers.authorization },
    });

    const order = orderResponse.data.data.order;

    // Verify order belongs to user
    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if order already has payment
    const existingPayments = await Payment.findByOrderId(orderId);
    const successfulPayment = existingPayments.find(p => p.status === 'succeeded');
    
    if (successfulPayment) {
      return res.status(400).json({
        success: false,
        message: 'Order already paid',
      });
    }

    // Create Stripe payment intent or simulate in demo mode
    let paymentIntent;
    
    if (USE_DEMO_MODE) {
      // Demo mode - simulate Stripe response
      paymentIntent = {
        id: `pi_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        client_secret: `pi_demo_secret_${Date.now()}`,
        amount: Math.round(order.total * 100),
        currency: 'usd',
      };
      logger.info('Using demo payment mode (Stripe not configured)');
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          orderId: orderId.toString(),
          userId: userId.toString(),
          orderNumber: order.orderNumber,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
    }

    // Create payment transaction record
    const payment = await Payment.create({
      orderId,
      userId,
      amount: order.total,
      currency: 'USD',
      paymentMethod: 'card',
      paymentIntentId: paymentIntent.id,
      status: 'pending',
    });

    logger.info('Payment intent created', {
      paymentId: payment.id,
      orderId,
      amount: order.total,
      demoMode: USE_DEMO_MODE,
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created',
      data: {
        payment,
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        demoMode: USE_DEMO_MODE,
      },
    });
  } catch (error) {
    logger.error('Create payment intent error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Stripe webhook handler
 */
const handleWebhook = async (req, res) => {
  if (USE_DEMO_MODE) {
    logger.warn('Webhook called in demo mode - ignoring');
    return res.json({ success: true, demoMode: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ success: false, message: 'Webhook signature verification failed' });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      default:
        logger.info('Unhandled event type', { type: event.type });
    }

    res.json({ success: true, received: true });
  } catch (error) {
    logger.error('Webhook handler error', { error: error.message, eventType: event.type });
    res.status(500).json({ success: false, message: 'Webhook handler failed' });
  }
};

/**
 * Handle successful payment
 */
const handlePaymentSucceeded = async (paymentIntent) => {
  const payment = await Payment.findByProviderTransactionId(paymentIntent.id);

  if (!payment) {
    logger.warn('Payment not found for intent', { intentId: paymentIntent.id });
    return;
  }

  // Update payment status
  await Payment.updateStatus(payment.id, 'succeeded', {
    chargeId: paymentIntent.charges?.data[0]?.id,
    receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
  });

  // Update order payment status
  try {
    await axios.patch(
      `${ORDER_SERVICE_URL}/api/orders/${payment.orderId}/payment-status`,
      {
        paymentStatus: 'succeeded',
        paymentIntentId: paymentIntent.id,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('Payment succeeded and order updated', {
      paymentId: payment.id,
      orderId: payment.orderId,
    });
  } catch (error) {
    logger.error('Failed to update order payment status', {
      error: error.message,
      orderId: payment.orderId,
    });
  }
};

/**
 * Handle failed payment
 */
const handlePaymentFailed = async (paymentIntent) => {
  const payment = await Payment.findByProviderTransactionId(paymentIntent.id);

  if (!payment) {
    logger.warn('Payment not found for intent', { intentId: paymentIntent.id });
    return;
  }

  await Payment.updateStatus(payment.id, 'failed', {
    failureMessage: paymentIntent.last_payment_error?.message,
  });

  logger.info('Payment failed', {
    paymentId: payment.id,
    orderId: payment.orderId,
    reason: paymentIntent.last_payment_error?.message,
  });
};

/**
 * Handle refund
 */
const handleRefund = async (charge) => {
  const paymentIntent = charge.payment_intent;
  const payment = await Payment.findByProviderTransactionId(paymentIntent);

  if (!payment) {
    logger.warn('Payment not found for charge', { chargeId: charge.id });
    return;
  }

  // Create refund record
  const refund = charge.refunds?.data[0];
  if (refund) {
    await Payment.createRefund({
      paymentTransactionId: payment.id,
      amount: refund.amount / 100, // Convert from cents
      reason: refund.reason,
      providerRefundId: refund.id,
      status: 'succeeded',
    });

    await Payment.updateStatus(payment.id, 'refunded');

    logger.info('Refund processed', {
      paymentId: payment.id,
      refundId: refund.id,
      amount: refund.amount / 100,
    });
  }
};

/**
 * Get payment details
 */
const getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const payment = await Payment.findById(parseInt(id));

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check authorization
    if (userRole === 'buyer' && payment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    logger.error('Get payment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment',
    });
  }
};

/**
 * Get user payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const status = req.query.status;

    const result = await Payment.getPaymentHistory(userId, { page, limit, status });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get payment history error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
    });
  }
};

/**
 * Create refund
 */
const createRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(parseInt(id));

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Only succeeded payments can be refunded',
      });
    }

    // Create Stripe refund or simulate in demo mode
    const refundAmount = amount || payment.amount;
    let stripeRefund;

    if (USE_DEMO_MODE) {
      // Demo mode - simulate refund
      stripeRefund = {
        id: `re_demo_${Date.now()}`,
        status: 'succeeded',
        amount: Math.round(refundAmount * 100),
      };
      logger.info('Using demo refund mode');
    } else {
      stripeRefund = await stripe.refunds.create({
        payment_intent: payment.providerTransactionId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: reason || 'requested_by_customer',
      });
    }

    // Create refund record
    const refund = await Payment.createRefund({
      paymentTransactionId: payment.id,
      amount: refundAmount,
      reason,
      providerRefundId: stripeRefund.id,
      status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
    });

    // Update payment status if full refund
    if (refundAmount >= payment.amount) {
      await Payment.updateStatus(payment.id, 'refunded');
    }

    logger.info('Refund created', {
      paymentId: payment.id,
      refundId: refund.id,
      amount: refundAmount,
    });

    res.status(201).json({
      success: true,
      message: 'Refund created',
      data: { refund },
    });
  } catch (error) {
    logger.error('Create refund error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Confirm payment after client-side Stripe confirmation
 * This is called by the frontend after stripe.confirmCardPayment succeeds
 */
const confirmPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID and order ID are required',
      });
    }

    // Find payment by intent ID
    const payment = await Payment.findByProviderTransactionId(paymentIntentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify payment belongs to user
    if (payment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update payment status to succeeded
    await Payment.updateStatus(payment.id, 'succeeded', {
      chargeId: paymentIntentId,
      metadata: { confirmedAt: new Date().toISOString() }
    });

    // Update order payment status
    try {
      await axios.patch(
        `${ORDER_SERVICE_URL}/api/orders/${orderId}/payment-status`,
        {
          paymentStatus: 'paid',
          paymentIntentId: paymentIntentId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Payment confirmed and order updated', {
        paymentId: payment.id,
        orderId: orderId,
        userId: userId,
      });
    } catch (error) {
      logger.error('Failed to update order payment status', {
        error: error.message,
        orderId: orderId,
      });
      // Continue anyway - payment was confirmed
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: { payment },
    });
  } catch (error) {
    logger.error('Confirm payment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  createTempPaymentIntent,
  linkPaymentToOrder,
  createPaymentIntent,
  handleWebhook,
  getPayment,
  getPaymentHistory,
  createRefund,
  confirmPayment,
};
