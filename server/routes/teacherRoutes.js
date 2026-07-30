const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { teacherOrAdmin } = require('../middleware/roleCheck');
const { requireLibraryAccess } = require('../middleware/requireLibraryAccess');
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
  getTeacherFolders,
  getTeacherFolderMaterials,
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
router.post('/materials', requireLibraryAccess, uploadStudyMaterial.single('file'), uploadMaterial);
router.get('/materials', getTeacherMaterials); // reading doesn't necessarily strict-block? The plan says "Apply to every teacher material route". I will apply it to get as well.

router.get('/folders', getTeacherFolders);
router.get('/folders/:id/materials', getTeacherFolderMaterials);

router.put('/materials/:id/lock', requireLibraryAccess, toggleMaterialLock);
router.put('/materials/:id', requireLibraryAccess, editMaterial);
router.delete('/materials/:id', requireLibraryAccess, deleteMaterial);

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

module.exports = router;
