const mongoose = require('mongoose');
const Gem = require('../models/Gem');
const database = require('../config/database');

const sampleGems = [
  {
    name: 'Chai Point Lal Chowk',
    description: 'A hidden gem serving the best traditional Kashmiri chai in the heart of Lal Chowk. Local favorite spot where you can experience authentic Kashmiri hospitality.',
    category: 'Food',
    location: {
      latitude: 34.0837,
      longitude: 74.7973,
      address: 'Near Lal Chowk, Srinagar, Kashmir 190001'
    },
    image: {
      url: 'https://example.com/chai-point.jpg',
      thumbnail: 'https://example.com/chai-point-thumb.jpg',
      alt: 'Traditional Kashmiri chai being served'
    },
    contact: {
      phone: '+919876543210'
    },
    isActive: true
  },
  {
    name: 'Pashmina Weaver Workshop',
    description: 'Watch master craftsmen create authentic Pashmina shawls using traditional techniques passed down through generations. A must-visit for understanding Kashmir\'s rich textile heritage.',
    category: 'Craft',
    location: {
      latitude: 34.0912,
      longitude: 74.8056,
      address: 'Old City, Srinagar, Kashmir 190002'
    },
    image: {
      url: 'https://example.com/pashmina-workshop.jpg',
      thumbnail: 'https://example.com/pashmina-workshop-thumb.jpg',
      alt: 'Artisan weaving Pashmina shawl on traditional loom'
    },
    contact: {
      phone: '+919876543211',
      whatsapp: '+919876543211'
    },
    isActive: true
  },
  {
    name: 'Secret Sunset Point',
    description: 'A lesser-known viewpoint offering breathtaking sunset views over Dal Lake, away from tourist crowds. Perfect for photography and peaceful moments.',
    category: 'Viewpoint',
    location: {
      latitude: 34.1015,
      longitude: 74.8467,
      address: 'Near Nishat Bagh, Srinagar, Kashmir 190006'
    },
    image: {
      url: 'https://example.com/sunset-point.jpg',
      thumbnail: 'https://example.com/sunset-point-thumb.jpg',
      alt: 'Beautiful sunset view over Dal Lake'
    },
    isActive: true
  },
  {
    name: 'Local Spice Market',
    description: 'Experience the aromatic world of Kashmiri spices at this traditional market. Local vendors offer the finest saffron, cardamom, and other exotic spices.',
    category: 'Shopping',
    location: {
      latitude: 34.0889,
      longitude: 74.7994,
      address: 'Maharaj Gunj, Srinagar, Kashmir 190001'
    },
    image: {
      url: 'https://example.com/spice-market.jpg',
      thumbnail: 'https://example.com/spice-market-thumb.jpg',
      alt: 'Colorful display of Kashmiri spices'
    },
    contact: {
      phone: '+919876543212'
    },
    isActive: true
  },
  {
    name: 'Traditional Houseboat Experience',
    description: 'Stay overnight in a traditional Kashmiri houseboat on Dal Lake. Experience the unique lifestyle and hospitality of local houseboat families.',
    category: 'Experience',
    location: {
      latitude: 34.1083,
      longitude: 74.8306,
      address: 'Dal Lake, Srinagar, Kashmir 190001'
    },
    image: {
      url: 'https://example.com/houseboat.jpg',
      thumbnail: 'https://example.com/houseboat-thumb.jpg',
      alt: 'Traditional Kashmiri houseboat on Dal Lake'
    },
    contact: {
      phone: '+919876543213',
      whatsapp: '+919876543213'
    },
    isActive: true
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await database.connect();
    
    // Clear existing gems
    await Gem.deleteMany({});
    console.log('🗑️ Cleared existing gems');
    
    // Insert sample gems
    const createdGems = await Gem.create(sampleGems);
    console.log(`✅ Created ${createdGems.length} sample gems`);
    
    // Display created gems
    createdGems.forEach((gem, index) => {
      console.log(`${index + 1}. ${gem.name} (${gem.category}) - ID: ${gem._id}`);
    });
    
    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Disconnect from database
    await database.disconnect();
    process.exit(0);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { sampleGems, seedDatabase };