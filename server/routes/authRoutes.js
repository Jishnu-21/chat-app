const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout user (protected route)
router.post('/logout', protect, authController.logout);

// Get current user (protected route)
router.get('/me', protect, authController.getCurrentUser);

module.exports = router;
