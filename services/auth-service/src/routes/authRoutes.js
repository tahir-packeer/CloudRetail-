const express = require('express');
const { middleware } = require('@cloudretail/shared');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', middleware.authenticate, authController.getProfile);

// Admin routes
router.get('/users', middleware.authenticate, middleware.authorize('admin'), authController.getAllUsers);
router.get('/users/:userId', middleware.authenticate, authController.getUserById);
router.patch('/users/:userId/status', middleware.authenticate, middleware.authorize('admin'), authController.updateUserStatus);
router.patch('/users/:userId/verify-seller', middleware.authenticate, middleware.authorize('admin'), authController.verifySeller);

// Service-to-service route for token verification
router.post('/verify', authController.verifyToken);

module.exports = router;
