const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { teacherOrAdmin } = require('../middleware/roleCheck');
const {
  getS3UploadUrl,
  getCloudinaryUploadParams,
  confirmUpload,
  getDownloadUrl,
} = require('../controllers/storageController');

// All uploads are protected and require teacher or admin role
router.post('/s3/upload-url', verifyToken, teacherOrAdmin, getS3UploadUrl);
router.post('/cloudinary/upload-params', verifyToken, teacherOrAdmin, getCloudinaryUploadParams);
router.post('/confirm-upload', verifyToken, teacherOrAdmin, confirmUpload);

// Downloads require token verification but can be performed by students, teachers, or admins
router.get('/download-url/:materialId', verifyToken, getDownloadUrl);

module.exports = router;
