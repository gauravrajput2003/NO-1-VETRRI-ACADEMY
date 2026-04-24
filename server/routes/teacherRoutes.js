const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { teacherOrAdmin } = require('../middleware/roleCheck');
const { uploadStudyMaterial } = require('../middleware/upload');
const {
  getTeacherDashboard,
  getMyStudents,
  postLiveClass,
  markClassCompleted,
  uploadMaterial,
  toggleMaterialLock,
  getTeacherMaterials,
  enterExamScore,
  getRecentScores,
  markAttendance,
  getMonthlyGrading,
  applyLeave,
  getTeacherLeaves,
} = require('../controllers/teacherController');

// All routes protected — teacher or admin
router.use(verifyToken, teacherOrAdmin);

router.get('/dashboard', getTeacherDashboard);
router.get('/students', getMyStudents);

// Live class
router.post('/live-class', postLiveClass);
router.put('/live-class/:id/complete', markClassCompleted);

// Study materials
router.post('/materials', uploadStudyMaterial.single('file'), uploadMaterial);
router.get('/materials', getTeacherMaterials);
router.put('/materials/:id/lock', toggleMaterialLock);

// Exam scores
router.post('/scores', enterExamScore);
router.get('/scores/recent', getRecentScores);

// Attendance
router.post('/attendance', markAttendance);

// Monthly grading
router.get('/grading/:month/:year', getMonthlyGrading);

// Leave
router.post('/leave', applyLeave);
router.get('/leave', getTeacherLeaves);

module.exports = router;
