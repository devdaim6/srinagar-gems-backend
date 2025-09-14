const B2 = require('backblaze-b2');
const sharp = require('sharp');
const mime = require('mime-types');
const crypto = require('crypto');

// Generate UUID v4 using crypto
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Image service for handling uploads, optimization, and storage with Backblaze B2
 */
class ImageService {
  constructor() {
    this.b2 = null;
    this.bucketId = null;
    this.bucketName = null;
    this.isInitialized = false;
    
    // Image size configurations
    this.imageSizes = {
      thumbnail: { width: 150, height: 150, quality: 80 },
      medium: { width: 400, height: 300, quality: 85 },
      large: { width: 800, height: 600, quality: 90 },
      original: { quality: 95 }
    };
    
    // Supported image formats
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Initialize Backblaze B2 connection
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Validate required environment variables
      const requiredEnvVars = [
        'B2_APPLICATION_KEY_ID',
        'B2_APPLICATION_KEY',
        'B2_BUCKET_ID',
        'B2_BUCKET_NAME'
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }

      // Initialize B2 client
      this.b2 = new B2({
        applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
        applicationKey: process.env.B2_APPLICATION_KEY
      });

      // Authorize with B2
      await this.b2.authorize();
      
      this.bucketId = process.env.B2_BUCKET_ID;
      this.bucketName = process.env.B2_BUCKET_NAME;
      this.isInitialized = true;

      console.log('Image service initialized successfully with Backblaze B2');
    } catch (error) {
      console.error('Failed to initialize image service:', error.message);
      throw new Error(`Image service initialization failed: ${error.message}`);
    }
  }

  /**
   * Upload and process image with multiple sizes
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - Image MIME type
   * @returns {Object} Image URLs for different sizes
   */
  async uploadImage(imageBuffer, originalName, mimeType) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate image
      this.validateImage(imageBuffer, mimeType);

      // Generate unique filename
      const fileId = generateUUID();
      const extension = this.getFileExtension(mimeType);
      const baseFileName = `${fileId}.${extension}`;

      // Process and upload different sizes
      const uploadPromises = [];
      const imageUrls = {};

      // Process each size
      for (const [sizeName, config] of Object.entries(this.imageSizes)) {
        const processedBuffer = await this.processImage(imageBuffer, config, mimeType);
        const fileName = sizeName === 'original' ? baseFileName : `${fileId}_${sizeName}.${extension}`;
        
        uploadPromises.push(
          this.uploadToB2(processedBuffer, fileName, mimeType)
            .then(url => {
              imageUrls[sizeName] = url;
            })
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      return {
        success: true,
        data: {
          id: fileId,
          urls: imageUrls,
          originalName,
          mimeType,
          uploadedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Image upload failed:', error.message);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Process image with Sharp
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {Object} config - Size and quality configuration
   * @param {string} mimeType - Image MIME type
   * @returns {Buffer} Processed image buffer
   */
  async processImage(imageBuffer, config, mimeType) {
    try {
      let sharpInstance = sharp(imageBuffer);

      // Resize if dimensions are specified
      if (config.width && config.height) {
        sharpInstance = sharpInstance.resize(config.width, config.height, {
          fit: 'cover',
          position: 'center'
        });
      }

      // Apply format-specific processing
      switch (mimeType) {
        case 'image/jpeg':
          return await sharpInstance
            .jpeg({ quality: config.quality, progressive: true })
            .toBuffer();
        
        case 'image/png':
          return await sharpInstance
            .png({ quality: config.quality, progressive: true })
            .toBuffer();
        
        case 'image/webp':
          return await sharpInstance
            .webp({ quality: config.quality })
            .toBuffer();
        
        default:
          // Default to JPEG for unsupported formats
          return await sharpInstance
            .jpeg({ quality: config.quality, progressive: true })
            .toBuffer();
      }
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Backblaze B2
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} fileName - Name for the file in B2
   * @param {string} mimeType - File MIME type
   * @returns {string} Public URL of uploaded file
   */
  async uploadToB2(fileBuffer, fileName, mimeType) {
    try {
      // Get upload URL
      const uploadUrlResponse = await this.b2.getUploadUrl({
        bucketId: this.bucketId
      });

      // Upload file
      const uploadResponse = await this.b2.uploadFile({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        uploadAuthToken: uploadUrlResponse.data.authorizationToken,
        fileName: fileName,
        data: fileBuffer,
        mime: mimeType,
        info: {
          'src_last_modified_millis': Date.now().toString()
        }
      });

      // Construct public URL
      const baseUrl = process.env.B2_BUCKET_URL || 
        `https://f${this.b2.accountId}.backblazeb2.com/file/${this.bucketName}`;
      
      return `${baseUrl}/${fileName}`;

    } catch (error) {
      throw new Error(`B2 upload failed: ${error.message}`);
    }
  }

  /**
   * Get image from B2 bucket
   * @param {string} filename - Image filename
   * @returns {Object} Image data with buffer and metadata
   */
  async getImage(filename) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Download file from B2
      const downloadResponse = await this.b2.downloadFileByName({
        bucketName: this.bucketName,
        fileName: filename
      });

      return {
        body: downloadResponse.data,
        contentType: downloadResponse.headers['content-type'] || 'image/jpeg',
        contentLength: downloadResponse.headers['content-length'],
        etag: downloadResponse.headers['etag']
      };

    } catch (error) {
      console.error(`Failed to get image ${filename}:`, error.message);
      return null;
    }
  }

  /**
   * Delete image from B2 (all sizes)
   * @param {string} fileId - Image file ID
   * @returns {boolean} Success status
   */
  async deleteImage(fileId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const deletePromises = [];
      
      // Delete all size variants
      for (const sizeName of Object.keys(this.imageSizes)) {
        const fileName = sizeName === 'original' 
          ? `${fileId}.jpg` // Assume jpg for original, could be enhanced
          : `${fileId}_${sizeName}.jpg`;
        
        deletePromises.push(this.deleteFromB2(fileName));
      }

      await Promise.allSettled(deletePromises);
      return true;

    } catch (error) {
      console.error('Image deletion failed:', error.message);
      return false;
    }
  }

  /**
   * Delete specific file from B2
   * @param {string} fileName - File name to delete
   */
  async deleteFromB2(fileName) {
    try {
      // List files to get file ID
      const listResponse = await this.b2.listFileNames({
        bucketId: this.bucketId,
        startFileName: fileName,
        maxFileCount: 1
      });

      const file = listResponse.data.files.find(f => f.fileName === fileName);
      if (file) {
        await this.b2.deleteFileVersion({
          fileId: file.fileId,
          fileName: fileName
        });
      }
    } catch (error) {
      console.error(`Failed to delete file ${fileName}:`, error.message);
    }
  }

  /**
   * Validate image file
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} mimeType - Image MIME type
   */
  validateImage(imageBuffer, mimeType) {
    // Check file size
    if (imageBuffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (!this.supportedFormats.includes(mimeType)) {
      throw new Error(`Unsupported image format. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Validate buffer is not empty
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image file: empty buffer');
    }
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimeType - Image MIME type
   * @returns {string} File extension
   */
  getFileExtension(mimeType) {
    const extension = mime.extension(mimeType);
    return extension || 'jpg';
  }

  /**
   * Get image metadata
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Object} Image metadata
   */
  async getImageMetadata(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Health check for the service
   * @returns {Object} Service status
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Test B2 connection
      await this.b2.listBuckets();

      return {
        status: 'healthy',
        initialized: this.isInitialized,
        bucketName: this.bucketName,
        supportedFormats: this.supportedFormats,
        maxFileSize: `${this.maxFileSize / (1024 * 1024)}MB`,
        imageSizes: Object.keys(this.imageSizes)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        initialized: this.isInitialized
      };
    }
  }
}

// Export singleton instance
module.exports = new ImageService();