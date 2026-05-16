const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { studentOnly } = require('../middleware/roleCheck');
const {
  getStudentDashboard,
  getStudentMaterials,
  getMaterialPreviewUrl,
  getMaterialDownloadUrl,
    downloadMaterialDirect,
  getStudentScores,
  getStudentAttendance,
  getStudentSchedule,
  applyStudentLeave,
  getStudentLeaves,
  getStudentFees,
  getNotifications,
  submitAdmissionForm,
  getChatMessages,
} = require('../controllers/studentController');

// All routes protected — student only
router.use(verifyToken, studentOnly);

router.get('/dashboard', getStudentDashboard);
router.get('/materials', getStudentMaterials);
router.get('/materials/:id/preview', getMaterialPreviewUrl);
router.get('/materials/:id/download', getMaterialDownloadUrl);
router.get('/materials/:id/direct-download', downloadMaterialDirect);
router.get('/materials/:id/view', getMaterialPreviewUrl);
router.get('/scores', getStudentScores);
router.get('/attendance', getStudentAttendance);
router.get('/schedule', getStudentSchedule);
router.post('/leave', applyStudentLeave);
router.get('/leave', getStudentLeaves);
router.get('/fees', getStudentFees);
router.get('/notifications', getNotifications);
router.post('/admission-form', submitAdmissionForm);
router.get('/chat/:teacherId', getChatMessages);

module.exports = router;
