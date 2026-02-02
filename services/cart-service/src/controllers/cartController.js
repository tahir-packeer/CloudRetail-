const { createLogger, validation } = require('@cloudretail/shared');
const Cart = require('../models/Cart');

const logger = createLogger('cart-controller');

/**
 * Get user's cart
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart = await Cart.getCart(userId);

    res.json({
      success: true,
      data: { cart },
    });
  } catch (error) {
    logger.error('Get cart error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get cart',
    });
  }
};

/**
 * Add item to cart
 */
const addItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isValid, errors, value } = validation.validate(
      validation.cartItemSchema,
      req.body
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const cart = await Cart.addItem(userId, value.productId, value.quantity);

    logger.info('Item added to cart', { userId, productId: value.productId, quantity: value.quantity });

    res.json({
      success: true,
      message: 'Item added to cart',
      data: { cart },
    });
  } catch (error) {
    logger.error('Add to cart error', { error: error.message });
    
    if (error.message.includes('not found') || error.message.includes('available') || error.message.includes('stock')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
    });
  }
};

/**
 * Update cart item quantity
 */
const updateItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity',
      });
    }

    const cart = await Cart.updateItem(userId, parseInt(productId), quantity);

    logger.info('Cart item updated', { userId, productId, quantity });

    res.json({
      success: true,
      message: 'Cart updated',
      data: { cart },
    });
  } catch (error) {
    logger.error('Update cart error', { error: error.message });
    
    if (error.message.includes('not found') || error.message.includes('stock') || error.message.includes('not in cart')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
    });
  }
};

/**
 * Remove item from cart
 */
const removeItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const cart = await Cart.removeItem(userId, parseInt(productId));

    logger.info('Item removed from cart', { userId, productId });

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: { cart },
    });
  } catch (error) {
    logger.error('Remove from cart error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to remove item',
    });
  }
};

/**
 * Clear entire cart
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart = await Cart.clearCart(userId);

    logger.info('Cart cleared', { userId });

    res.json({
      success: true,
      message: 'Cart cleared',
      data: { cart },
    });
  } catch (error) {
    logger.error('Clear cart error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
    });
  }
};

/**
 * Merge guest cart into logged-in user cart
 */
const mergeCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { guestUserId } = req.body;

    if (!guestUserId) {
      return res.status(400).json({
        success: false,
        message: 'Guest user ID required',
      });
    }

    const cart = await Cart.mergeCart(guestUserId, userId);

    logger.info('Cart merged', { guestUserId, userId });

    res.json({
      success: true,
      message: 'Carts merged successfully',
      data: { cart },
    });
  } catch (error) {
    logger.error('Merge cart error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to merge carts',
    });
  }
};

/**
 * Validate cart before checkout
 */
const validateCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const validation = await Cart.validateCart(userId);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Validate cart error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to validate cart',
    });
  }
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  validateCart,
};
