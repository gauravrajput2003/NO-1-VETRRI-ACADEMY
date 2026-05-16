const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

/**
 * PRODUCTION-READY CloudinaryService
 * 
 * Purpose: Handle all file types with proper resource types, metadata preservation,
 * and correct download URL generation for EdTech platform with 200MB+ study materials
 * and 500MB+ videos.
 * 
 * Key improvements:
 * - Correct resource_type logic (image, video, raw)
 * - Preserve original filename and extension
 * - Generate proper download URLs with fl_attachment transformation
 * - Support streaming from disk to Cloudinary (memory efficient)
 * - Automatic temp file cleanup after upload
 * - Full metadata preservation (filename, extension, mime type, size)
 */
class CloudinaryService {
  /**
   * Determine Cloudinary resource_type from MIME type
   * @param {string} mimetype - MIME type of the file
   * @returns {string} 'image', 'video', or 'raw'
   */
  getResourceType(mimetype = '') {
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('image/')) return 'image';
    // Everything else (PDF, DOCX, PPTX, XLSX, TXT, ZIP, RAR, etc.)
    return 'raw';
  }

  /**
   * Extract original filename from request (if available)
   * @param {string} originalname - Original filename from multer
   * @returns {string} Clean filename without path
   */
  extractOriginalFilename(originalname = '') {
    if (!originalname) return '';
    // Remove path and get just the filename
    return path.basename(originalname);
  }

  /**
   * Extract file extension from filename
   * @param {string} filename - Original filename
   * @returns {string} File extension without dot (e.g., 'pdf', 'docx')
   */
  getFileExtension(filename = '') {
    if (!filename) return '';
    const ext = path.extname(filename).toLowerCase().substring(1);
    return ext || '';
  }

  /**
   * Upload file from buffer to Cloudinary (memory storage path)
   * @param {Buffer} buffer - File buffer from multer.memoryStorage()
   * @param {string} mimetype - MIME type
   * @param {string} originalname - Original filename
   * @param {string} folder - Cloudinary folder path
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadFileFromBuffer(buffer, mimetype, originalname, folder = 'materials', options = {}) {
    return new Promise((resolve, reject) => {
      if (!buffer) return reject(new Error('No buffer provided'));

      const resourceType = this.getResourceType(mimetype);
      const filename = this.extractOriginalFilename(originalname);
      const extension = this.getFileExtension(filename);

      // Cloudinary upload options
      const uploadOptions = {
        folder,
        resource_type: resourceType,
        // Preserve original filename exactly as public_id so Cloudinary serves it with the correct extension
        public_id: filename,
        // Store filename for download URL generation
        context: `filename=${filename}`,
        ...options,
      };

      console.log(`[Cloudinary] Uploading: ${filename} (${resourceType})`);

      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload failed:', error.message);
          return reject(error);
        }

        console.log(`[Cloudinary] Upload successful: ${result.public_id}`);

        resolve({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          originalFilename: filename,
          extension: extension,
          storageType: 'cloudinary',
          fileSize: result.bytes,
          mimeType: mimetype,
          resourceType: resourceType,
        });
      });

      // Pipe buffer to upload stream
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Upload file from disk to Cloudinary (disk storage path - streaming to save memory)
   * @param {string} filePath - Path to file on disk
   * @param {string} mimetype - MIME type
   * @param {string} originalname - Original filename
   * @param {string} folder - Cloudinary folder path
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadFileFromDisk(filePath, mimetype, originalname, folder = 'materials', options = {}) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      const resourceType = this.getResourceType(mimetype);
      const filename = this.extractOriginalFilename(originalname);
      const extension = this.getFileExtension(filename);
      const stats = fs.statSync(filePath);

      const uploadOptions = {
        folder,
        resource_type: resourceType,
        public_id: filename,
        context: `filename=${filename}`,
        ...options,
      };

      console.log(
        `[Cloudinary] Streaming upload: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)}MB, ${resourceType})`
      );

      // Stream file directly to Cloudinary to avoid memory bloat
      const readStream = fs.createReadStream(filePath);

      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        // Clean up temp file after upload completes (success or failure)
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error(`[Temp] Failed to clean up: ${filePath}`, err.message);
            else console.log(`[Temp] Cleaned up: ${filePath}`);
          });
        }

        if (error) {
          console.error('[Cloudinary] Stream upload failed:', error.message);
          return reject(error);
        }

        console.log(`[Cloudinary] Stream upload successful: ${result.public_id}`);

        resolve({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          originalFilename: filename,
          extension: extension,
          storageType: 'cloudinary',
          fileSize: result.bytes,
          mimeType: mimetype,
          resourceType: resourceType,
        });
      });

      readStream.pipe(uploadStream);

      readStream.on('error', (err) => {
        console.error('[Cloudinary] Stream read error:', err.message);
        reject(err);
      });
    });
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public_id
   * @param {string} resourceType - Resource type ('image', 'video', 'raw')
   * @returns {Promise<boolean>} Success flag
   */
  async deleteFile(publicId, resourceType = 'raw') {
    try {
      if (!publicId) throw new Error('No public_id provided');
      
      console.log(`[Cloudinary] Deleting: ${publicId} (${resourceType})`);
      
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      
      console.log(`[Cloudinary] Deleted: ${publicId}`);
      return true;
    } catch (error) {
      console.error('[Cloudinary] Delete failed:', error.message);
      return false;
    }
  }

  /**
   * Generate download URL with proper filename and extension
   * Uses Cloudinary fl_attachment transformation to force download with correct filename
   * 
   * URL structure:
   * .../upload/fl_attachment:filename_<encoded_filename>/v<version>/<public_id>
   * 
   * This tells browsers to download the file with the original name instead of opening/previewing it.
   * 
   * @param {string} fileUrl - Original Cloudinary URL
   * @param {string} originalFilename - Original filename with extension (e.g., 'notes.pdf')
   * @param {string} extension - File extension for fallback
   * @param {boolean} forceDownload - Whether to force download (attachment vs inline)
   * @returns {string} Modified URL with attachment transformation
   */
  getDownloadUrl(fileUrl, originalFilename, extension, forceDownload = true) {
    if (!fileUrl) return fileUrl;

    // If not forcing download, return as-is for browser preview
    if (!forceDownload) return fileUrl;

    // Check if URL is valid Cloudinary URL
    if (!fileUrl.includes('/upload/')) {
      return fileUrl;
    }

    try {
      // Inject fl_attachment transformation without filename parameter.
      // Cloudinary will automatically use the public_id as the filename.
      // Since we now preserve the extension in public_id, this works perfectly.
      const downloadUrl = fileUrl.replace(
        '/upload/',
        '/upload/fl_attachment/'
      );

      return downloadUrl;
    } catch (error) {
      console.error('[Download] URL generation failed:', error.message);
      return fileUrl; // Fallback to original URL
    }
  }

  /**
   * Get all file metadata in a structured format
   * @param {Object} uploadResult - Result from uploadFileFromBuffer or uploadFileFromDisk
   * @returns {Object} Formatted metadata
   */
  getMetadata(uploadResult) {
    return {
      fileUrl: uploadResult.fileUrl,
      publicId: uploadResult.publicId,
      originalFilename: uploadResult.originalFilename,
      extension: uploadResult.extension,
      storageType: uploadResult.storageType,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      resourceType: uploadResult.resourceType,
      downloadUrl: this.getDownloadUrl(
        uploadResult.fileUrl,
        uploadResult.originalFilename,
        uploadResult.extension,
        true
      ),
    };
  }
}

module.exports = new CloudinaryService();
  