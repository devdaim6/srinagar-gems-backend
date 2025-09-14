const request = require('supertest');
const express = require('express');
const imageRoutes = require('../routes/images');
const imageService = require('../services/imageService');

// Mock the image service
jest.mock('../services/imageService');

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'admin-id', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.use('/api/images', imageRoutes);

describe('Image Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/images/upload', () => {
    it('should upload image successfully', async () => {
      const mockResult = {
        data: {
          id: 'test-uuid',
          urls: {
            thumbnail: 'https://example.com/thumb.jpg',
            medium: 'https://example.com/medium.jpg',
            large: 'https://example.com/large.jpg',
            original: 'https://example.com/original.jpg'
          },
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          uploadedAt: '2023-01-01T00:00:00.000Z'
        }
      };

      imageService.uploadImage.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/images/upload')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult.data);
      expect(response.body.message).toBe('Image uploaded successfully');
      expect(imageService.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.jpg',
        'image/jpeg'
      );
    });

    it('should return error when no file is provided', async () => {
      const response = await request(app)
        .post('/api/images/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
      expect(response.body.error.message).toBe('No image file provided');
    });

    it('should handle upload service errors', async () => {
      imageService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/images/upload')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_FAILED');
      expect(response.body.error.message).toBe('Upload failed');
    });
  });

  describe('DELETE /api/images/:fileId', () => {
    it('should delete image successfully', async () => {
      imageService.deleteImage.mockResolvedValue(true);

      const fileId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/images/${fileId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Image deleted successfully');
      expect(imageService.deleteImage).toHaveBeenCalledWith(fileId);
    });

    it('should return error for invalid file ID format', async () => {
      const response = await request(app)
        .delete('/api/images/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_ID');
      expect(response.body.error.message).toBe('Invalid file ID format');
    });

    it('should handle deletion failure', async () => {
      imageService.deleteImage.mockResolvedValue(false);

      const fileId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/images/${fileId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DELETE_FAILED');
    });
  });

  describe('POST /api/images/metadata', () => {
    it('should return image metadata successfully', async () => {
      const mockMetadata = {
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 102400,
        hasAlpha: false,
        channels: 3
      };

      imageService.validateImage.mockImplementation(() => {});
      imageService.getImageMetadata.mockResolvedValue(mockMetadata);

      const response = await request(app)
        .post('/api/images/metadata')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...mockMetadata,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg'
      });
      expect(response.body.message).toBe('Image metadata retrieved successfully');
    });

    it('should return error when no file is provided', async () => {
      const response = await request(app)
        .post('/api/images/metadata')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });

    it('should handle validation errors', async () => {
      imageService.validateImage.mockImplementation(() => {
        throw new Error('Invalid image format');
      });

      const response = await request(app)
        .post('/api/images/metadata')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('METADATA_ERROR');
      expect(response.body.error.message).toBe('Invalid image format');
    });
  });

  describe('GET /api/images/health', () => {
    it('should return healthy status', async () => {
      const mockHealth = {
        status: 'healthy',
        initialized: true,
        bucketName: 'test-bucket',
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        maxFileSize: '10MB',
        imageSizes: ['thumbnail', 'medium', 'large', 'original']
      };

      imageService.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/images/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHealth);
      expect(response.body.message).toBe('Image service is healthy');
    });

    it('should return unhealthy status', async () => {
      const mockHealth = {
        status: 'unhealthy',
        error: 'Connection failed',
        initialized: false
      };

      imageService.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/images/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data).toEqual(mockHealth);
      expect(response.body.message).toBe('Image service is unhealthy');
    });

    it('should handle health check errors', async () => {
      imageService.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/images/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('HEALTH_CHECK_FAILED');
    });
  });
});