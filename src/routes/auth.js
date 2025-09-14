const express = require('express');
const { login, refreshToken, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin user and return JWT token
 * @access  Public
 * @body    { username: string, password: string }
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token for authenticated user
 * @access  Private (requires valid JWT token)
 * @headers Authorization: Bearer <token>
 */
router.post('/refresh', authenticateToken, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private (requires valid JWT token)
 * @headers Authorization: Bearer <token>
 */
router.post('/logout', authenticateToken, logout);

module.exports = router;