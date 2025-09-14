const express = require('express');
const { 
  submitGemRequest, 
  getAllGemRequests,
  getGemRequestById,
  approveGemRequest, 
  rejectGemRequest 
} = require('../controllers/gemRequestController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/gems/request
 * @desc    Submit a new gem request from mobile users
 * @access  Public (no authentication required for mobile users)
 * @body    Gem request object with all required fields
 */
router.post('/', submitGemRequest);

/**
 * @route   GET /api/gems/requests
 * @desc    Get all gem requests for admin review
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @query   status - Optional status filter (pending, approved, rejected)
 * @query   category - Optional category filter
 * @query   page - Page number for pagination (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/', authenticateToken, requireAdmin, getAllGemRequests);

/**
 * @route   GET /api/gem-requests/:id
 * @desc    Get a specific gem request by ID
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   id - Request ObjectId
 */
router.get('/:id', authenticateToken, requireAdmin, getGemRequestById);

/**
 * @route   PUT /api/gems/requests/:id/approve
 * @desc    Approve a gem request and create actual gem
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   id - Request ObjectId
 * @body    { reviewNotes?: string }
 */
router.put('/:id/approve', authenticateToken, requireAdmin, approveGemRequest);

/**
 * @route   PUT /api/gems/requests/:id/reject
 * @desc    Reject a gem request
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   id - Request ObjectId
 * @body    { reviewNotes?: string }
 */
router.put('/:id/reject', authenticateToken, requireAdmin, rejectGemRequest);

module.exports = router;