const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

// Hardcoded admin credentials for simplicity
// In production, this would be stored in a database with proper user management
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123', // This should be hashed in production
  role: 'admin'
};

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required',
    'any.required': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
    }
  );
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin user and return JWT token
 * @access  Public
 */
const login = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
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

    const { username, password } = value;

    // Check if username matches admin credentials
    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        },
        timestamp: new Date().toISOString()
      });
    }

    // For development, we'll do a simple string comparison
    // In production, you would hash the stored password and compare with bcrypt
    const isPasswordValid = password === ADMIN_CREDENTIALS.password;
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Generate JWT token
    const token = generateToken(ADMIN_CREDENTIALS);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          username: ADMIN_CREDENTIALS.username,
          role: ADMIN_CREDENTIALS.role
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during login'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
const refreshToken = async (req, res) => {
  try {
    // The user is already authenticated via middleware
    const user = req.user;

    // Generate new token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          username: user.username,
          role: user.role
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      },
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during token refresh'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // Since JWT is stateless, logout is handled client-side by removing the token
    // This endpoint exists for consistency and potential future token blacklisting
    res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from client storage.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during logout'
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};