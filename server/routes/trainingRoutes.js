const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly, teacherOnly, teacherOrAdmin } = require('../middleware/roleCheck');
const { uploadVideo } = require('../middleware/upload');
const {
  // Admin
  uploadTrainingVideo,
  uploadTrainingVideoByUrl,
  getAllVideosAdmin,
  editTrainingVideo,
  toggleVideoStatus,
  reorderVideos,
  deleteTrainingVideo,
  getProgressMatrix,
  // Teacher/Student
  getTrainingVideos,
  markVideoComplete,
  updateWatchProgress,
  getIncompleteMandatoryCount,
} = require('../controllers/trainingController');

// Allow any of the given roles — used to open shared endpoints to students too,
// without touching existing teacherOnly/adminOnly middleware used elsewhere.
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

// ─── IMPORTANT: Static routes must come BEFORE parameterized routes ────────────

// Admin — static routes
router.get('/admin/all', verifyToken, adminOnly, getAllVideosAdmin);
router.get('/progress', verifyToken, adminOnly, getProgressMatrix);
router.post('/url', verifyToken, adminOnly, uploadTrainingVideoByUrl);
router.post('/reorder', verifyToken, adminOnly, reorderVideos);

// Teacher/Student — static routes (widened from teacherOnly)
router.get('/incomplete-mandatory', verifyToken, allowRoles('teacher', 'student'), getIncompleteMandatoryCount);

// Teacher/Student/Admin — shared list (teacher & student see active only, admin sees all via /admin/all)
router.get('/', verifyToken, allowRoles('teacher', 'student', 'admin'), getTrainingVideos);

// Admin — file upload (with multer error handling)
const multerUpload = (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      console.error('[multerUpload] Error:', err.message);
      return res.status(400).json({ success: false, message: err.message || 'File upload error' });
    }
    next();
  });
};
router.post('/', verifyToken, adminOnly, multerUpload, uploadTrainingVideo);

// ─── Parameterized routes (must be last) ─────────────────────────────────────

// Teacher/Student routes (widened from teacherOnly)
router.patch('/:id/complete', verifyToken, allowRoles('teacher', 'student'), markVideoComplete);
router.patch('/:id/progress', verifyToken, allowRoles('teacher', 'student'), updateWatchProgress);

// Admin routes
router.put('/:id', verifyToken, adminOnly, editTrainingVideo);
router.patch('/:id/toggle', verifyToken, adminOnly, toggleVideoStatus);
router.delete('/:id', verifyToken, adminOnly, deleteTrainingVideo);

module.exports = router;