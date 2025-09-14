const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes and database
const apiRoutes = require('./routes');
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*'
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Srinagar Local Gems API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', apiRoutes);

// Handle 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist',
      details: { 
        method: req.method,
        path: req.originalUrl 
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// Start server only if this file is run directly (not imported)
if (require.main === module) {
  // For traditional deployment (not serverless)
  database.connect().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Srinagar Local Gems API server running on port ${PORT}`);
    });
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // For serverless deployment (Vercel, AWS Lambda, etc.)
  // Don't pre-connect to database, let each request handle its own connection
  console.log('🔧 Running in serverless mode - connections handled per request');
}

module.exports = app;