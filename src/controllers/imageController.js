const imageService = require('../services/imageService');
const Joi = require('joi');

/**
 * Upload image endpoint
 * @route POST /api/images/upload
 * @access Private (Admin only)
 */
const uploadImage = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file provided'
        }
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Upload and process image
    const result = await imageService.uploadImage(buffer, originalname, mimetype);

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Image upload error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message || 'Failed to upload image'
      }
    });
  }
};

/**
 * Delete image endpoint
 * @route DELETE /api/images/:fileId
 * @access Private (Admin only)
 */
const deleteImage = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate file ID
    const schema = Joi.object({
      fileId: Joi.string().uuid().required()
    });

    const { error } = schema.validate({ fileId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_ID',
          message: 'Invalid file ID format'
        }
      });
    }

    // Delete image
    const success = await imageService.deleteImage(fileId);

    if (success) {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete image or image not found'
        }
      });
    }

  } catch (error) {
    console.error('Image deletion error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error.message || 'Failed to delete image'
      }
    });
  }
};

/**
 * Get image metadata endpoint
 * @route POST /api/images/metadata
 * @access Private (Admin only)
 */
const getImageMetadata = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file provided'
        }
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Validate image first
    imageService.validateImage(buffer, mimetype);

    // Get metadata
    const metadata = await imageService.getImageMetadata(buffer);

    res.json({
      success: true,
      data: {
        ...metadata,
        originalName: originalname,
        mimeType: mimetype
      },
      message: 'Image metadata retrieved successfully'
    });

  } catch (error) {
    console.error('Image metadata error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'METADATA_ERROR',
        message: error.message || 'Failed to get image metadata'
      }
    });
  }
};

/**
 * Proxy image endpoint - serves images from private B2 bucket
 * @route GET /api/images/proxy/:filename
 * @access Public (for displaying images)
 */
const proxyImage = async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename provided'
        }
      });
    }

    // Get image from B2 through service
    const imageData = await imageService.getImage(filename);

    if (!imageData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found'
        }
      });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': imageData.contentType || 'image/jpeg',
      'Content-Length': imageData.contentLength,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': imageData.etag || filename
    });

    // Stream the image data
    res.send(imageData.body);

  } catch (error) {
    console.error('Image proxy error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PROXY_ERROR',
        message: error.message || 'Failed to proxy image'
      }
    });
  }
};

/**
 * Image service health check endpoint
 * @route GET /api/images/health
 * @access Private (Admin only)
 */
const healthCheck = async (req, res) => {
  try {
    const health = await imageService.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
      message: `Image service is ${health.status}`
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error.message || 'Health check failed'
      }
    });
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  getImageMetadata,
  proxyImage,
  healthCheck
};