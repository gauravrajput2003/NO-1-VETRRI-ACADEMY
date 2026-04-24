const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const {
  getAllStudents,
  getAllTeachers,
  updateStudent,
  approveTeacher,
  getAdminStats,
  getAdmissions,
  updateAdmission,
  getFeesOverview,
  updateFeeStatus,
} = require('../controllers/adminController');
const {
  getAllLeaves,
  updateLeaveStatus,
  getBestTeacher,
  gradeTeacher,
  getLiveMonitor,
} = require('../controllers/leaveController');
const {
  getEnquiries,
  updateEnquiryStatus,
} = require('../controllers/enquiryController');
const Course = require('../models/Course');
const FeesRecord = require('../models/FeesRecord');

// All routes: admin only
router.use(verifyToken, adminOnly);

// Stats
router.get('/stats', getAdminStats);

// Students
router.get('/students', getAllStudents);
router.put('/students/:id', updateStudent);

// Teachers
router.get('/teachers', getAllTeachers);
router.put('/teachers/:id/approve', approveTeacher);

// Live monitor
router.get('/live-monitor', getLiveMonitor);

// Fees
router.get('/fees', getFeesOverview);
router.put('/fees/:id', updateFeeStatus);
// Create fee record
router.post('/fees', async (req, res) => {
  try {
    const fee = await FeesRecord.create(req.body);
    res.status(201).json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admissions
router.get('/admissions', getAdmissions);
router.put('/admissions/:id', updateAdmission);

// Enquiries
router.get('/enquiries', getEnquiries);
router.put('/enquiries/:id', updateEnquiryStatus);

// Leave approvals
router.get('/leaves', getAllLeaves);
router.put('/leaves/:id', updateLeaveStatus);

// Best teacher
router.get('/best-teacher', getBestTeacher);
router.post('/grade-teacher', gradeTeacher);

// Courses CRUD
router.get('/courses', async (req, res) => {
  const courses = await Course.find().sort({ createdAt: 1 });
  res.json({ success: true, courses });
});
router.post('/courses', async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.put('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
