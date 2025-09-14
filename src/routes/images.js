const express = require('express');
const multer = require('multer');
const { uploadImage, deleteImage, getImageMetadata, proxyImage, healthCheck } = require('../controllers/imageController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        }
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one file can be uploaded at a time'
        }
      });
    }
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message
      }
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    });
  }
  
  next(error);
};

/**
 * @route   POST /api/images/upload
 * @desc    Upload and process image with multiple sizes
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @body    multipart/form-data with 'image' field
 */
router.post('/upload', 
  authenticateToken, 
  requireAdmin, 
  upload.single('image'), 
  handleMulterError,
  uploadImage
);

/**
 * @route   DELETE /api/images/:fileId
 * @desc    Delete image and all its size variants
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @param   fileId - UUID of the image file
 */
router.delete('/:fileId', 
  authenticateToken, 
  requireAdmin, 
  deleteImage
);

/**
 * @route   POST /api/images/metadata
 * @desc    Get image metadata without uploading
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 * @body    multipart/form-data with 'image' field
 */
router.post('/metadata', 
  authenticateToken, 
  requireAdmin, 
  upload.single('image'), 
  handleMulterError,
  getImageMetadata
);

/**
 * @route   GET /api/images/proxy/:filename
 * @desc    Proxy images from private B2 bucket
 * @access  Public (for displaying images)
 * @param   filename - Name of the image file
 */
router.get('/proxy/:filename', proxyImage);

/**
 * @route   GET /api/images/health
 * @desc    Check image service health status
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 */
router.get('/health', 
  authenticateToken, 
  requireAdmin, 
  healthCheck
);

// Test endpoint without auth to verify routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Image routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;