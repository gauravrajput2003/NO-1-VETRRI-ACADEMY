const User = require('../models/User');
const AdmissionForm = require('../models/AdmissionForm');
const FeesRecord = require('../models/FeesRecord');
const Course = require('../models/Course');

// @desc    Get all students (admin)
// @route   GET /api/admin/students
// @access  Admin   
const getAllStudents = async (req, res) => {
  try { 
    const { page = 1, limit = 20, search, course, grade } = req.query;
    const filter = { role: 'student' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (grade) filter.grade = grade;
    if (course) filter.course = course;

    const students = await User.find(filter)
      .select('-password -refreshToken')
      .populate('course', 'title category')
      .populate('assignedTeacher', 'name') // Only name — no contact for student-facing
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      students,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all teachers (admin) — includes phone/email
// @route   GET /api/admin/teachers
// @access  Admin
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password -refreshToken') // Admin CAN see mobile/email
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student (assign course, teacher, etc.)
// @route   PUT /api/admin/students/:id
// @access  Admin
const updateStudent = async (req, res) => {
  try {
    const { course, assignedTeacher, grade, board, isActive } = req.body;
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { course, assignedTeacher, grade, board, isActive },
      { new: true, runValidators: true }
    )
      .select('-password -refreshToken')
      .populate('course', 'title')
      .populate('assignedTeacher', 'name');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    res.status(200).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or reject teacher
// @route   PUT /api/admin/teachers/:id/approve
// @access  Admin
const approveTeacher = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const teacher = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    ).select('-password -refreshToken');

    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    res.status(200).json({ success: true, teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getAdminStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, pendingEnquiries, pendingLeaves] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      require('../models/Enquiry').countDocuments({ status: 'new' }),
      require('../models/LeaveApplication').countDocuments({ status: 'pending' }),
    ]);

    // Revenue this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = await FeesRecord.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        pendingEnquiries,
        pendingLeaves,
        monthRevenue: monthRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all admissions
// @route   GET /api/admin/admissions
// @access  Admin
const getAdmissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { admissionStatus: status } : {};

    const admissions = await AdmissionForm.find(filter)
      .populate('student', 'name mobile email')
      .populate('assignedTeacher', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await AdmissionForm.countDocuments(filter);

    res.status(200).json({
      success: true,
      admissions,
      pagination: { page: parseInt(page), total, limit: parseInt(limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update admission status
// @route   PUT /api/admin/admissions/:id
// @access  Admin
const updateAdmission = async (req, res) => {
  try {
    const { admissionStatus, assignedTeacher, adminRemarks } = req.body;
    const admission = await AdmissionForm.findByIdAndUpdate(
      req.params.id,
      { admissionStatus, assignedTeacher, adminRemarks, reviewedBy: req.user._id },
      { new: true }
    );
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found.' });

    res.status(200).json({ success: true, admission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get fees overview
// @route   GET /api/admin/fees
// @access  Admin
const getFeesOverview = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const filter = {};
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const fees = await FeesRecord.find(filter)
      .populate('student', 'name mobile email grade board')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    const summary = {
      paid: fees.filter((f) => f.status === 'paid').length,
      pending: fees.filter((f) => f.status === 'pending').length,
      overdue: fees.filter((f) => f.status === 'overdue').length,
      totalRevenue: fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
    };

    res.status(200).json({ success: true, fees, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update fee status
// @route   PUT /api/admin/fees/:id
// @access  Admin
const updateFeeStatus = async (req, res) => {
  try {
    const { status, paymentMethod, transactionId, remarks } = req.body;
    const updateData = { status, paymentMethod, remarks };
    if (status === 'paid') updateData.paidAt = new Date();
    if (transactionId) updateData.transactionId = transactionId;

    const fee = await FeesRecord.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('student', 'name mobile');

    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found.' });

    res.status(200).json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllStudents,
  getAllTeachers,
  updateStudent,
  approveTeacher,
  getAdminStats,
  getAdmissions,
  updateAdmission,
  getFeesOverview,
  updateFeeStatus,
};
