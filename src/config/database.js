const mongoose = require('mongoose');

/**
 * MongoDB connection configuration
 */
class DatabaseConfig {
  constructor() {
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/srinagar_gems';
    this.listenersSetup = false;
    this.options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      // Only set up event listeners once
      if (!this.listenersSetup) {
        this.setupEventListeners();
        this.listenersSetup = true;
      }

      await mongoose.connect(this.connectionString, this.options);
      console.log('✅ Connected to MongoDB successfully');

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('⚠️ MongoDB disconnected');
      }
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return mongoose.connection.readyState;
  }
}

module.exports = new DatabaseConfig();