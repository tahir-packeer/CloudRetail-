const express = require('express');
const { authenticate } = require('@cloudretail/shared').middleware;
const cartController = require('../controllers/cartController');

const router = express.Router();

/**
 * All cart routes require authentication
 */
router.get('/', authenticate, cartController.getCart);
router.post('/items', authenticate, cartController.addItem);
router.put('/items/:productId', authenticate, cartController.updateItem);
router.delete('/items/:productId', authenticate, cartController.removeItem);
router.delete('/', authenticate, cartController.clearCart);
router.post('/merge', authenticate, cartController.mergeCart);
router.get('/validate', authenticate, cartController.validateCart);

module.exports = router;
