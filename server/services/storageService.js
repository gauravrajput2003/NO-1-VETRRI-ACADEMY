const cloudinaryService = require('./cloudinaryService');
const s3Service = require('./s3Service');
const fs = require('fs');
   
/**
 * PRODUCTION-READY StorageService
 * 
 * Abstraction layer for managing file storage across multiple providers.
 * Supports Cloudinary (primary) and S3 (fallback).
 * 
 * Usage:
 * - For memory storage: uploadFileFromBuffer()
 * - For disk storage: uploadFileFromDisk() (auto-cleanup)
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
   * @param {Buffer} buffer - File buffer from multer
   * @param {string} mimetype - MIME type
   * @param {string} originalname - Original filename
   * @param {string} folder - Folder path in cloud storage
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadFileFromBuffer(buffer, mimetype, originalname, folder = 'materials', options = {}) {
    const service = this.getService();
    
    if (service === cloudinaryService) {
      // Use new Cloudinary method for buffer uploads
      return await cloudinaryService.uploadFileFromBuffer(
        buffer,
        mimetype,
        originalname,
        folder,
        options
      );
    }
    
    // Fallback for other storage services
    return await service.uploadFile(buffer, mimetype, folder, options);
  }

  /**
   * Upload file from disk (for disk storage uploads)
   * Automatically cleans up temp file after upload
   * @param {string} filePath - Path to temp file on disk
   * @param {string} mimetype - MIME type
   * @param {string} originalname - Original filename
   * @param {string} folder - Folder path in cloud storage
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadFileFromDisk(filePath, mimetype, originalname, folder = 'materials', options = {}) {
    const service = this.getService();
    
    if (service === cloudinaryService) {
      // Use new Cloudinary method for disk uploads (streaming)
      return await cloudinaryService.uploadFileFromDisk(
        filePath,
        mimetype,
        originalname,
        folder,
        options
      );
    }
    
    // For S3 or other services, read file and upload as buffer
    try {
      const buffer = fs.readFileSync(filePath);
      const result = await service.uploadFile(buffer, mimetype, folder, options);
      
      // Clean up temp file
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`[Storage] Failed to clean up: ${filePath}`, err.message);
        });
      }
      
      return result;
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`[Storage] Failed to clean up on error: ${filePath}`, err.message);
        });
      }
      throw error;
    }
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
    const service = this.getService(storageType || this.storageType);
    return await service.deleteFile(publicId, resourceType);
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
}

module.exports = new StorageService();
