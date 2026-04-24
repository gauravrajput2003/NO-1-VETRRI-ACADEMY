const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly, teacherOnly, teacherOrAdmin } = require('../middleware/roleCheck');
const { uploadVideo } = require('../middleware/upload');
const {
  uploadTrainingVideo, getTrainingVideos, markVideoComplete,
  updateWatchProgress, getIncompleteMandatoryCount,
  deleteTrainingVideo, getProgressMatrix,
} = require('../controllers/trainingController');

router.post('/', verifyToken, adminOnly, uploadVideo.single('video'), uploadTrainingVideo);
router.get('/', verifyToken, teacherOrAdmin, getTrainingVideos);
router.patch('/:id/complete', verifyToken, teacherOnly, markVideoComplete);
router.patch('/:id/progress', verifyToken, teacherOnly, updateWatchProgress);
router.delete('/:id', verifyToken, adminOnly, deleteTrainingVideo);
router.get('/progress', verifyToken, adminOnly, getProgressMatrix);
router.get('/incomplete-mandatory', verifyToken, teacherOnly, getIncompleteMandatoryCount);

module.exports = router;
