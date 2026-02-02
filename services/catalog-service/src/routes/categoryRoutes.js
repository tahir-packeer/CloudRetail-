const express = require('express');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

/**
 * All category routes are public
 */
router.get('/', categoryController.getAllCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:identifier', categoryController.getCategory);
router.get('/:identifier/products', categoryController.getCategoryProducts);

module.exports = router;
