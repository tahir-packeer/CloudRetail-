const { createLogger, validation } = require('@cloudretail/shared');
const Order = require('../models/Order');
const axios = require('axios');

const logger = createLogger('order-controller');

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:3003';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';

/**
 * Create order from cart
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isValid, errors, value } = validation.validate(
      validation.orderCreateSchema,
      req.body
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Get cart from Cart Service
    const cartResponse = await axios.get(`${CART_SERVICE_URL}/api/cart`, {
      headers: { Authorization: req.headers.authorization },
    });

    const cart = cartResponse.data.data.cart;

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Validate cart before creating order
    const cartValidationResponse = await axios.get(`${CART_SERVICE_URL}/api/cart/validate`, {
      headers: { Authorization: req.headers.authorization },
    });

    const cartValidation = cartValidationResponse.data.data;
    if (!cartValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Cart validation failed',
        errors: cartValidation.errors,
      });
    }

    // Calculate totals
    const subtotal = cart.total;
    const tax = subtotal * 0.1; // 10% tax
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shippingCost;

    // Prepare order data
    const orderData = {
      userId,
      items: await Promise.all(cart.items.map(async item => {
        let sellerId = item.product.sellerId || item.sellerId;
        
        // Fallback: fetch from catalog service if missing
        if (!sellerId) {
          try {
            const productResponse = await axios.get(
              `${CATALOG_SERVICE_URL}/api/products/${item.productId}`,
              { headers: { Authorization: req.headers.authorization } }
            );
            sellerId = productResponse.data.data.product.sellerId;
          } catch (err) {
            logger.warn('Could not fetch sellerId for product', { productId: item.productId });
            sellerId = null;
          }
        }
        
        return {
          productId: item.productId,
          sellerId: sellerId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
          subtotal: item.subtotal,
        };
      })),
      subtotal,
      tax,
      shippingCost,
      total,
      shippingAddress: value.shippingAddress,
      paymentMethod: value.paymentMethod || 'card',
    };

    // Create order
    const order = await Order.create(orderData);

    // Decrement stock for each product
    for (const item of cart.items) {
      try {
        await axios.patch(
          `${CATALOG_SERVICE_URL}/api/products/${item.productId}/stock`,
          { quantity: -item.quantity }, // Negative to decrement
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: req.headers.authorization,
            },
          }
        );
        logger.info('Stock decremented', { productId: item.productId, quantity: item.quantity });
      } catch (stockError) {
        logger.error('Failed to decrement stock', {
          error: stockError.message,
          productId: item.productId,
        });
        // Continue - order already created
      }
    }

    // Clear cart after successful order creation
    await axios.delete(`${CART_SERVICE_URL}/api/cart`, {
      headers: { Authorization: req.headers.authorization },
    });

    logger.info('Order created', { orderId: order.id, userId, total: order.total });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order },
    });
  } catch (error) {
    logger.error('Create order error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get order by ID
 */
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const order = await Order.findById(parseInt(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization - buyers can only see their own orders
    if (userRole === 'buyer' && order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Sellers can only see orders containing their products
    if (userRole === 'seller') {
      const hasSellerItems = order.items.some(item => item.sellerId === userId);
      if (!hasSellerItems) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    logger.error('Get order error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
    });
  }
};

/**
 * Get user's orders
 */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const status = req.query.status;

    const result = await Order.findByUserId(userId, { page, limit, status });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get user orders error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
    });
  }
};

/**
 * Get seller orders
 */
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const status = req.query.status;

    const result = await Order.findBySellerId(sellerId, { page, limit, status });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get seller orders error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
    });
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(parseInt(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const updatedOrder = await Order.updateStatus(parseInt(id), status, notes);

    logger.info('Order status updated', { orderId: id, status });

    res.json({
      success: true,
      message: 'Order status updated',
      data: { order: updatedOrder },
    });
  } catch (error) {
    logger.error('Update order status error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
    });
  }
};

/**
 * Get order status history
 */
const getOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(parseInt(id));
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const history = await Order.getStatusHistory(parseInt(id));

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    logger.error('Get order history error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get order history',
    });
  }
};

/**
 * Update order payment status (called by Payment Service)
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentIntentId } = req.body;

    const order = await Order.findById(parseInt(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const updatedOrder = await Order.updatePaymentStatus(
      parseInt(id),
      paymentStatus,
      paymentIntentId
    );

    // If payment completed, update order status to processing
    if (paymentStatus === 'completed') {
      await Order.updateStatus(parseInt(id), 'processing', 'Payment received');
    }

    logger.info('Order payment status updated', { orderId: id, paymentStatus });

    res.json({
      success: true,
      message: 'Payment status updated',
      data: { order: updatedOrder },
    });
  } catch (error) {
    logger.error('Update payment status error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
    });
  }
};

module.exports = {
  createOrder,
  getOrder,
  getUserOrders,
  getSellerOrders,
  updateOrderStatus,
  getOrderHistory,
  updatePaymentStatus,
};
