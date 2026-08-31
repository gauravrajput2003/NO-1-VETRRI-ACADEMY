const cloudinaryService = require('./cloudinaryService');
const s3Service = require('./s3Service');
const fs = require('fs');

/**
 * Concurrency Limiter (Pure JS Semaphore)
 * Caps simultaneous outbound uploads to cloud providers (max 6 by default)
 * preventing CPU/bandwidth saturation on Render free tier under concurrent teacher uploads.
 * Excess requests queue in memory and resolve in order.
 */
class ConcurrencyLimiter {
  constructor(concurrency = 6) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    if (this.running >= this.concurrency) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

const uploadLimiter = new ConcurrencyLimiter(
  process.env.MAX_CONCURRENT_UPLOADS ? parseInt(process.env.MAX_CONCURRENT_UPLOADS, 10) : 6
);
   
/**
 * PRODUCTION-READY StorageService
 * 
 * Abstraction layer for managing file storage across multiple providers.
 * Supports Cloudinary (primary) and S3 (fallback).
 * 
 * Usage:
 * - For memory storage: uploadFileFromBuffer()
 * - For disk storage: uploadFileFromDisk() (auto-cleanup, streaming)
 * - For downloads: getDownloadUrl()
 */
class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'cloudinary';
  }

  getService(type = this.storageType) {
    if (type === 's3') return s3Service;
    return cloudinaryService;
  }

  /**
   * Upload file from buffer (for memory storage uploads)
   * Protected by concurrency limiter
   * @param {Buffer} buffer - File buffer from multer
   * @param {string} mimetype - MIME type
   * @param {string} originalname - Original filename
   * @param {string} folder - Folder path in cloud storage
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadFileFromBuffer(buffer, mimetype, originalname, folder = 'materials', options = {}) {
    return uploadLimiter.run(async () => {
      const service = this.getService();
      
      if (service === cloudinaryService) {
        return await cloudinaryService.uploadFileFromBuffer(
          buffer,
          mimetype,
          originalname,
          folder,
          options
        );
      }
      
      // Fallback for S3 or other storage services
      return await service.uploadFile(buffer, mimetype, folder, { ...options, originalName: originalname });
    });
  }

  /**
   * Upload file from disk (for disk storage uploads)
   * Streams directly to storage provider with zero full-buffer RAM retention.
   * Protected by concurrency limiter.
   * Automatically cleans up temp file after upload.
   * @param {string} filePath - Path to temp file on disk
   * @param {string} mimetype - MIME type
   * @param {string} originalname - Original filename
   * @param {string} folder - Folder path in cloud storage
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadFileFromDisk(filePath, mimetype, originalname, folder = 'materials', options = {}) {
    return uploadLimiter.run(async () => {
      const service = this.getService();
      
      if (service === cloudinaryService) {
        // Stream directly from disk to Cloudinary
        return await cloudinaryService.uploadFileFromDisk(
          filePath,
          mimetype,
          originalname,
          folder,
          options
        );
      }
      
      // For S3, stream directly from disk (no readFileSync)
      if (typeof service.uploadFileFromDisk === 'function') {
        return await service.uploadFileFromDisk(
          filePath,
          mimetype,
          originalname,
          folder,
          options
        );
      }

      // Safe fallback if provider doesn't have uploadFileFromDisk
      try {
        const buffer = fs.readFileSync(filePath);
        const result = await service.uploadFile(buffer, mimetype, folder, { ...options, originalName: originalname });
        
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error(`[Storage] Failed to clean up: ${filePath}`, err.message);
          });
        }
        
        return result;
      } catch (error) {
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error(`[Storage] Failed to clean up on error: ${filePath}`, err.message);
          });
        }
        throw error;
      }
    });
  }

  /**
   * Legacy method for backwards compatibility
   * Detects whether buffer or file path and routes accordingly
   */
  async uploadFile(buffer, mimetype, folder = 'materials', options = {}) {
    return await this.uploadFileFromBuffer(buffer, mimetype, options.originalName || '', folder, options);
  }

  /**
   * Delete file from storage
   * @param {string} publicId - Public ID or file identifier
   * @param {string} storageType - Storage type (cloudinary, s3)
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<boolean>} Success flag
   */
  async deleteFile(publicId, storageType, resourceType = 'raw') {
    const resourceTypes = ['image', 'video', 'raw'];
    let resolvedStorageType = storageType;
    let resolvedResourceType = resourceType;

    if (resourceTypes.includes(storageType) && resourceType === 'raw') {
      resolvedStorageType = this.storageType;
      resolvedResourceType = storageType;
    }

    const service = this.getService(resolvedStorageType || this.storageType);
    return await service.deleteFile(publicId, resolvedResourceType);
  }

  /**
   * Get download URL with proper filename and extension
   * @param {string} fileUrl - Original file URL
   * @param {string} storageType - Storage type
   * @param {Object} metadata - File metadata object
   * @param {string} metadata.publicId - Public ID
   * @param {string} metadata.originalFilename - Original filename with extension
   * @param {string} metadata.extension - File extension
   * @param {boolean} forceDownload - Force download (attachment) vs inline (preview)
   * @returns {Promise<string>} Download URL
   */
  async getDownloadUrl(fileUrl, storageType, metadata = {}, forceDownload = true) {
    const service = this.getService(storageType || this.storageType);
    
    if (service === cloudinaryService) {
      // Use new Cloudinary method with proper filename
      return cloudinaryService.getDownloadUrl(
        fileUrl,
        metadata.originalFilename,
        metadata.extension,
        forceDownload
      );
    }
    
    // For S3 or other services
    if (typeof service.getDownloadUrl === 'function') {
      return await service.getDownloadUrl(fileUrl, metadata.publicId, forceDownload);
    }
    
    return fileUrl;
  }

  /**
   * Get formatted metadata
   * @param {Object} uploadResult - Result from upload
   * @returns {Object} Formatted metadata
   */
  getMetadata(uploadResult) {
    if (uploadResult.storageType === 'cloudinary') {
      return cloudinaryService.getMetadata(uploadResult);
    }
    return uploadResult;
  }
  /**
   * Generate PDF first-page thumbnail URL
   * @param {string} publicId - Cloudinary public_id
   * @param {number} width - Width (default 400)
   * @param {number} height - Height (default 560)
   * @returns {string} Thumbnail URL
   */
  getPdfThumbnailUrl(publicId, width = 400, height = 560) {
    if (typeof cloudinaryService.getPdfThumbnailUrl === 'function') {
      return cloudinaryService.getPdfThumbnailUrl(publicId, width, height);
    }
    return '';
  }

  /**
   * Generate time-limited signed URL
   * @param {string} publicId - Cloudinary public_id
   * @param {string} resourceType - Resource type
   * @param {number} expiresInSeconds - Expiry duration
   * @returns {string} Signed URL
   */
  getSignedUrl(publicId, resourceType = 'raw', expiresInSeconds = 900) {
    if (typeof cloudinaryService.getSignedUrl === 'function') {
      return cloudinaryService.getSignedUrl(publicId, resourceType, expiresInSeconds);
    }
    return '';
  }
}

module.exports = new StorageService();
