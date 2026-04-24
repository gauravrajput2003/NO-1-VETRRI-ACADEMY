const User = require('../models/User');
const LiveClass = require('../models/LiveClass');
const StudyMaterial = require('../models/StudyMaterial');
const ExamScore = require('../models/ExamScore');
const Attendance = require('../models/Attendance');
const ChatMessage = require('../models/ChatMessage');
const LeaveApplication = require('../models/LeaveApplication');
const FeesRecord = require('../models/FeesRecord');
const AdmissionForm = require('../models/AdmissionForm');
const Notification = require('../models/Notification');
const ClassSchedule = require('../models/ClassSchedule');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');

// @desc    Get student dashboard data
// @route   GET /api/student/dashboard
// @access  Student
const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayClass, recentScores, attendanceSummary, unreadNotifications] = await Promise.all([
      // Today's live class
      LiveClass.findOne({
        enrolledStudents: studentId,
        scheduledDate: { $gte: today, $lt: tomorrow },
        status: { $in: ['scheduled', 'live'] },
      })
        .populate('teacher', 'name qualification') // Only name — NO mobile/email
        .select('-studentsJoined'),

      // Recent 5 exam scores
      ExamScore.find({ student: studentId, isPublished: true })
        .sort({ createdAt: -1 })
        .limit(5),

      // Attendance this month
      Attendance.aggregate([
        {
          $match: {
            student: studentId,
            date: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Unread notifications count
      Notification.countDocuments({ recipient: studentId, isRead: false }),
    ]);

    // Weekly leaderboard (top 3 by total score this week)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekScores = await ExamScore.aggregate([
      {
        $match: {
          examDate: { $gte: weekStart },
          // Only students from same teacher batch
        },
      },
      {
        $group: {
          _id: '$student',
          totalScore: { $sum: '$marksObtained' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 3 },
    ]);

    // Populate leaderboard student names (no contact info)
    const leaderboard = await User.populate(weekScores, {
      path: '_id',
      select: 'name grade',
    });

    res.status(200).json({
      success: true,
      dashboard: {
        todayClass,
        recentScores,
        attendanceSummary,
        unreadNotifications,
        leaderboard,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get study materials accessible to student
// @route   GET /api/student/materials
// @access  Student
const getStudentMaterials = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get materials for student's course and grade
    const student = await User.findById(studentId).select('course grade assignedTeacher');

    const materials = await StudyMaterial.find({
      $or: [
        { teacher: student.assignedTeacher },
        { course: student.course },
      ],
      lockedFor: { $ne: studentId }, // not explicitly locked for this student
    }).select('-s3Key -s3Bucket'); // Don't expose S3 keys directly

    // Mark which ones are accessible
    const materialsWithAccess = materials.map((m) => {
      const isLocked = m.lockedForAll && !m.unlockedFor.includes(studentId);
      return {
        _id: m._id,
        title: m.title,
        description: m.description,
        type: m.type,
        subject: m.subject,
        grade: m.grade,
        mimeType: m.mimeType,
        fileSize: m.fileSize,
        isLocked,
        createdAt: m.createdAt,
      };
    });

    res.status(200).json({ success: true, materials: materialsWithAccess });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get presigned URL for material (if unlocked)
// @route   GET /api/student/materials/:id/view
// @access  Student
const getMaterialUrl = async (req, res) => {
  try {
    const studentId = req.user._id;
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    // Check access
    const isLocked =
      material.lockedFor.includes(studentId) ||
      (material.lockedForAll && !material.unlockedFor.includes(studentId));

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This material is locked. Contact your teacher.',
      });
    }

    // Generate presigned URL (1 hour expiry, no download headers — view only)
    const command = new GetObjectCommand({
      Bucket: material.s3Bucket,
      Key: material.s3Key,
      ResponseContentDisposition: 'inline', // Forces browser to view, not download
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.status(200).json({ success: true, url: signedUrl, type: material.type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's exam scores
// @route   GET /api/student/scores
// @access  Student
const getStudentScores = async (req, res) => {
  try {
    const scores = await ExamScore.find({ student: req.user._id, isPublished: true })
      .sort({ examDate: -1 });

    // Group by subject for chart data
    const bySubject = {};
    scores.forEach((score) => {
      if (!bySubject[score.subject]) bySubject[score.subject] = [];
      bySubject[score.subject].push({
        week: score.weekNumber || score.examTitle,
        score: score.marksObtained,
        max: score.maxMarks,
        date: score.examDate,
        percentage: ((score.marksObtained / score.maxMarks) * 100).toFixed(1),
      });
    });

    res.status(200).json({ success: true, scores, bySubject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's attendance
// @route   GET /api/student/attendance
// @access  Student
const getStudentAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.user._id })
      .populate('liveClass', 'title subject scheduledDate scheduledTime')
      .sort({ date: -1 });

    const totalClasses = attendance.length;
    const presentClasses = attendance.filter((a) => a.status === 'present').length;
    const attendancePercent = totalClasses > 0 ? ((presentClasses / totalClasses) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      attendance,
      summary: { totalClasses, presentClasses, attendancePercent },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student schedule
// @route   GET /api/student/schedule
// @access  Student
const getStudentSchedule = async (req, res) => {
  try {
    const schedules = await ClassSchedule.find({ student: req.user._id })
      .populate('teacher', 'name') // Only name
      .populate('course', 'title')
      .sort({ scheduledDate: 1 });

    res.status(200).json({ success: true, schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Apply for leave (student)
// @route   POST /api/student/leave
// @access  Student
const applyStudentLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const leave = await LeaveApplication.create({
      applicant: req.user._id,
      applicantRole: 'student',
      leaveType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
    });
    res.status(201).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's leaves
// @route   GET /api/student/leave
// @access  Student
const getStudentLeaves = async (req, res) => {
  try {
    const leaves = await LeaveApplication.find({ applicant: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student fees
// @route   GET /api/student/fees
// @access  Student
const getStudentFees = async (req, res) => {
  try {
    const fees = await FeesRecord.find({ student: req.user._id })
      .populate('course', 'title')
      .sort({ year: -1, monthNumber: -1 });

    res.status(200).json({ success: true, fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student notifications
// @route   GET /api/student/notifications
// @access  Student
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    // Mark all as read
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit admission form (first login)
// @route   POST /api/student/admission-form
// @access  Student
const submitAdmissionForm = async (req, res) => {
  try {
    const { studentName, parentName, grade, board, dateOfBirth, subject, demoClassStatus, district, state, mobileNumber } = req.body;

    const form = await AdmissionForm.create({
      student: req.user._id,
      studentName,
      parentName,
      grade,
      board,
      dateOfBirth: new Date(dateOfBirth),
      subject,
      demoClassStatus: demoClassStatus || 'Pending',
      district,
      state,
      mobileNumber,
      email: req.user.email,
    });

    // Mark form as filled
    await User.findByIdAndUpdate(req.user._id, { admissionFormFilled: true });

    res.status(201).json({ success: true, message: 'Admission form submitted!', form });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chat messages (student with teacher)
// @route   GET /api/student/chat/:teacherId
// @access  Student
const getChatMessages = async (req, res) => {
  try {
    const roomId = ChatMessage.schema.statics
      ? ChatMessage.getRoomId(req.user._id, req.params.teacherId)
      : [req.user._id.toString(), req.params.teacherId].sort().join('_');

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender', 'name role profileImage'); // Only name — no contact info

    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudentDashboard,
  getStudentMaterials,
  getMaterialUrl,
  getStudentScores,
  getStudentAttendance,
  getStudentSchedule,
  applyStudentLeave,
  getStudentLeaves,
  getStudentFees,
  getNotifications,
  submitAdmissionForm,
  getChatMessages,
};
