const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const cloudinary = require('../config/cloudinary');
const StudyMaterial = require('../models/StudyMaterial');
const MaterialFolder = require('../models/MaterialFolder');
const User = require('../models/User');
const storageService = require('../services/storageService');
const notificationService = require('../services/notificationService');
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

    const isTeacher = req.user.role === 'teacher';
    const isAdmin = req.user.role === 'admin';

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
      extension: extension || path.extname(originalFilename || '').replace('.', ''),
      resourceType: resourceType || 'raw',
      fileSize,
      mimeType,
      lockedForAll: lockedForAll !== 'false' && lockedForAll !== false,
      approvalStatus: isAdmin ? 'approved' : 'pending_new',
      uploadedByRole: isAdmin ? 'admin' : 'teacher',
      requestedBy: isTeacher || isAdmin ? req.user._id : undefined,
      requestedAt: isTeacher || isAdmin ? new Date() : undefined,
    };

    if (storageType === 's3') {
      materialPayload.s3Key = publicId;
      materialPayload.s3Bucket = process.env.AWS_S3_BUCKET;
    }

    if (grade && grade.toLowerCase() !== 'all') {
      const parsedGrade = grade.trim();
      let folder = await MaterialFolder.findOne({ grade: parsedGrade });
      if (!folder) {
        folder = await MaterialFolder.create({
          name: `Class ${parsedGrade}`,
          grade: parsedGrade,
          createdBy: req.user._id,
        });
      }
      materialPayload.folder = folder._id;
    }

    const material = await StudyMaterial.create(materialPayload);

    if (isTeacher) {
      try {
        const admins = await User.find({ role: 'admin' }).select('_id');
        const teacherName = req.user.name || req.user.displayName || 'A teacher';
        if (admins.length > 0) {
          const payload = {
            senderId: req.user._id,
            type: 'study_material',
            title: 'New Material Pending Review',
            message: `${teacherName} uploaded "${material.title}" which needs your approval.`,
            link: '/admin/materials/pending',
            referenceId: material._id,
            referenceType: 'StudyMaterial',
            io: req.app.get('io'),
          };
          if (admins.length > 1) {
            await notificationService.sendBulkNotifications({
              ...payload,
              recipientIds: admins.map((a) => a._id),
            });
          } else {
            await notificationService.sendNotification({
              ...payload,
              recipientId: admins[0]._id,
            });
          }
        }
      } catch (notifErr) {
        console.warn('[Storage confirm] Admin notification failed:', notifErr.message);
      }
    }

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

/**
 * Delete an orphaned draft upload from storage (no linked StudyMaterial record).
 * Teachers/admins may only delete files not yet attached to a material.
 */
const deleteStorageUpload = async (req, res) => {
  try {
    const { publicId, resourceType, storageType } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required.' });
    }

    const linkedMaterial = await StudyMaterial.findOne({ publicId });
    if (linkedMaterial) {
      const isOwner = linkedMaterial.teacher?.toString() === req.user._id.toString();
      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own draft uploads.',
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This file is already linked to a published material.',
      });
    }

    const resolvedResourceType = resourceType || 'raw';
    await storageService.deleteFile(publicId, storageType || 'cloudinary', resolvedResourceType);

    res.json({ success: true, message: 'Draft upload deleted.' });
  } catch (error) {
    console.error('[Storage delete] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete upload.',
    });
  }
};

module.exports = {
  getS3UploadUrl,
  getCloudinaryUploadParams,
  confirmUpload,
  getDownloadUrl,
  deleteStorageUpload,
};
