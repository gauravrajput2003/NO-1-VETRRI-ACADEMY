const mongoose = require('mongoose');
const User = require('../models/User');
const AdmissionForm = require('../models/AdmissionForm');
const FeesRecord = require('../models/FeesRecord');
const Course = require('../models/Course');
const AnnouncementRead = require('../models/AnnouncementRead');
const Attendance = require('../models/Attendance');
const ChatMessage = require('../models/ChatMessage');
const ClassAttendance = require('../models/ClassAttendance');
const ClassSchedule = require('../models/ClassSchedule');
const Conversation = require('../models/Conversation');
const DemoBooking = require('../models/DemoBooking');
const Doubt = require('../models/Doubt');
const DoubtAuditLog = require('../models/DoubtAuditLog');
const DoubtReply = require('../models/DoubtReply');
const ExamScore = require('../models/ExamScore');
const LeaveApplication = require('../models/LeaveApplication');
const LiveClass = require('../models/LiveClass');
const LiveSession = require('../models/LiveSession');
const LoginLog = require('../models/LoginLog');
const Notification = require('../models/Notification');
const PdfAnalytics = require('../models/PdfAnalytics');
const PdfBookmark = require('../models/PdfBookmark');
const PdfNote = require('../models/PdfNote');
const PdfProgress = require('../models/PdfProgress');
const SalaryTransaction = require('../models/SalaryTransaction');
const StudyMaterial = require('../models/StudyMaterial');
const TeacherGrading = require('../models/TeacherGrading');
const TeacherPermissions = require('../models/TeacherPermissions');
const TrainingVideoProgress = require('../models/TrainingVideoProgress');
const WeeklyTopPerformer = require('../models/WeeklyTopPerformer');

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
    const teachers = await User.find({ role: 'teacher', isApproved: true })
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
    const { name, mobile, email, course, assignedTeacher, grade, board, isActive, feeAmount, feeFrequency, feeDueDate, feeNotes } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (mobile) updates.mobile = mobile.trim();
    if (email !== undefined) updates.email = email ? email.trim() : '';
    if (course !== undefined) updates.course = course || null;
    if (assignedTeacher !== undefined) updates.assignedTeacher = assignedTeacher || null;
    if (grade !== undefined) updates.grade = grade;
    if (board !== undefined) updates.board = board;
    if (isActive !== undefined) updates.isActive = isActive;
    if (feeAmount !== undefined) updates.feeAmount = feeAmount;
    if (feeFrequency !== undefined) updates.feeFrequency = feeFrequency;
    if (feeDueDate !== undefined) updates.feeDueDate = feeDueDate;
    if (feeNotes !== undefined) updates.feeNotes = feeNotes;

    const student = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .select('-password -refreshToken')
      .populate('course', 'title')
      .populate('assignedTeacher', 'name displayName');

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

// @desc    Update teacher (edit profile)
// @route   PUT /api/admin/teachers/:id
// @access  Admin
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher id.' });
    }

    const teacher = await User.findOne({ _id: id, role: 'teacher' });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const {
      name,
      mobile,
      phone,
      email,
      password,
      qualification,
      subjects,
      experience,
      experienceYears,
      teacherBio,
      displayName,
      isActive,
      isApproved,
    } = req.body;

    const nextMobile = mobile !== undefined ? mobile : phone;
    if (nextMobile !== undefined) {
      const mobileValue = String(nextMobile).trim();
      if (!mobileValue) {
        return res.status(400).json({ success: false, message: 'Mobile number is required.' });
      }
      const mobileTaken = await User.findOne({ mobile: mobileValue, _id: { $ne: teacher._id } });
      if (mobileTaken) {
        return res.status(409).json({ success: false, message: 'Mobile number already in use.' });
      }
      teacher.mobile = mobileValue;
    }

    if (email !== undefined) {
      const emailValue = email ? String(email).trim().toLowerCase() : '';
      if (emailValue) {
        const emailTaken = await User.findOne({ email: emailValue, _id: { $ne: teacher._id } });
        if (emailTaken) {
          return res.status(409).json({ success: false, message: 'Email already in use.' });
        }
      }
      teacher.email = emailValue;
    }

    if (name !== undefined) teacher.name = String(name).trim();
    if (displayName !== undefined) teacher.displayName = displayName ? String(displayName).trim() : '';
    if (qualification !== undefined) teacher.qualification = qualification;
    if (subjects !== undefined) {
      teacher.subjects = Array.isArray(subjects)
        ? subjects
        : String(subjects).split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (experience !== undefined) teacher.experience = experience;
    if (experienceYears !== undefined) teacher.experienceYears = experienceYears;
    if (teacherBio !== undefined) teacher.teacherBio = teacherBio;
    if (isActive !== undefined) teacher.isActive = isActive;
    if (isApproved !== undefined) teacher.isApproved = isApproved;

    // Only hash when a new password is provided (User pre-save hook handles hashing)
    if (password !== undefined && String(password).trim()) {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }
      teacher.password = String(password);
    }

    await teacher.save();

    const updated = teacher.toObject();
    delete updated.password;
    delete updated.refreshToken;

    res.status(200).json({ success: true, teacher: updated });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `${field === 'mobile' ? 'Mobile number' : field === 'email' ? 'Email' : 'Value'} already in use.`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    const classIds = await ClassSchedule.find({ teacherId: teacher._id }).distinct('_id');
    const liveClassIds = await LiveClass.find({ teacher: teacher._id }).distinct('_id');

    await Promise.all([
      User.updateMany({ assignedTeacher: teacher._id }, { $unset: { assignedTeacher: '' } }),
      AdmissionForm.updateMany({ assignedTeacher: teacher._id }, { $unset: { assignedTeacher: '' } }),
      DemoBooking.updateMany({ assignedTeacher: teacher._id }, { $unset: { assignedTeacher: '' } }),
      Doubt.updateMany({ assignedTeachers: teacher._id }, { $pull: { assignedTeachers: teacher._id, participants: teacher._id } }),
      StudyMaterial.deleteMany({ teacher: teacher._id }),
      TeacherPermissions.deleteMany({ teacherId: teacher._id }),
      TeacherGrading.deleteMany({ teacher: teacher._id }),
      TrainingVideoProgress.deleteMany({ teacherId: teacher._id }),
      SalaryTransaction.deleteMany({ teacherId: teacher._id }),
      ClassSchedule.deleteMany({ teacherId: teacher._id }),
      ClassAttendance.deleteMany({ $or: [{ classId: { $in: classIds } }, { markedBy: teacher._id }] }),
      LiveSession.deleteMany({ $or: [{ teacherId: teacher._id }, { classId: { $in: classIds } }] }),
      LiveClass.deleteMany({ teacher: teacher._id }),
      Attendance.deleteMany({ $or: [{ teacher: teacher._id }, { liveClass: { $in: liveClassIds } }] }),
      ExamScore.deleteMany({ teacher: teacher._id }),
      LeaveApplication.deleteMany({ applicant: teacher._id }),
      Notification.deleteMany({ $or: [{ recipient: teacher._id }, { sender: teacher._id }] }),
      ChatMessage.deleteMany({ $or: [{ senderId: teacher._id }, { receiverId: teacher._id }, { sender: teacher._id }, { receiver: teacher._id }] }),
      Conversation.deleteMany({ participants: teacher._id }),
      DoubtReply.deleteMany({ senderId: teacher._id }),
      DoubtAuditLog.deleteMany({ actorId: teacher._id }),
      AnnouncementRead.deleteMany({ userId: teacher._id }),
      LoginLog.deleteMany({ userId: teacher._id }),
      User.deleteOne({ _id: teacher._id }),
    ]);

    res.status(200).json({ success: true, message: 'Teacher and related data deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const doubtIds = await Doubt.find({ studentId: student._id }).distinct('_id');

    await Promise.all([
      ClassSchedule.updateMany({ studentIds: student._id }, { $pull: { studentIds: student._id } }),
      LiveClass.updateMany(
        { $or: [{ enrolledStudents: student._id }, { 'attendance.student': student._id }] },
        { $pull: { enrolledStudents: student._id, attendance: { student: student._id } } }
      ),
      Doubt.deleteMany({ studentId: student._id }),
      DoubtReply.deleteMany({ $or: [{ doubtId: { $in: doubtIds } }, { senderId: student._id }] }),
      DoubtAuditLog.deleteMany({ $or: [{ doubtId: { $in: doubtIds } }, { actorId: student._id }] }),
      ClassAttendance.deleteMany({ studentId: student._id }),
      Attendance.deleteMany({ student: student._id }),
      ExamScore.deleteMany({ student: student._id }),
      FeesRecord.deleteMany({ student: student._id }),
      AdmissionForm.deleteMany({ student: student._id }),
      LeaveApplication.deleteMany({ applicant: student._id }),
      Notification.deleteMany({ $or: [{ recipient: student._id }, { sender: student._id }] }),
      ChatMessage.deleteMany({ $or: [{ senderId: student._id }, { receiverId: student._id }, { sender: student._id }, { receiver: student._id }] }),
      Conversation.deleteMany({ participants: student._id }),
      PdfAnalytics.deleteMany({ studentId: student._id }),
      PdfBookmark.deleteMany({ userId: student._id }),
      PdfNote.deleteMany({ userId: student._id }),
      PdfProgress.deleteMany({ userId: student._id }),
      AnnouncementRead.deleteMany({ userId: student._id }),
      LoginLog.deleteMany({ userId: student._id }),
      WeeklyTopPerformer.updateMany({}, { $pull: { performers: { studentId: student._id } } }),
      User.deleteOne({ _id: student._id }),
    ]);

    res.status(200).json({ success: true, message: 'Student and related data deleted.' });
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

// @desc    Get student fee directory
// @route   GET /api/admin/student-fees
// @access  Admin
const getStudentFeeDirectory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { role: 'student', isActive: true };
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { mobile: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const students = await User.find(query)
      .select('name grade board mobile profilePic feeAmount feeFrequency feeDueDate')
      .skip(skip)
      .limit(limit)
      .lean();

    const totalStudents = await User.countDocuments(query);

    // Fetch latest fee record for each student
    const studentIds = students.map(s => s._id);
    const latestFees = await FeesRecord.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$student", latestFee: { $first: "$$ROOT" } } }
    ]);

    const feesMap = {};
    latestFees.forEach(f => { feesMap[f._id.toString()] = f.latestFee; });

    const directory = students.map(s => ({
      ...s,
      latestFee: feesMap[s._id.toString()] || null
    }));

    res.status(200).json({ success: true, students: directory, total: totalStudents, page, pages: Math.ceil(totalStudents / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student fee history
// @route   GET /api/admin/fees/history/:studentId
// @access  Admin
const getStudentFeeHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const fees = await FeesRecord.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'name');
    res.status(200).json({ success: true, history: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record fee payment
// @route   POST /api/admin/fees/record-payment
// @access  Admin
const recordFeePayment = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, status, month, year, remarks } = req.body;
    const fee = await FeesRecord.create({
      student: studentId,
      amount,
      paymentMethod,
      status: status || 'paid',
      month,
      year,
      remarks,
      paidAt: new Date(),
      updatedBy: req.user._id,
    });
    res.status(201).json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllStudents,
  getAllTeachers,
  updateStudent,
  approveTeacher,
  updateTeacher,
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
};
