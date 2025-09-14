const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Gem = require('../../models/Gem');

describe('Gem Model', () => {
  let mongoServer;

  // Valid gem data for testing
  const validGemData = {
    name: 'Floating Gardens of Dal Lake',
    description: 'Experience the unique floating gardens where locals grow vegetables on the lake. A truly authentic Kashmiri agricultural practice that has been passed down through generations.',
    category: 'Experience',
    location: {
      latitude: 34.0837,
      longitude: 74.8370,
      address: 'Dal Lake, Srinagar, Jammu and Kashmir 190001'
    },
    image: {
      url: 'https://example.com/floating-gardens.jpg',
      thumbnail: 'https://example.com/floating-gardens-thumb.jpg',
      alt: 'Floating gardens on Dal Lake'
    },
    contact: {
      phone: '+919876543210',
      whatsapp: '+919876543210'
    }
  };

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connections
    await mongoose.disconnect();
    
    // Remove all listeners to prevent memory leaks
    mongoose.connection.removeAllListeners();
    
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await Gem.deleteMany({});
  });

  describe('Schema Validation', () => {
    test('should create a valid gem with all required fields', async () => {
      const gem = new Gem(validGemData);
      const savedGem = await gem.save();

      expect(savedGem._id).toBeDefined();
      expect(savedGem.name).toBe(validGemData.name);
      expect(savedGem.description).toBe(validGemData.description);
      expect(savedGem.category).toBe(validGemData.category);
      expect(savedGem.location.latitude).toBe(validGemData.location.latitude);
      expect(savedGem.location.longitude).toBe(validGemData.location.longitude);
      expect(savedGem.location.address).toBe(validGemData.location.address);
      expect(savedGem.image.url).toBe(validGemData.image.url);
      expect(savedGem.image.alt).toBe(validGemData.image.alt);
      expect(savedGem.isActive).toBe(true);
      expect(savedGem.createdAt).toBeDefined();
      expect(savedGem.updatedAt).toBeDefined();
    });

    test('should create a gem without optional contact information', async () => {
      const gemDataWithoutContact = { ...validGemData };
      delete gemDataWithoutContact.contact;

      const gem = new Gem(gemDataWithoutContact);
      const savedGem = await gem.save();

      expect(savedGem._id).toBeDefined();
      expect(savedGem.contact).toBeDefined();
      expect(savedGem.contact.phone).toBeUndefined();
      expect(savedGem.contact.whatsapp).toBeUndefined();
    });

    test('should fail validation when name is missing', async () => {
      const invalidData = { ...validGemData };
      delete invalidData.name;

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Gem name is required');
    });

    test('should fail validation when description is missing', async () => {
      const invalidData = { ...validGemData };
      delete invalidData.description;

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Description is required');
    });

    test('should fail validation when category is invalid', async () => {
      const invalidData = { ...validGemData, category: 'InvalidCategory' };

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Category must be one of: Food, Craft, Viewpoint, Shopping, Experience');
    });

    test('should fail validation when location is missing', async () => {
      const invalidData = { ...validGemData };
      delete invalidData.location;

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Location is required');
    });

    test('should fail validation when latitude is out of range', async () => {
      const invalidData = { 
        ...validGemData, 
        location: { 
          ...validGemData.location, 
          latitude: 95 // Invalid latitude
        } 
      };

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Latitude must be between -90 and 90');
    });

    test('should fail validation when longitude is out of range', async () => {
      const invalidData = { 
        ...validGemData, 
        location: { 
          ...validGemData.location, 
          longitude: 185 // Invalid longitude
        } 
      };

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Longitude must be between -180 and 180');
    });

    test('should fail validation when image URL is invalid', async () => {
      const invalidData = { 
        ...validGemData, 
        image: { 
          ...validGemData.image, 
          url: 'not-a-valid-url' 
        } 
      };

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Please provide a valid image URL');
    });

    test('should fail validation when name is too short', async () => {
      const invalidData = { ...validGemData, name: 'A' };

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Gem name must be at least 2 characters long');
    });

    test('should fail validation when description is too short', async () => {
      const invalidData = { ...validGemData, description: 'Short' };

      const gem = new Gem(invalidData);
      
      await expect(gem.save()).rejects.toThrow('Description must be at least 10 characters long');
    });

    test('should trim whitespace from string fields', async () => {
      const dataWithWhitespace = {
        ...validGemData,
        name: '  Floating Gardens  ',
        description: '  Experience the unique floating gardens  '
      };

      const gem = new Gem(dataWithWhitespace);
      const savedGem = await gem.save();

      expect(savedGem.name).toBe('Floating Gardens');
      expect(savedGem.description).toBe('Experience the unique floating gardens');
    });

    test('should capitalize category properly', async () => {
      const dataWithLowercaseCategory = {
        ...validGemData,
        category: 'food'
      };

      const gem = new Gem(dataWithLowercaseCategory);
      const savedGem = await gem.save();

      expect(savedGem.category).toBe('Food');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test gems with different categories
      const testGems = [
        { ...validGemData, name: 'Food Gem', category: 'Food' },
        { ...validGemData, name: 'Craft Gem', category: 'Craft' },
        { ...validGemData, name: 'Viewpoint Gem', category: 'Viewpoint' },
        { ...validGemData, name: 'Inactive Gem', category: 'Food', isActive: false }
      ];

      await Gem.insertMany(testGems);
    });

    test('should find gems by category', async () => {
      const foodGems = await Gem.findByCategory('Food');
      
      expect(foodGems).toHaveLength(1); // Only active food gems
      expect(foodGems[0].category).toBe('Food');
      expect(foodGems[0].name).toBe('Food Gem');
    });

    test('should find all active gems', async () => {
      const activeGems = await Gem.findActive();
      
      expect(activeGems).toHaveLength(3); // Excluding inactive gem
      activeGems.forEach(gem => {
        expect(gem.isActive).toBe(true);
      });
    });

    test('should find gems near a location', async () => {
      const nearbyGems = await Gem.findNearLocation(34.0837, 74.8370, 1000);
      
      expect(nearbyGems.length).toBeGreaterThan(0);
      nearbyGems.forEach(gem => {
        expect(gem.isActive).toBe(true);
      });
    });
  });

  describe('Instance Methods', () => {
    test('should toggle active status', async () => {
      const gem = new Gem(validGemData);
      const savedGem = await gem.save();

      expect(savedGem.isActive).toBe(true);

      await savedGem.toggleActive();
      expect(savedGem.isActive).toBe(false);

      await savedGem.toggleActive();
      expect(savedGem.isActive).toBe(true);
    });
  });

  describe('Virtuals', () => {
    test('should provide geoLocation virtual', async () => {
      const gem = new Gem(validGemData);
      const savedGem = await gem.save();

      const geoLocation = savedGem.geoLocation;
      
      expect(geoLocation.type).toBe('Point');
      expect(geoLocation.coordinates).toEqual([
        validGemData.location.longitude,
        validGemData.location.latitude
      ]);
    });
  });

  describe('Indexes', () => {
    test('should have proper indexes created', async () => {
      const indexes = await Gem.collection.getIndexes();
      
      // Check that required indexes exist
      const indexNames = Object.keys(indexes);
      
      expect(indexNames).toContain('name_1');
      expect(indexNames).toContain('category_1');
      expect(indexNames).toContain('isActive_1');
      expect(indexNames).toContain('category_1_isActive_1');
    });
  });

  describe('Database Operations', () => {
    test('should perform CRUD operations successfully', async () => {
      // Create
      const gem = new Gem(validGemData);
      const savedGem = await gem.save();
      expect(savedGem._id).toBeDefined();

      // Read
      const foundGem = await Gem.findById(savedGem._id);
      expect(foundGem.name).toBe(validGemData.name);

      // Update
      foundGem.name = 'Updated Gem Name';
      const updatedGem = await foundGem.save();
      expect(updatedGem.name).toBe('Updated Gem Name');

      // Delete
      await Gem.findByIdAndDelete(savedGem._id);
      const deletedGem = await Gem.findById(savedGem._id);
      expect(deletedGem).toBeNull();
    });

    test('should handle bulk operations', async () => {
      const testGems = [
        { ...validGemData, name: 'Bulk Gem 1' },
        { ...validGemData, name: 'Bulk Gem 2' },
        { ...validGemData, name: 'Bulk Gem 3' }
      ];

      // Bulk insert
      const insertedGems = await Gem.insertMany(testGems);
      expect(insertedGems).toHaveLength(3);

      // Bulk update
      await Gem.updateMany(
        { name: { $regex: /^Bulk Gem/ } },
        { $set: { category: 'Viewpoint' } }
      );

      const updatedGems = await Gem.find({ name: { $regex: /^Bulk Gem/ } });
      updatedGems.forEach(gem => {
        expect(gem.category).toBe('Viewpoint');
      });

      // Bulk delete
      await Gem.deleteMany({ name: { $regex: /^Bulk Gem/ } });
      const remainingGems = await Gem.find({ name: { $regex: /^Bulk Gem/ } });
      expect(remainingGems).toHaveLength(0);
    });
  });
});