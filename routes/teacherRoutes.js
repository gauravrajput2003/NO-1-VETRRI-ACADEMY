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
  editMaterial,
  deleteMaterial,
  toggleMaterialLock,
  getTeacherMaterials,
  enterExamScore,
  getRecentScores,
  markAttendance,
  getMonthlyGrading,
  applyLeave,
  getTeacherLeaves,
  updateCompensationStatus,
} = require('../controllers/teacherController');
const {
  getTeacherCurrentMonthSalary,
  getTeacherSalaryHistory,
  downloadSalarySlip,
} = require('../controllers/salaryController');

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
router.put('/materials/:id', editMaterial);
router.delete('/materials/:id', deleteMaterial);

// Exam scores
router.post('/scores', enterExamScore);
router.get('/scores/recent', getRecentScores);

// Attendance
router.post('/attendance', markAttendance);

// Monthly grading
router.get('/grading/:month/:year', getMonthlyGrading);

// Salary
router.get('/salary/current-month', getTeacherCurrentMonthSalary);
router.get('/salary/history', getTeacherSalaryHistory);
router.get('/salary/:teacherId/:monthYear/slip', downloadSalarySlip);

// Leave
router.post('/leave', applyLeave);
router.get('/leave', getTeacherLeaves);
router.patch('/leaves/:id/compensation/status', updateCompensationStatus);

module.exports = router;
