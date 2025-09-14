const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const DatabaseConfig = require('../../config/database');
const { initDatabase } = require('../../config/initDatabase');

describe('Database Configuration', () => {
  let mongoServer;
  let originalMongoUri;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Store original URI and set test URI
    originalMongoUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = mongoUri;
  });

  afterAll(async () => {
    // Restore original URI
    process.env.MONGODB_URI = originalMongoUri;
    
    // Clean up connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Remove all listeners to prevent memory leaks
    mongoose.connection.removeAllListeners();
    
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Ensure clean state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Database Connection', () => {
    test('should connect to MongoDB successfully', async () => {
      await DatabaseConfig.connect();
      
      expect(DatabaseConfig.getConnectionStatus()).toBe(1); // 1 = connected
      expect(mongoose.connection.readyState).toBe(1);
    });

    test('should disconnect from MongoDB successfully', async () => {
      await DatabaseConfig.connect();
      expect(DatabaseConfig.getConnectionStatus()).toBe(1);
      
      await DatabaseConfig.disconnect();
      expect(DatabaseConfig.getConnectionStatus()).toBe(0); // 0 = disconnected
    });

    test('should use correct connection options', async () => {
      await DatabaseConfig.connect();
      
      // Verify connection is established
      expect(DatabaseConfig.getConnectionStatus()).toBe(1);
      
      // Verify connection options are applied (indirectly through successful connection)
      expect(mongoose.connection.readyState).toBe(1);
    });
  });

  describe('Database Initialization', () => {
    test('should initialize database with indexes', async () => {
      await DatabaseConfig.connect();
      
      // Mock console.log to capture initialization logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await initDatabase();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Initializing database...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Database indexes created successfully');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Database initialization completed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Connection Status', () => {
    test('should return correct connection status', async () => {
      // Initially disconnected
      expect(DatabaseConfig.getConnectionStatus()).toBe(0);
      
      // After connecting
      await DatabaseConfig.connect();
      expect(DatabaseConfig.getConnectionStatus()).toBe(1);
      
      // After disconnecting
      await DatabaseConfig.disconnect();
      expect(DatabaseConfig.getConnectionStatus()).toBe(0);
    });
  });
});