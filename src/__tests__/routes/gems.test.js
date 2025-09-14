const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const Gem = require('../../models/Gem');

describe('Gems API Endpoints', () => {
  let mongoServer;
  let testGems = [];

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connections
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear the database and create test data
    await Gem.deleteMany({});
    
    // Create test gems
    testGems = await Gem.create([
      {
        name: 'Chai Point Lal Chowk',
        description: 'A hidden gem serving the best traditional Kashmiri chai in the heart of Lal Chowk. Local favorite spot.',
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
        description: 'Watch master craftsmen create authentic Pashmina shawls using traditional techniques passed down through generations.',
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
        description: 'A lesser-known viewpoint offering breathtaking sunset views over Dal Lake, away from tourist crowds.',
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
        name: 'Inactive Gem',
        description: 'This gem is not active and should not appear in results.',
        category: 'Food',
        location: {
          latitude: 34.0500,
          longitude: 74.8000,
          address: 'Somewhere in Srinagar'
        },
        image: {
          url: 'https://example.com/inactive.jpg',
          alt: 'Inactive gem'
        },
        isActive: false
      }
    ]);
  });

  describe('GET /api/gems', () => {
    it('should return all active gems', async () => {
      const response = await request(app)
        .get('/api/gems')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3); // Only active gems
      expect(response.body.total).toBe(3);
      expect(response.body.message).toContain('Found 3 gems');
      expect(response.body.timestamp).toBeDefined();
      
      // Verify all returned gems are active
      response.body.data.forEach(gem => {
        expect(gem.isActive).toBe(true);
      });
    });

    it('should filter gems by category', async () => {
      const response = await request(app)
        .get('/api/gems?category=Food')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Food');
      expect(response.body.data[0].name).toBe('Chai Point Lal Chowk');
      expect(response.body.message).toContain('Found 1 gems in Food category');
    });

    it('should handle case-insensitive category filtering', async () => {
      const response = await request(app)
        .get('/api/gems?category=craft')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Craft');
      expect(response.body.data[0].name).toBe('Pashmina Weaver Workshop');
    });

    it('should return error for invalid category', async () => {
      const response = await request(app)
        .get('/api/gems?category=InvalidCategory')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CATEGORY');
      expect(response.body.error.message).toContain('Invalid category');
      expect(response.body.error.details.validCategories).toEqual([
        'Food', 'Craft', 'Viewpoint', 'Shopping', 'Experience'
      ]);
    });

    it('should return empty array when no gems match category', async () => {
      const response = await request(app)
        .get('/api/gems?category=Shopping')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
      expect(response.body.message).toContain('Found 0 gems in Shopping category');
    });

    it('should handle database errors gracefully', async () => {
      // Close the database connection to simulate an error
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/gems')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
      expect(response.body.error.message).toBe('Failed to fetch gems from database');

      // Reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });

  describe('GET /api/gems/:id', () => {
    it('should return a specific gem by ID', async () => {
      const testGem = testGems[0];
      
      const response = await request(app)
        .get(`/api/gems/${testGem._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testGem._id.toString());
      expect(response.body.data.name).toBe(testGem.name);
      expect(response.body.data.category).toBe(testGem.category);
      expect(response.body.message).toContain(`Gem '${testGem.name}' retrieved successfully`);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent gem ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/gems/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GEM_NOT_FOUND');
      expect(response.body.error.message).toBe('Gem not found');
      expect(response.body.error.details.requestedId).toBe(nonExistentId.toString());
    });

    it('should return 404 for inactive gem', async () => {
      const inactiveGem = testGems[3]; // The inactive gem we created
      
      const response = await request(app)
        .get(`/api/gems/${inactiveGem._id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GEM_NOT_AVAILABLE');
      expect(response.body.error.message).toBe('Gem is not currently available');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/gems/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID_FORMAT');
      expect(response.body.error.message).toBe('Invalid gem ID format');
      expect(response.body.error.details.providedId).toBe('invalid-id');
    });

    it('should handle database errors gracefully', async () => {
      const testGem = testGems[0];
      
      // Close the database connection to simulate an error
      await mongoose.connection.close();

      const response = await request(app)
        .get(`/api/gems/${testGem._id}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
      expect(response.body.error.message).toBe('Failed to fetch gem from database');

      // Reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });

  describe('API Info Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Srinagar Local Gems API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints.gems).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Protected Routes (Admin Only)', () => {
    let adminToken;

    beforeEach(async () => {
      // Get admin token for protected routes
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      adminToken = loginResponse.body.data.token;
    });

    describe('POST /api/gems', () => {
      const validGemData = {
        name: 'New Test Gem',
        description: 'A test gem created via API for testing purposes.',
        category: 'Food',
        location: {
          latitude: 34.0837,
          longitude: 74.7973,
          address: 'Test Address, Srinagar, Kashmir'
        },
        image: {
          url: 'https://example.com/test-gem.jpg',
          thumbnail: 'https://example.com/test-gem-thumb.jpg',
          alt: 'Test gem image'
        },
        contact: {
          phone: '+919876543999'
        }
      };

      it('should sanitize and trim input data', async () => {
        const dataWithWhitespace = {
          ...validGemData,
          name: '  Gem with Spaces  ',
          description: '  Description with extra spaces.  ',
          location: {
            ...validGemData.location,
            address: '  Address with spaces  '
          },
          image: {
            ...validGemData.image,
            alt: '  Alt text with spaces  '
          }
        };

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(dataWithWhitespace)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Gem with Spaces');
        expect(response.body.data.description).toBe('Description with extra spaces.');
        expect(response.body.data.location.address).toBe('Address with spaces');
        expect(response.body.data.image.alt).toBe('Alt text with spaces');
      });

      it('should create a new gem with valid admin token', async () => {
        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validGemData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(validGemData.name);
        expect(response.body.data.category).toBe(validGemData.category);
        expect(response.body.data.isActive).toBe(true);
        expect(response.body.message).toContain('created successfully');

        // Verify gem was actually created in database
        const createdGem = await Gem.findById(response.body.data._id);
        expect(createdGem).toBeTruthy();
        expect(createdGem.name).toBe(validGemData.name);
      });

      it('should fail without authorization token', async () => {
        const response = await request(app)
          .post('/api/gems')
          .send(validGemData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NO_TOKEN');
        expect(response.body.error.message).toBe('Access token is required');
      });

      it('should fail with invalid token', async () => {
        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', 'Bearer invalid_token')
          .send(validGemData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MALFORMED_TOKEN');
      });

      it('should fail with missing required fields', async () => {
        const invalidData = { ...validGemData };
        delete invalidData.name;

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Gem name is required'
            })
          ])
        );
      });

      it('should fail with invalid category', async () => {
        const invalidData = { ...validGemData, category: 'InvalidCategory' };

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              message: 'Category must be one of: Food, Craft, Viewpoint, Shopping, Experience'
            })
          ])
        );
      });

      it('should fail with invalid location coordinates', async () => {
        const invalidData = { 
          ...validGemData, 
          location: {
            ...validGemData.location,
            latitude: 91 // Invalid latitude > 90
          }
        };

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'location.latitude',
              message: 'Latitude must be between -90 and 90'
            })
          ])
        );
      });

      it('should fail with invalid image URL', async () => {
        const invalidData = { 
          ...validGemData, 
          image: {
            ...validGemData.image,
            url: 'not-a-valid-url'
          }
        };

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'image.url',
              message: 'Image URL must be a valid URI'
            })
          ])
        );
      });

      it('should fail with short description', async () => {
        const invalidData = { 
          ...validGemData, 
          description: 'Too short'
        };

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'description',
              message: 'Description must be at least 10 characters long'
            })
          ])
        );
      });

      it('should create gem with optional contact information', async () => {
        const gemWithContact = {
          ...validGemData,
          name: 'Gem with Contact',
          contact: {
            phone: '+919876543000',
            whatsapp: '+919876543000'
          }
        };

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(gemWithContact)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.contact.phone).toBe(gemWithContact.contact.phone);
        expect(response.body.data.contact.whatsapp).toBe(gemWithContact.contact.whatsapp);
      });

      it('should create gem without contact information', async () => {
        const gemWithoutContact = {
          ...validGemData,
          name: 'Gem without Contact'
        };
        delete gemWithoutContact.contact;

        const response = await request(app)
          .post('/api/gems')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(gemWithoutContact)
          .expect(201);

        expect(response.body.success).toBe(true);
        // Contact field may be undefined or empty object depending on model default
        if (response.body.data.contact) {
          expect(typeof response.body.data.contact).toBe('object');
        }
      });
    });

    describe('PUT /api/gems/:id', () => {
      const updateData = {
        name: 'Updated Gem Name',
        description: 'Updated description for the gem.',
        category: 'Craft',
        location: {
          latitude: 34.0900,
          longitude: 74.8000,
          address: 'Updated Address, Srinagar, Kashmir'
        },
        image: {
          url: 'https://example.com/updated-gem.jpg',
          thumbnail: 'https://example.com/updated-gem-thumb.jpg',
          alt: 'Updated gem image'
        }
      };

      it('should update an existing gem with valid admin token', async () => {
        const testGem = testGems[0];

        const response = await request(app)
          .put(`/api/gems/${testGem._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.category).toBe(updateData.category);
        expect(response.body.message).toContain('updated successfully');

        // Verify gem was actually updated in database
        const updatedGem = await Gem.findById(testGem._id);
        expect(updatedGem.name).toBe(updateData.name);
        expect(updatedGem.category).toBe(updateData.category);
      });

      it('should fail without authorization token', async () => {
        const testGem = testGems[0];

        const response = await request(app)
          .put(`/api/gems/${testGem._id}`)
          .send(updateData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NO_TOKEN');
      });

      it('should fail with non-existent gem ID', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .put(`/api/gems/${nonExistentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('GEM_NOT_FOUND');
      });

      it('should fail with invalid ID format', async () => {
        const response = await request(app)
          .put('/api/gems/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_ID_FORMAT');
      });

      it('should fail with invalid validation data on update', async () => {
        const testGem = testGems[0];
        const invalidUpdateData = {
          ...updateData,
          name: '' // Empty name should fail
        };

        const response = await request(app)
          .put(`/api/gems/${testGem._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidUpdateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Gem name is required'
            })
          ])
        );
      });

      it('should update gem and preserve timestamps correctly', async () => {
        const testGem = testGems[0];
        const originalCreatedAt = testGem.createdAt;

        const response = await request(app)
          .put(`/api/gems/${testGem._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(new Date(response.body.data.createdAt)).toEqual(originalCreatedAt);
        expect(new Date(response.body.data.updatedAt)).toBeInstanceOf(Date);
        expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(originalCreatedAt.getTime());
      });
    });

    describe('DELETE /api/gems/:id', () => {
      it('should delete an existing gem with valid admin token', async () => {
        const testGem = testGems[0];

        const response = await request(app)
          .delete(`/api/gems/${testGem._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedGem.id).toBe(testGem._id.toString());
        expect(response.body.data.deletedGem.name).toBe(testGem.name);
        expect(response.body.message).toContain('deleted successfully');

        // Verify gem was actually deleted from database
        const deletedGem = await Gem.findById(testGem._id);
        expect(deletedGem).toBeNull();
      });

      it('should fail without authorization token', async () => {
        const testGem = testGems[0];

        const response = await request(app)
          .delete(`/api/gems/${testGem._id}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NO_TOKEN');
      });

      it('should fail with non-existent gem ID', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app)
          .delete(`/api/gems/${nonExistentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('GEM_NOT_FOUND');
      });

      it('should fail with invalid ID format', async () => {
        const response = await request(app)
          .delete('/api/gems/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_ID_FORMAT');
      });

      it('should return correct deleted gem information', async () => {
        const testGem = testGems[1]; // Use second gem
        const originalName = testGem.name;

        const response = await request(app)
          .delete(`/api/gems/${testGem._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedGem.id).toBe(testGem._id.toString());
        expect(response.body.data.deletedGem.name).toBe(originalName);
        expect(response.body.message).toBe(`Gem '${originalName}' deleted successfully`);
        expect(response.body.timestamp).toBeDefined();

        // Verify gem is actually deleted
        const deletedGem = await Gem.findById(testGem._id);
        expect(deletedGem).toBeNull();
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(response.body.error.message).toBe('The requested endpoint does not exist');
      expect(response.body.error.details.method).toBe('GET');
      expect(response.body.error.details.path).toBe('/api/nonexistent');
    });
  });
});