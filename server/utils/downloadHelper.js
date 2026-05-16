const storageService = require('../services/storageService');

/**
 * PRODUCTION-READY Download Helper
 * 
 * Handles generating secure, presigned download URLs for files stored in Cloudinary or S3.
 * Ensures files download with correct names and extensions instead of opening in browser.
 * 
 * Usage:
 * const url = await getSecureDownloadUrl(material, true);  // force download
 * const url = await getSecureDownloadUrl(material, false); // inline/preview
 */

/**
 * Generate secure download URL for a file resource
 * 
 * Supports two storage backends:
 * 1. Cloudinary (primary): Uses fl_attachment transformation with filename
 * 2. S3: Uses presigned URLs with Content-Disposition header
 * 
 * @param {Object} resource - File resource object from database
 *   - resource.fileUrl: Original file URL from Cloudinary/S3
 *   - resource.storageType: 'cloudinary' or 's3'
 *   - resource.publicId: Cloudinary public_id or S3 key
 *   - resource.originalFilename: Original filename with extension
 *   - resource.extension: File extension (pdf, docx, etc.)
 *   - resource.s3Bucket: S3 bucket name (if S3)
 *   - resource.s3Key: S3 object key (if S3)
 * @param {boolean} forceDownload - Force download (attachment) vs inline preview
 * @returns {Promise<string>} Download URL
 */
async function getSecureDownloadUrl(resource, forceDownload = true) {
  try {
    if (!resource) {
      throw new Error('Resource not provided');
    }

    const { fileUrl, storageType, publicId, originalFilename, extension, s3Bucket, s3Key } =
      resource;

    // S3 backend
    if (storageType === 's3' && s3Bucket && s3Key) {
      console.log(`[Download] Generating S3 presigned URL: ${s3Key}`);
      
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const s3Client = require('../config/s3');

      const command = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        // Force download with correct filename
        ResponseContentDisposition: forceDownload
          ? `attachment; filename="${originalFilename || s3Key}"`
          : 'inline',
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log('[Download] S3 URL generated successfully');
      return url;
    }

    // Cloudinary backend (default)
    if (!fileUrl) {
      throw new Error('File URL not available');
    }

    console.log(
      `[Download] Generating Cloudinary URL for: ${originalFilename || publicId}`
    );

    const url = await storageService.getDownloadUrl(
      fileUrl,
      storageType || 'cloudinary',
      {
        publicId,
        originalFilename,
        extension,
      },
      forceDownload
    );

    console.log('[Download] Cloudinary URL generated successfully');
    return url;
  } catch (error) {
    console.error('[Download] Error generating URL:', error.message);
    throw error;
  }
}

/**
 * Generate download URL for a study material (helper wrapper)
 * @param {Object} material - StudyMaterial document from MongoDB
 * @param {boolean} forceDownload - Force download
 * @returns {Promise<string>} Download URL
 */
async function getStudyMaterialDownloadUrl(material, forceDownload = true) {
  if (!material) {
    throw new Error('Material not found');
  }

  return await getSecureDownloadUrl(material, forceDownload);
}

/**
 * Generate download URL for a training video
 * @param {Object} video - TrainingVideo document
 * @param {boolean} forceDownload - Force download
 * @returns {Promise<string>} Download URL
 */
async function getTrainingVideoDownloadUrl(video, forceDownload = true) {
  if (!video) {
    throw new Error('Video not found');
  }

  // Training videos stored as:
  const videoResource = {
    fileUrl: video.cloudinaryUrl,
    storageType: 'cloudinary',
    publicId: video.cloudinaryPublicId,
    originalFilename: `${video.title}.mp4`,
    extension: 'mp4',
  };

  return await getSecureDownloadUrl(videoResource, forceDownload);
}

/**
 * Resolve file access URL (S3 presigned or Cloudinary download)
 * Used by controllers to get the correct URL for the storage backend
 * 
 * @param {Object} resource - File resource
 * @param {boolean} forceDownload - Force download
 * @returns {Promise<string>} Accessible URL
 */
async function resolveFileAccessUrl(resource, forceDownload = true) {
  return await getSecureDownloadUrl(resource, forceDownload);
}

module.exports = {
  getSecureDownloadUrl,
  getStudyMaterialDownloadUrl,
  getTrainingVideoDownloadUrl,
  resolveFileAccessUrl,
};
