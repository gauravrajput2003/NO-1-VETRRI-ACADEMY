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
const storageService = require('../services/storageService');
const { resolveFileAccessUrl } = require('../utils/downloadHelper');
const { proxyDownload } = require('../middleware/fileDownloadHandler');
const { logDev, warnDev, errorCrit } = require('../utils/logger');

const isMaterialLockedForStudent = (material, studentId) => {
  return (
    material.lockedFor.includes(studentId) ||
    (material.lockedForAll && !material.unlockedFor.includes(studentId))
  );
};

/**
 * Resolve material access URL with proper download handling
 * Supports both S3 and Cloudinary storage with correct filenames
 */
const resolveMaterialAccessUrl = async (material, forceDownload = false) => {
  try {
    // S3 backend
    if (material.s3Bucket && material.s3Key) {
      logDev('[Student] Resolving material access URL (S3)');
      
      const command = new GetObjectCommand({
        Bucket: material.s3Bucket,
        Key: material.s3Key,
        ResponseContentDisposition: forceDownload
          ? `attachment; filename="${material.originalFilename || material.s3Key}"`
          : 'inline',
      });

      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    // Cloudinary backend (primary)
    if (material.fileUrl) {
      logDev('[Student] Resolving material access URL (Cloudinary)');
      
      return await resolveFileAccessUrl(material, forceDownload);
    }

    warnDev('[Student] No file URL found for material');
    return null;
  } catch (error) {
    errorCrit('[Student] Error resolving access URL:', error.message);
    throw error;
  }
};

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
      { $limit: 5 },
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
        fileUrl: m.fileUrl,
        publicId: m.publicId,
        resourceType: m.resourceType,
        storageType: m.storageType,
        originalFilename: m.originalFilename,
        extension: m.extension,
        isLocked,
        createdAt: m.createdAt,
      };
    });

    res.status(200).json({ success: true, materials: materialsWithAccess });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get preview URL for material (if unlocked)
// @route   GET /api/student/materials/:id/preview
// @access  Student
const getMaterialPreviewUrl = async (req, res) => {
  try {
    const studentId = req.user._id;
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const isLocked = isMaterialLockedForStudent(material, studentId);

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This material is locked. Contact your teacher.',
      });
    }

    const signedUrl = await resolveMaterialAccessUrl(material, false);

    if (!signedUrl) {
      errorCrit('[getMaterialPreviewUrl] Material has no accessible URL');
      return res.status(404).json({
        success: false,
        message: 'Material file is missing or inaccessible.',
      });
    }

    res.status(200).json({ 
      success: true, 
      url: signedUrl, 
      type: material.type,
      mimeType: material.mimeType,
      storageType: material.storageType,
    });
  } catch (error) {
    errorCrit('[getMaterialPreviewUrl] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get download URL for material (if unlocked)
// @route   GET /api/student/materials/:id/download
// @access  Student
// 
// PRODUCTION-READY implementation:
// - Checks if material is unlocked for student
// - Generates proper download URL with original filename and extension
// - Handles both Cloudinary and S3 storage
// - Forces download (attachment) instead of preview
const getMaterialDownloadUrl = async (req, res) => {
  try {
    const studentId = req.user._id;
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.',
      });
    }

    // Check if material is locked for this student
    const isLocked = isMaterialLockedForStudent(material, studentId);

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This material is locked. Contact your teacher for access.',
      });
    }

    logDev('[Download] Generating direct material file URL');

    const downloadUrl = await resolveMaterialAccessUrl(material, true);

    if (!downloadUrl) {
      return res.status(404).json({
        success: false,
        message: 'Material file is missing or inaccessible.',
      });
    }

    logDev('[Download] Returning direct file URL');

    res.status(200).json({
      success: true,
      url: downloadUrl,
      type: material.type,
      resourceType: material.resourceType || 'raw',
      metadata: {
        filename: material.originalFilename,
        extension: material.extension,
        fileSize: material.fileSize,
        mimeType: material.mimeType,
      },
    });
  } catch (error) {
    errorCrit('[Download] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate download URL.',
    });
  }
};

/**
 * Direct download endpoint with proper Content-Disposition headers
 * Serves file with correct filename, bypassing Cloudinary URL issues
 * 
 * Usage: GET /api/student/materials/:id/direct-download
 */
const downloadMaterialDirect = async (req, res) => {
  try {
    const studentId = req.user._id;
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.',
      });
    }

    // Check if material is locked for this student
    const isLocked = isMaterialLockedForStudent(material, studentId);

    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This material is locked. Contact your teacher for access.',
      });
    }

    if (!material.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'Material file URL not found.',
      });
    }

    logDev('[Download] Direct download requested');

    const filename = material.originalFilename || `file.${material.extension || 'pdf'}`;
    const mimeType = material.mimeType || 'application/octet-stream';
    const resourceType = material.resourceType || 'raw';

    let downloadUrl;

    if (material.publicId) {
      const cloudinary = require('../config/cloudinary');
      // Use Admin API to generate a signed download URL. 
      // CRITICAL: We must specify `type: 'upload'` because private_download_url 
      // defaults to 'authenticated', which causes a 404 since our files are 'upload'.
      downloadUrl = cloudinary.utils.private_download_url(
        material.publicId,
        material.extension || 'pdf',
        {
          resource_type: resourceType,
          type: 'upload', 
          expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour valid
          attachment: true
        }
      );
      logDev(`[Download] Generated Admin API URL for: ${filename}`);
    } else {
      if (!material.fileUrl) {
        return res.status(404).json({ success: false, message: 'File URL not found.' });
      }
      downloadUrl = material.fileUrl.startsWith('https://')
        ? material.fileUrl
        : material.fileUrl.replace('http://', 'https://');
      logDev(`[Download] Using plain URL for: ${filename}`);
    }

    // Proxy the download through our backend so the student gets the file
    // without hitting the Cloudinary CDN restrictions.
    await proxyDownload(downloadUrl, filename, mimeType, res);
  } catch (error) {
    errorCrit('[Download] Direct download error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download material.',
      });
    }
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
};
