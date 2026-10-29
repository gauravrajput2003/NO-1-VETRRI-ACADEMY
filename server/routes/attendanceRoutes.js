const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const canReadUser = async (req, res, next) => {
  const id = req.params.userId || req.params.id;
  if (req.user.role === 'admin' || String(id) === String(req.user._id)) return next();
  try {
    if (req.user.role === 'teacher' && await require('../models/User').exists({ _id: id, role: 'student', assignedTeachers: req.user._id })) return next();
    return res.status(403).json({ success: false, message: 'Attendance access denied.' });
  } catch { return res.status(400).json({ success: false, message: 'Invalid user.' }); }
};
const {
  getMyLoginLogs, getAllLoginLogs, getTodayLogins, getLoginStreak,
  getMonthlySummary, getStudentClassAttendance, getStudentAttendanceReport,
  getTeacherStudentsReport, getAdminAttendanceReport, getMonthlyAttendanceSummary,
} = require('../controllers/attendanceController');

// ─── Login Attendance ─────────────────────────────────────────────────────────
router.get('/login/my-logs', verifyToken, getMyLoginLogs);
router.get('/login/all', verifyToken, adminOnly, getAllLoginLogs);
router.get('/login/today', verifyToken, adminOnly, getTodayLogins);
router.get('/login/streak/:userId', verifyToken, canReadUser, getLoginStreak);
router.get('/login/summary/:userId', verifyToken, canReadUser, getMonthlySummary);

// ─── Class Attendance ─────────────────────────────────────────────────────────
router.get('/student/:userId/class', verifyToken, canReadUser, getStudentClassAttendance);

// ─── Report Export Endpoints ──────────────────────────────────────────────────
router.get('/reports/student/:id/attendance', verifyToken, canReadUser, getStudentAttendanceReport);
router.get('/reports/teacher/:id/students', verifyToken, canReadUser, getTeacherStudentsReport);
router.get('/reports/admin/attendance', verifyToken, adminOnly, getAdminAttendanceReport);
router.get('/reports/admin/monthly-summary', verifyToken, adminOnly, getMonthlyAttendanceSummary);

module.exports = router;
