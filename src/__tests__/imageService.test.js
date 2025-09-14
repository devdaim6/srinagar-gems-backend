const imageService = require('../services/imageService');
const fs = require('fs');
const path = require('path');

// Mock Backblaze B2
jest.mock('backblaze-b2');
const B2 = require('backblaze-b2');

describe('ImageService', () => {
  let mockB2Instance;

  beforeEach(() => {
    // Reset the service
    imageService.isInitialized = false;
    imageService.b2 = null;

    // Create mock B2 instance
    mockB2Instance = {
      authorize: jest.fn().mockResolvedValue({}),
      getUploadUrl: jest.fn().mockResolvedValue({
        data: {
          uploadUrl: 'https://mock-upload-url.com',
          authorizationToken: 'mock-auth-token'
        }
      }),
      uploadFile: jest.fn().mockResolvedValue({
        data: {
          fileId: 'mock-file-id',
          fileName: 'mock-file-name.jpg'
        }
      }),
      listBuckets: jest.fn().mockResolvedValue({}),
      listFileNames: jest.fn().mockResolvedValue({
        data: {
          files: [{
            fileId: 'mock-file-id',
            fileName: 'mock-file-name.jpg'
          }]
        }
      }),
      deleteFileVersion: jest.fn().mockResolvedValue({})
    };

    B2.mockImplementation(() => mockB2Instance);

    // Mock environment variables
    process.env.B2_APPLICATION_KEY_ID = 'test-key-id';
    process.env.B2_APPLICATION_KEY = 'test-key';
    process.env.B2_BUCKET_ID = 'test-bucket-id';
    process.env.B2_BUCKET_NAME = 'test-bucket';
    process.env.B2_BUCKET_URL = 'https://test-bucket.com';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid environment variables', async () => {
      await imageService.initialize();

      expect(imageService.isInitialized).toBe(true);
      expect(mockB2Instance.authorize).toHaveBeenCalled();
      expect(imageService.bucketId).toBe('test-bucket-id');
      expect(imageService.bucketName).toBe('test-bucket');
    });

    it('should throw error when required environment variables are missing', async () => {
      delete process.env.B2_APPLICATION_KEY_ID;

      await expect(imageService.initialize()).rejects.toThrow(
        'Missing required environment variable: B2_APPLICATION_KEY_ID'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await imageService.initialize();
      const firstCallCount = mockB2Instance.authorize.mock.calls.length;

      await imageService.initialize();
      const secondCallCount = mockB2Instance.authorize.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('validateImage', () => {
    it('should validate supported image formats', () => {
      const buffer = Buffer.from('fake-image-data');
      
      expect(() => imageService.validateImage(buffer, 'image/jpeg')).not.toThrow();
      expect(() => imageService.validateImage(buffer, 'image/png')).not.toThrow();
      expect(() => imageService.validateImage(buffer, 'image/webp')).not.toThrow();
    });

    it('should reject unsupported image formats', () => {
      const buffer = Buffer.from('fake-image-data');
      
      expect(() => imageService.validateImage(buffer, 'image/gif')).toThrow(
        'Unsupported image format'
      );
    });

    it('should reject files that are too large', () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      expect(() => imageService.validateImage(largeBuffer, 'image/jpeg')).toThrow(
        'File size exceeds maximum limit'
      );
    });

    it('should reject empty buffers', () => {
      const emptyBuffer = Buffer.alloc(0);
      
      expect(() => imageService.validateImage(emptyBuffer, 'image/jpeg')).toThrow(
        'Invalid image file: empty buffer'
      );
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extensions for MIME types', () => {
      expect(imageService.getFileExtension('image/jpeg')).toBe('jpeg');
      expect(imageService.getFileExtension('image/png')).toBe('png');
      expect(imageService.getFileExtension('image/webp')).toBe('webp');
    });

    it('should return default extension for unknown MIME types', () => {
      expect(imageService.getFileExtension('unknown/type')).toBe('jpg');
    });
  });

  describe('uploadToB2', () => {
    beforeEach(async () => {
      await imageService.initialize();
    });

    it('should upload file to B2 successfully', async () => {
      const buffer = Buffer.from('test-image-data');
      const fileName = 'test-image.jpg';
      const mimeType = 'image/jpeg';

      const result = await imageService.uploadToB2(buffer, fileName, mimeType);

      expect(mockB2Instance.getUploadUrl).toHaveBeenCalledWith({
        bucketId: 'test-bucket-id'
      });
      expect(mockB2Instance.uploadFile).toHaveBeenCalledWith({
        uploadUrl: 'https://mock-upload-url.com',
        uploadAuthToken: 'mock-auth-token',
        fileName: fileName,
        data: buffer,
        mime: mimeType,
        info: {
          'src_last_modified_millis': expect.any(String)
        }
      });
      expect(result).toBe('https://test-bucket.com/test-image.jpg');
    });

    it('should handle B2 upload errors', async () => {
      mockB2Instance.uploadFile.mockRejectedValue(new Error('Upload failed'));

      const buffer = Buffer.from('test-image-data');
      const fileName = 'test-image.jpg';
      const mimeType = 'image/jpeg';

      await expect(imageService.uploadToB2(buffer, fileName, mimeType))
        .rejects.toThrow('B2 upload failed: Upload failed');
    });
  });

  describe('deleteFromB2', () => {
    beforeEach(async () => {
      await imageService.initialize();
    });

    it('should delete file from B2 successfully', async () => {
      const fileName = 'test-image.jpg';
      
      // Mock the response to include the file
      mockB2Instance.listFileNames.mockResolvedValue({
        data: {
          files: [{
            fileId: 'mock-file-id',
            fileName: fileName
          }]
        }
      });

      await imageService.deleteFromB2(fileName);

      expect(mockB2Instance.listFileNames).toHaveBeenCalledWith({
        bucketId: 'test-bucket-id',
        startFileName: fileName,
        maxFileCount: 1
      });
      expect(mockB2Instance.deleteFileVersion).toHaveBeenCalledWith({
        fileId: 'mock-file-id',
        fileName: fileName
      });
    });

    it('should handle file not found gracefully', async () => {
      mockB2Instance.listFileNames.mockResolvedValue({
        data: { files: [] }
      });

      const fileName = 'non-existent-file.jpg';

      // Should not throw error
      await expect(imageService.deleteFromB2(fileName)).resolves.toBeUndefined();
      expect(mockB2Instance.deleteFileVersion).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is working', async () => {
      const health = await imageService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.initialized).toBe(true);
      expect(health.bucketName).toBe('test-bucket');
      expect(health.supportedFormats).toEqual(['image/jpeg', 'image/png', 'image/webp']);
      expect(mockB2Instance.listBuckets).toHaveBeenCalled();
    });

    it('should return unhealthy status when B2 connection fails', async () => {
      mockB2Instance.listBuckets.mockRejectedValue(new Error('Connection failed'));

      const health = await imageService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Connection failed');
    });
  });
});