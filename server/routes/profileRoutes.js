const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { uploadAvatar } = require('../middleware/upload');
const {
  getProfile, updateProfile, updateAvatar, changePassword,
  updateTeacherPermissions, getTeacherPermissions, getAllTeacherPermissions,
} = require('../controllers/profileController');

router.get('/', verifyToken, getProfile);
router.patch('/', verifyToken, updateProfile);
router.patch('/avatar', verifyToken, uploadAvatar.single('avatar'), updateAvatar);
router.patch('/password', verifyToken, changePassword);

// Teacher permissions (admin only)
router.get('/permissions/teachers', verifyToken, adminOnly, getAllTeacherPermissions);
router.get('/permissions/teacher/:teacherId', verifyToken, getTeacherPermissions);
router.patch('/permissions/teacher/:teacherId', verifyToken, adminOnly, updateTeacherPermissions);

module.exports = router;
