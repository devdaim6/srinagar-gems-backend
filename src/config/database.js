const mongoose = require('mongoose');

// Global connection promise to prevent multiple connections
let cachedConnection = null;

/**
 * MongoDB connection configuration optimized for serverless environments
 */
class DatabaseConfig {
  constructor() {
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/srinagar_gems';
    this.listenersSetup = false;
    this.options = {
      // Optimized for serverless environments
      maxPoolSize: 5, // Reduce pool size for serverless
      serverSelectionTimeoutMS: 30000, // Increase timeout for cold starts
      socketTimeoutMS: 30000, // Increase socket timeout
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      // Additional options for better serverless performance
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 30000,
    };
  }

  /**
   * Connect to MongoDB with serverless optimization
   * Reuses existing connections when possible
   */
  async connect() {
    // Return existing connection if it's already established
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('♻️ Reusing existing MongoDB connection');
      return cachedConnection;
    }

    // If connection is in progress, wait for it
    if (cachedConnection) {
      console.log('⏳ Waiting for MongoDB connection...');
      return cachedConnection;
    }

    try {
      // Only set up event listeners once
      if (!this.listenersSetup) {
        this.setupEventListeners();
        this.listenersSetup = true;
      }

      console.log('🔌 Establishing new MongoDB connection...');
      
      // Create new connection promise
      cachedConnection = mongoose.connect(this.connectionString, this.options);
      
      // Wait for connection to establish
      await cachedConnection;
      
      console.log('✅ Connected to MongoDB successfully');
      return cachedConnection;

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      cachedConnection = null; // Clear failed connection
      
      // In serverless, we should throw the error instead of exiting
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        throw error;
      } else {
        process.exit(1);
      }
    }
  }

  /**
   * Ensure connection is established before database operations
   * Use this method before any database operation in serverless functions
   */
  async ensureConnection() {
    if (mongoose.connection.readyState !== 1) {
      await this.connect();
    }
    return mongoose.connection;
  }

  /**
   * Setup connection event listeners optimized for serverless
   */
  setupEventListeners() {
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      cachedConnection = null; // Clear cached connection on error
    });

    mongoose.connection.on('disconnected', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('⚠️ MongoDB disconnected');
        cachedConnection = null; // Clear cached connection on disconnect
      }
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Handle serverless function cleanup
    process.on('SIGINT', async () => {
      await this.disconnect();
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
    });
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
      }
      cachedConnection = null;
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      cachedConnection = null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return mongoose.connection.readyState;
  }

  /**
   * Check if connection is ready
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get connection info for debugging
   */
  getConnectionInfo() {
    return {
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      hasCachedConnection: !!cachedConnection
    };
  }
}

module.exports = new DatabaseConfig();