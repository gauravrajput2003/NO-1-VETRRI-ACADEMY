const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly, teacherOnly, teacherOrAdmin } = require('../middleware/roleCheck');
const { uploadVideo } = require('../middleware/upload');
const {
  createSchedule, getSchedules, getTodayClasses, getUpcomingClasses,
  getCalendarData, goLive, joinClass, endClass, uploadRecording,
  getUploadSignature, getClassAttendance, updateSchedule, cancelSchedule,
  generateYearSchedule, manualAttendance, getLiveMonitor, getClassDetails,
} = require('../controllers/classController');

// ─── Upload Signature (teacher only) ─────────────────────────────────────────
router.post('/upload/sign', verifyToken, teacherOnly, getUploadSignature);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.post('/schedule', verifyToken, teacherOrAdmin, createSchedule);
router.patch('/schedule/:id', verifyToken, teacherOrAdmin, updateSchedule);
router.delete('/schedule/:id', verifyToken, teacherOrAdmin, cancelSchedule);
router.post('/generate-year', verifyToken, adminOnly, generateYearSchedule);
router.get('/live-monitor', verifyToken, adminOnly, getLiveMonitor);
router.post('/attendance/manual', verifyToken, adminOnly, manualAttendance);

// ─── Role-filtered ────────────────────────────────────────────────────────────
router.get('/schedule', verifyToken, getSchedules);
router.get('/today', verifyToken, getTodayClasses);
router.get('/upcoming', verifyToken, getUpcomingClasses);
router.get('/calendar', verifyToken, getCalendarData);
router.get('/:id/details', verifyToken, getClassDetails);
router.get('/:id/attendance', verifyToken, getClassAttendance);

// ─── Teacher Routes ───────────────────────────────────────────────────────────
router.post('/:id/go-live', verifyToken, teacherOnly, goLive);
router.post('/:id/end', verifyToken, teacherOnly, endClass);
router.patch('/:id/recording', verifyToken, teacherOnly, uploadRecording);

// ─── Student Routes ───────────────────────────────────────────────────────────
router.post('/:id/join', verifyToken, joinClass);

module.exports = router;
