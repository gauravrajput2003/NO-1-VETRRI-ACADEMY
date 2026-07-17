const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const {
  getMyLoginLogs, getAllLoginLogs, getTodayLogins, getLoginStreak,
  getMonthlySummary, getStudentClassAttendance, getStudentAttendanceReport,
  getTeacherStudentsReport, getAdminAttendanceReport, getMonthlyAttendanceSummary,
} = require('../controllers/attendanceController');

// ─── Login Attendance ─────────────────────────────────────────────────────────
router.get('/login/my-logs', verifyToken, getMyLoginLogs);
router.get('/login/all', verifyToken, adminOnly, getAllLoginLogs);
router.get('/login/today', verifyToken, adminOnly, getTodayLogins);
router.get('/login/streak/:userId', verifyToken, getLoginStreak);
router.get('/login/summary/:userId', verifyToken, getMonthlySummary);

// ─── Class Attendance ─────────────────────────────────────────────────────────
router.get('/student/:userId/class', verifyToken, getStudentClassAttendance);

// ─── Report Export Endpoints ──────────────────────────────────────────────────
router.get('/reports/student/:id/attendance', verifyToken, getStudentAttendanceReport);
router.get('/reports/teacher/:id/students', verifyToken, getTeacherStudentsReport);
router.get('/reports/admin/attendance', verifyToken, adminOnly, getAdminAttendanceReport);
router.get('/reports/admin/monthly-summary', verifyToken, adminOnly, getMonthlyAttendanceSummary);

module.exports = router;
