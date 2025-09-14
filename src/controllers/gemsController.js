const Gem = require('../models/Gem');
const Joi = require('joi');
const database = require('../config/database');

/**
 * Get all gems with optional category filtering
 * GET /api/gems?category=Food
 */
const getAllGems = async (req, res) => {
  try {
    // Ensure database connection is established (critical for serverless)
    await database.ensureConnection();
    
    const { category } = req.query;
    
    // Build query object
    let query = { isActive: true };
    
    // Add category filter if provided
    if (category) {
      // Validate category
      const validCategories = ['Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience'];
      const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      
      if (!validCategories.includes(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
            details: { providedCategory: category, validCategories }
          },
          timestamp: new Date().toISOString()
        });
      }
      
      query.category = normalizedCategory;
    }
    
    // Fetch gems from database with timeout handling
    const gems = await Gem.find(query).sort({ createdAt: -1 }).maxTimeMS(25000);
    
    // Return successful response
    res.status(200).json({
      success: true,
      data: gems,
      total: gems.length,
      message: category ? `Found ${gems.length} gems in ${category} category` : `Found ${gems.length} gems`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching gems:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch gems from database',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get a specific gem by ID
 * GET /api/gems/:id
 */
const getGemById = async (req, res) => {
  try {
    // Ensure database connection is established (critical for serverless)
    await database.ensureConnection();
    
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid gem ID format',
          details: { providedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Find gem by ID (explicitly include inactive ones to check status)
    const gem = await Gem.findOne({ _id: id, isActive: { $in: [true, false] } }).maxTimeMS(25000);
    
    // Check if gem exists
    if (!gem) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GEM_NOT_FOUND',
          message: 'Gem not found',
          details: { requestedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if gem is active
    if (!gem.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GEM_NOT_AVAILABLE',
          message: 'Gem is not currently available',
          details: { requestedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Return successful response
    res.status(200).json({
      success: true,
      data: gem,
      message: `Gem '${gem.name}' retrieved successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching gem by ID:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch gem from database',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validation schema for creating/updating gems
 */
const gemSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Gem name is required',
    'string.min': 'Gem name must be at least 2 characters long',
    'string.max': 'Gem name cannot exceed 100 characters',
    'any.required': 'Gem name is required'
  }),
  description: Joi.string().required().min(10).max(1000).messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 1000 characters',
    'any.required': 'Description is required'
  }),
  category: Joi.string().valid('Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience').required().messages({
    'any.only': 'Category must be one of: Food, Craft, Viewpoint, Shopping, Experience',
    'any.required': 'Category is required'
  }),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required().messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),
    longitude: Joi.number().min(-180).max(180).required().messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    }),
    address: Joi.string().required().min(5).max(200).messages({
      'string.empty': 'Address is required',
      'string.min': 'Address must be at least 5 characters long',
      'string.max': 'Address cannot exceed 200 characters',
      'any.required': 'Address is required'
    })
  }).required(),
  image: Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': 'Image URL must be a valid URI',
      'any.required': 'Image URL is required'
    }),
    thumbnail: Joi.string().uri().optional().messages({
      'string.uri': 'Thumbnail URL must be a valid URI'
    }),
    alt: Joi.string().required().min(5).max(100).messages({
      'string.empty': 'Image alt text is required',
      'string.min': 'Image alt text must be at least 5 characters long',
      'string.max': 'Image alt text cannot exceed 100 characters',
      'any.required': 'Image alt text is required'
    })
  }).required(),
  contact: Joi.object({
    phone: Joi.string().optional().pattern(/^\+?[\d\s\-\(\)]+$/).messages({
      'string.pattern.base': 'Phone number format is invalid'
    }),
    whatsapp: Joi.string().optional().pattern(/^\+?[\d\s\-\(\)]+$/).messages({
      'string.pattern.base': 'WhatsApp number format is invalid'
    })
  }).optional(),
  isActive: Joi.boolean().optional().default(true)
});

/**
 * Create a new gem (Admin only)
 * POST /api/gems
 */
const createGem = async (req, res) => {
  try {
    // Ensure database connection is established (critical for serverless)
    await database.ensureConnection();
    
    // Validate request body
    const { error, value } = gemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create new gem
    const gem = new Gem(value);
    await gem.save();

    res.status(201).json({
      success: true,
      data: gem,
      message: `Gem '${gem.name}' created successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating gem:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_GEM',
          message: 'A gem with similar details already exists',
          details: process.env.NODE_ENV === 'development' ? error.keyValue : undefined
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to create gem',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update an existing gem (Admin only)
 * PUT /api/gems/:id
 */
const updateGem = async (req, res) => {
  try {
    // Ensure database connection is established (critical for serverless)
    await database.ensureConnection();
    
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid gem ID format',
          details: { providedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const { error, value } = gemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update gem
    const gem = await Gem.findByIdAndUpdate(
      id,
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!gem) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GEM_NOT_FOUND',
          message: 'Gem not found',
          details: { requestedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: gem,
      message: `Gem '${gem.name}' updated successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating gem:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_GEM',
          message: 'A gem with similar details already exists',
          details: process.env.NODE_ENV === 'development' ? error.keyValue : undefined
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update gem',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Delete a gem (Admin only)
 * DELETE /api/gems/:id
 */
const deleteGem = async (req, res) => {
  try {
    // Ensure database connection is established (critical for serverless)
    await database.ensureConnection();
    
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid gem ID format',
          details: { providedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Find and delete gem
    const gem = await Gem.findByIdAndDelete(id);

    if (!gem) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GEM_NOT_FOUND',
          message: 'Gem not found',
          details: { requestedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: { deletedGem: { id: gem._id, name: gem.name } },
      message: `Gem '${gem.name}' deleted successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting gem:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to delete gem',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getAllGems,
  getGemById,
  createGem,
  updateGem,
  deleteGem
};