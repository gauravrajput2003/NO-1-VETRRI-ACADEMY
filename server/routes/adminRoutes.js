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

// Top Rankers
router.get('/top-rankers', async (req, res) => {
  try {
    const ExamScore = require('../models/ExamScore');
    const topRankers = await ExamScore.find()
      .sort({ score: -1 })
      .limit(10)
      .populate('studentId', 'name displayName')
      .exec();
    
    res.json({ 
      success: true, 
      topRankers: topRankers.map((r, idx) => ({
        rank: idx + 1,
        name: r.studentId?.displayName || r.studentId?.name || 'N/A',
        score: `${r.score}%`,
        grade: r.grade || 'A'
      }))
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
      .populate('studentId', 'name displayName')
      .sort({ createdAt: -1 })
      .exec();
    
    res.json({ success: true, marks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Salaries
router.get('/salaries', async (req, res) => {
  try {
    const { month, year } = req.query;
    const SalaryTransaction = require('../models/SalaryTransaction');
    
    const query = {};
    if (month && year) {
      const startDate = new Date(year, new Date(`${month} 1`).getMonth(), 1);
      const endDate = new Date(year, new Date(`${month} 1`).getMonth() + 1, 0);
      query.transactionDate = { $gte: startDate, $lte: endDate };
    }
    
    const salaries = await SalaryTransaction.find(query)
      .populate('teacherId', 'name displayName email')
      .sort({ transactionDate: -1 })
      .exec();
    
    res.json({ success: true, salaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Salary Reports
router.get('/salary/reports', async (req, res) => {
  try {
    const { period } = req.query; // monthly, yearly, etc.
    const SalaryTransaction = require('../models/SalaryTransaction');
    
    const reports = await SalaryTransaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } },
          totalPaid: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 12 }
    ]);
    
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
