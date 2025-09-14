const express = require('express');
const { getAllGems, getGemById, createGem, updateGem, deleteGem } = require('../controllers/gemsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/gems
 * @desc    Get all active gems with optional category filtering
 * @access  Public
 * @query   category - Optional category filter (Food, Craft, Viewpoint, Shopping, Experience)
 */
router.get('/', getAllGems);

/**
 * @route   GET /api/gems/:id
 * @desc    Get a specific gem by ID
 * @access  Public
 * @param   id - Gem ObjectId
 */
router.get('/:id', getGemById);

/**
 * @route   POST /api/gems
 * @desc    Create a new gem
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @body    Gem object with all required fields
 */
router.post('/', authenticateToken, requireAdmin, createGem);

/**
 * @route   PUT /api/gems/:id
 * @desc    Update an existing gem
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   id - Gem ObjectId
 * @body    Updated gem object
 */
router.put('/:id', authenticateToken, requireAdmin, updateGem);

/**
 * @route   DELETE /api/gems/:id
 * @desc    Delete a gem
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   id - Gem ObjectId
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteGem);

module.exports = router;