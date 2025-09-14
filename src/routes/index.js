const express = require('express');
const gemsRoutes = require('./gems');
const authRoutes = require('./auth');
const imageRoutes = require('./images');
const gemRequestRoutes = require('./gemRequests');

const router = express.Router();

// Mount authentication routes
router.use('/auth', authRoutes);

// Mount gems routes
router.use('/gems', gemsRoutes);

// Mount gem request routes
router.use('/gem-requests', gemRequestRoutes);

// Mount image routes
router.use('/images', imageRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Srinagar Local Gems API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Admin login - returns JWT token',
        'POST /api/auth/refresh': 'Refresh JWT token (requires authentication)',
        'POST /api/auth/logout': 'Logout (requires authentication)'
      },
      gems: {
        'GET /api/gems': 'Get all active gems with optional category filtering',
        'GET /api/gems/:id': 'Get a specific gem by ID',
        'POST /api/gems': 'Create a new gem (Admin only)',
        'PUT /api/gems/:id': 'Update an existing gem (Admin only)',
        'DELETE /api/gems/:id': 'Delete a gem (Admin only)'
      },
      gemRequests: {
        'POST /api/gem-requests': 'Submit a new gem request from mobile users (Public)',
        'GET /api/gem-requests': 'Get all gem requests for admin review (Admin only)',
        'PUT /api/gem-requests/:id/approve': 'Approve a gem request and create gem (Admin only)',
        'PUT /api/gem-requests/:id/reject': 'Reject a gem request (Admin only)'
      },
      images: {
        'POST /api/images/upload': 'Upload and process image with multiple sizes (Admin only)',
        'DELETE /api/images/:fileId': 'Delete image and all its size variants (Admin only)',
        'POST /api/images/metadata': 'Get image metadata without uploading (Admin only)',
        'GET /api/images/health': 'Check image service health status (Admin only)'
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;