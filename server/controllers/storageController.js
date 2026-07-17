const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const cloudinary = require('../config/cloudinary');
const StudyMaterial = require('../models/StudyMaterial');
const storageService = require('../services/storageService');
const crypto = require('crypto');
const path = require('path');

/**
 * Generates an S3 PutObject pre-signed URL for direct browser-to-S3 upload.
 */
const getS3UploadUrl = async (req, res) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return res.status(500).json({ success: false, message: 'S3 bucket not configured' });
    }

    const { filename, mimetype, folder = 'materials/study-materials' } = req.body;
    if (!filename || !mimetype) {
      return res.status(400).json({ success: false, message: 'Filename and mimetype are required' });
    }

    const extension = path.extname(filename);
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const cleanBaseName = path.basename(filename, extension).replace(/[^a-zA-Z0-9]/g, '_');
    const key = `${folder}/${Date.now()}-${uniqueId}-${cleanBaseName}${extension}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimetype,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      success: true,
      uploadUrl,
      key,
      bucket,
      fileUrl: `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`,
    });
  } catch (error) {
    console.error('[S3 Presign Upload] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generates Cloudinary signed upload parameters for direct browser-to-Cloudinary upload.
 */
const getCloudinaryUploadParams = async (req, res) => {
  try {
    const { folder = 'materials/study-materials', filename } = req.body;
    const timestamp = Math.round(new Date().getTime() / 1000);

    let publicId = undefined;
    if (filename) {
      const ext = path.extname(filename);
      const cleanBaseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
      publicId = `${cleanBaseName}_${Date.now()}`;
    }

    const paramsToSign = {
      timestamp,
      folder,
    };

    if (publicId) {
      paramsToSign.public_id = publicId;
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success: true,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      publicId,
    });
  } catch (error) {
    console.error('[Cloudinary Presign Upload] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Called by the client to save metadata into the database after a successful direct upload.
 */
const confirmUpload = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      grade,
      course,
      lockedForAll,
      fileUrl,
      publicId,
      storageType,
      originalFilename,
      extension,
      resourceType,
      fileSize,
      mimeType,
    } = req.body;

    if (!title || !subject || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and file URL are required.',
      });
    }

    const getMaterialTypeFromMime = (mime = '') => {
      if (mime.startsWith('video/')) return 'video';
      if (mime === 'application/pdf') return 'pdf';
      if (
        mime.includes('presentation') ||
        mime.includes('word') ||
        mime.includes('excel') ||
        mime === 'text/plain'
      ) {
        return 'ppt';
      }
      return 'image';
    };

    const materialPayload = {
      title: title.trim(),
      description: description ? description.trim() : '',
      type: getMaterialTypeFromMime(mimeType),
      subject: subject.trim(),
      grade: grade || undefined,
      course: course || undefined,
      teacher: req.user._id,
      fileUrl,
      publicId,
      storageType: storageType || 'cloudinary',
      originalFilename,
      extension: extension || path.extname(originalFilename).replace('.', ''),
      resourceType: resourceType || 'raw',
      fileSize,
      mimeType,
      lockedForAll: lockedForAll !== 'false' && lockedForAll !== false,
    };

    if (storageType === 's3') {
      materialPayload.s3Key = publicId;
      materialPayload.s3Bucket = process.env.AWS_S3_BUCKET;
    }

    const material = await StudyMaterial.create(materialPayload);

    // Generate PDF thumbnail if file is PDF
    if (mimeType === 'application/pdf' && publicId) {
      try {
        const thumbnailUrl = storageService.getPdfThumbnailUrl
          ? storageService.getPdfThumbnailUrl(publicId)
          : '';
        if (thumbnailUrl) {
          material.thumbnailUrl = thumbnailUrl;
          await material.save();
        }
      } catch (thumbErr) {
        console.warn('[Storage confirm] Thumbnail generation failed:', thumbErr.message);
      }
    }

    res.status(201).json({
      success: true,
      material,
      message: 'Upload confirmed and saved to database.',
    });
  } catch (error) {
    console.error('[Storage confirm] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm upload.',
    });
  }
};

/**
 * Returns a pre-signed or customized download URL for study materials.
 */
const getDownloadUrl = async (req, res) => {
  try {
    const materialId = req.params.materialId;
    const material = await StudyMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const downloadUrl = await storageService.getDownloadUrl(
      material.fileUrl,
      material.storageType,
      {
        publicId: material.publicId,
        originalFilename: material.originalFilename,
        extension: material.extension,
      },
      true
    );

    res.json({
      success: true,
      downloadUrl,
      originalFilename: material.originalFilename,
    });
  } catch (error) {
    console.error('[Storage Download] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate download URL.',
    });
  }
};

module.exports = {
  getS3UploadUrl,
  getCloudinaryUploadParams,
  confirmUpload,
  getDownloadUrl,
};
