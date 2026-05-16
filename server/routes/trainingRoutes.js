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
  // Teacher
  getTrainingVideos,
  markVideoComplete,
  updateWatchProgress,
  getIncompleteMandatoryCount,
} = require('../controllers/trainingController');

// ─── IMPORTANT: Static routes must come BEFORE parameterized routes ────────────

// Admin — static routes
router.get('/admin/all', verifyToken, adminOnly, getAllVideosAdmin);
router.get('/progress', verifyToken, adminOnly, getProgressMatrix);
router.post('/url', verifyToken, adminOnly, uploadTrainingVideoByUrl);
router.post('/reorder', verifyToken, adminOnly, reorderVideos);

// Teacher — static routes
router.get('/incomplete-mandatory', verifyToken, teacherOnly, getIncompleteMandatoryCount);

// Teacher/Admin — shared list (teacher sees active only, admin sees all via /admin/all)
router.get('/', verifyToken, teacherOrAdmin, getTrainingVideos);

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

// Teacher routes
router.patch('/:id/complete', verifyToken, teacherOnly, markVideoComplete);
router.patch('/:id/progress', verifyToken, teacherOnly, updateWatchProgress);

// Admin routes
router.put('/:id', verifyToken, adminOnly, editTrainingVideo);
router.patch('/:id/toggle', verifyToken, adminOnly, toggleVideoStatus);
router.delete('/:id', verifyToken, adminOnly, deleteTrainingVideo);

module.exports = router;
