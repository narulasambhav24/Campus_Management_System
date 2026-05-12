const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getCurrentUser);

// GET /api/auth/users
router.get('/users', requireAuth, requireRole('admin'), authController.getAllUsers);

module.exports = router;
