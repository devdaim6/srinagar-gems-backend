const GemRequest = require('../models/GemRequest');
const Gem = require('../models/Gem');
const Joi = require('joi');

/**
 * Submit a new gem request from mobile users
 * POST /api/gems/request
 */
const submitGemRequest = async (req, res) => {
  try {
    // Validation schema for gem requests
    const requestSchema = Joi.object({
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
      }).optional()
    });

    // Validate request body
    const { error, value } = requestSchema.validate(req.body);
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

    // Create new gem request
    const gemRequest = new GemRequest(value);
    await gemRequest.save();

    res.status(201).json({
      success: true,
      data: gemRequest,
      message: `Gem request '${gemRequest.name}' submitted successfully and is pending review`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error submitting gem request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to submit gem request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all gem requests for admin review
 * GET /api/gems/requests
 */
const getAllGemRequests = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    // Build query object
    let query = {};
    
    // Add status filter if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    
    // Add category filter if provided
    if (category) {
      const validCategories = ['Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience'];
      const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      
      if (validCategories.includes(normalizedCategory)) {
        query.category = normalizedCategory;
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch requests with pagination
    const requests = await GemRequest.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('approvedGemId', 'name _id');
    
    // Get total count for pagination
    const total = await GemRequest.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      message: `Found ${requests.length} gem requests`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching gem requests:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch gem requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Approve a gem request and create actual gem
 * PUT /api/gems/requests/:id/approve
 */
const approveGemRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid request ID format',
          details: { providedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Find the request
    const gemRequest = await GemRequest.findById(id);
    
    if (!gemRequest) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Gem request not found',
          details: { requestedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (gemRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REQUEST_ALREADY_REVIEWED',
          message: `Request has already been ${gemRequest.status}`,
          details: { currentStatus: gemRequest.status }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Create the actual gem
    const newGem = new Gem({
      name: gemRequest.name,
      description: gemRequest.description,
      category: gemRequest.category,
      location: gemRequest.location,
      image: gemRequest.image,
      contact: gemRequest.contact,
      isActive: true
    });
    
    await newGem.save();
    
    // Update the request status
    gemRequest.status = 'approved';
    gemRequest.reviewedBy = req.user?.username || 'admin'; // Assuming user info is in req.user
    gemRequest.reviewedAt = new Date();
    gemRequest.reviewNotes = reviewNotes;
    gemRequest.approvedGemId = newGem._id;
    
    await gemRequest.save();
    
    res.status(200).json({
      success: true,
      data: {
        request: gemRequest,
        createdGem: newGem
      },
      message: `Gem request approved and '${newGem.name}' has been added to the system`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error approving gem request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to approve gem request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Reject a gem request
 * PUT /api/gems/requests/:id/reject
 */
const rejectGemRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid request ID format',
          details: { providedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Find the request
    const gemRequest = await GemRequest.findById(id);
    
    if (!gemRequest) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Gem request not found',
          details: { requestedId: id }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (gemRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REQUEST_ALREADY_REVIEWED',
          message: `Request has already been ${gemRequest.status}`,
          details: { currentStatus: gemRequest.status }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Update the request status
    gemRequest.status = 'rejected';
    gemRequest.reviewedBy = req.user?.username || 'admin';
    gemRequest.reviewedAt = new Date();
    gemRequest.reviewNotes = reviewNotes || 'No reason provided';
    
    await gemRequest.save();
    
    res.status(200).json({
      success: true,
      data: gemRequest,
      message: `Gem request '${gemRequest.name}' has been rejected`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error rejecting gem request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to reject gem request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get a specific gem request by ID
 * GET /api/gem-requests/:id
 */
const getGemRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid gem request ID format'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Find gem request by ID
    const gemRequest = await GemRequest.findById(id);

    if (!gemRequest) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Gem request not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: gemRequest,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching gem request:', error);

    // Handle mongoose cast error
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid gem request ID format'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch gem request'
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  submitGemRequest,
  getAllGemRequests,
  getGemRequestById,
  approveGemRequest,
  rejectGemRequest
};