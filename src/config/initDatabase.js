const mongoose = require('mongoose');
const Gem = require('../models/Gem');

/**
 * Initialize database with required indexes and configurations
 */
async function initDatabase() {
  try {
    console.log('🔧 Initializing database...');

    // Ensure all indexes are created
    await Gem.createIndexes();
    console.log('✅ Database indexes created successfully');

    // Create 2dsphere index for geospatial queries if needed
    try {
      await Gem.collection.createIndex(
        { 'location': '2dsphere' },
        { background: true }
      );
      console.log('✅ Geospatial index created successfully');
    } catch (error) {
      // Index might already exist, which is fine
      if (!error.message.includes('already exists')) {
        console.warn('⚠️ Warning creating geospatial index:', error.message);
      }
    }

    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = { initDatabase };