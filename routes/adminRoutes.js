const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const {
  getAllStudents,
  getAllTeachers,
  updateStudent,
  approveTeacher,
  deleteTeacher,
  deleteStudent,
  getAdminStats,
  getAdmissions,
  updateAdmission,
  getFeesOverview,
  updateFeeStatus,
  getStudentFeeDirectory,
  getStudentFeeHistory,
  recordFeePayment,
} = require('../controllers/adminController');
const {
  getAllLeaves,
  updateLeaveStatus,
  getBestTeacher,
  gradeTeacher,
  getLiveMonitor,
} = require('../controllers/leaveController');
const {
  getAdminSalaryDashboard,
  processSalary,
  processAllSalaries,
  setTeacherSalaryConfig,
  getSalaryReports,
} = require('../controllers/salaryController');
const {
  getEnquiries,
  updateEnquiryStatus,
} = require('../controllers/enquiryController');
const Course = require('../models/Course');
const FeesRecord = require('../models/FeesRecord');
const { uploadImage, uploadToCloudinary } = require('../middleware/upload');

// All routes: admin only
router.use(verifyToken, adminOnly);

// Stats
router.get('/stats', getAdminStats);

// Students
router.get('/students', getAllStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// Teachers
router.get('/teachers', getAllTeachers);
router.put('/teachers/:id/approve', approveTeacher);
router.delete('/teachers/:id', deleteTeacher);

// Live monitor
router.get('/live-monitor', getLiveMonitor);

// Fees
router.get('/fees', getFeesOverview);
router.get('/student-fees', getStudentFeeDirectory);
router.get('/fees/history/:studentId', getStudentFeeHistory);
router.put('/fees/:id', updateFeeStatus);
router.post('/fees/record-payment', recordFeePayment);

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

// Top Rankers
router.get('/top-rankers', async (req, res) => {
  try {
    const ExamScore = require('../models/ExamScore');
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 10)) : 10;
    // fetch recent published scores and compute percentage server-side
    const scores = await ExamScore.find({ isPublished: true })
      .populate('student', 'name displayName')
      .exec();

    const withPct = scores.map((r) => {
      const max = r.maxMarks || 100;
      const obtained = typeof r.marksObtained === 'number' ? r.marksObtained : 0;
      const pct = max > 0 ? (obtained / max) * 100 : 0;
      return { raw: r, pct };
    });

    withPct.sort((a, b) => b.pct - a.pct);

    const top = withPct.slice(0, limit);

    res.json({
      success: true,
      topRankers: top.map((item, idx) => ({
        rank: idx + 1,
        name: item.raw.student?.displayName || item.raw.student?.name || 'N/A',
        score: `${item.pct.toFixed(1)}%`,
        grade: item.raw.grade || 'A',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Student Marks
router.get('/student-marks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const ExamScore = require('../models/ExamScore');
    const marks = await ExamScore.find()
      .limit(limit)
      .populate('student', 'name displayName')
      .sort({ createdAt: -1 })
      .exec();

    // attach percentage to each record to match client expectations
    const annotated = marks.map((r) => {
      const max = r.maxMarks || 100;
      const obtained = typeof r.marksObtained === 'number' ? r.marksObtained : 0;
      const percentage = max > 0 ? Number(((obtained / max) * 100).toFixed(1)) : 0;
      return {
        _id: r._id,
        student: r.student,
        subject: r.subject,
        examTitle: r.examTitle,
        marksObtained: r.marksObtained,
        maxMarks: r.maxMarks,
        percentage,
        grade: r.grade,
        examDate: r.examDate,
        createdAt: r.createdAt,
      };
    });

    res.json({ success: true, marks: annotated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Salaries
router.get('/salaries', getAdminSalaryDashboard);
router.post('/salary/process', processSalary);
router.post('/salary/process-all', processAllSalaries);
router.post('/teacher/:teacherId/salary-config', setTeacherSalaryConfig);
router.get('/salary/reports', getSalaryReports);
router.post('/salary/upload-proof', uploadImage.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vettri-academy/salary-proofs',
      resource_type: 'image',
      public_id: `proof_${Date.now()}`,
    });
    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
