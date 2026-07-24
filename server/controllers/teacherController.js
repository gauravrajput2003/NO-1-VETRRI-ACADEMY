const LiveClass = require('../models/LiveClass');
const Attendance = require('../models/Attendance');
const StudyMaterial = require('../models/StudyMaterial');
const ExamScore = require('../models/ExamScore');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ClassSchedule = require('../models/ClassSchedule');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const LeaveApplication = require('../models/LeaveApplication');
const TeacherGrading = require('../models/TeacherGrading');
const storageService = require('../services/storageService');
const notificationService = require('../services/notificationService');
const { logDev, warnDev, errorCrit } = require('../utils/logger');

const getMaterialTypeFromMime = (mimeType = '') => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType === 'text/plain'
  ) {
    return 'ppt';
  }
  return 'image';
};

const getTeacherStudentFilter = async () => {
  const students = await User.find({
    role: 'student',
    isActive: true,
  }).select('_id');

  return students.map((student) => student._id.toString());
};

// @desc    Get teacher dashboard
// @route   GET /api/teacher/dashboard
// @access  Teacher
const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayClasses, teacherStudentIds, pendingLeaves, totalMaterials] = await Promise.all([
      ClassSchedule.find({
        teacherId,
        scheduledDate: { $gte: today, $lt: tomorrow },
      }).select('-meetLink').populate('studentIds', 'name grade'),
      getTeacherStudentFilter(),
      require('../models/LeaveApplication').countDocuments({ applicant: teacherId, status: 'pending' }),
      StudyMaterial.countDocuments({ teacher: teacherId }),
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        todayClasses,
        totalStudents: teacherStudentIds.length,
        pendingLeaves,
        totalMaterials,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher's students
// @route   GET /api/teacher/students
// @access  Teacher
const getMyStudents = async (req, res) => {
  try {
    // Students expose their info to teacher, but NOT phone/email to students
    const studentIds = await getTeacherStudentFilter();

    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
      isActive: true,
    })
      .select('-password -refreshToken')
      .populate('course', 'title category');

    res.status(200).json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Post live class link
// @route   POST /api/teacher/live-class
// @access  Teacher
const postLiveClass = async (req, res) => {
  try {
    const { subject, title, joinLink, platform, scheduledDate, scheduledTime, duration, enrolledStudents } = req.body;

    const liveClass = await LiveClass.create({
      teacher: req.user._id,
      subject,
      title,
      joinLink,
      platform: platform || 'meet',
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      duration: duration || 60,
      enrolledStudents: enrolledStudents || [],
    });

    // Notify enrolled students
    if (enrolledStudents && enrolledStudents.length > 0) {
      await notificationService.sendBulkNotifications({
        recipientIds: enrolledStudents,
        senderId: req.user._id,
        type: 'live_class',
        title: `Class Scheduled: ${subject}`,
        message: `${req.user.name} has scheduled a class on ${scheduledDate} at ${scheduledTime}`,
        link: '/student/dashboard',
        referenceId: liveClass._id,
        referenceType: 'LiveClass',
        io: req.app.get('io'),
      });
    }

    res.status(201).json({ success: true, liveClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark class completed
// @route   PUT /api/teacher/live-class/:id/complete
// @access  Teacher
const markClassCompleted = async (req, res) => {
  try {
    const liveClass = await LiveClass.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    if (!liveClass) return res.status(404).json({ success: false, message: 'Class not found.' });
    res.status(200).json({ success: true, liveClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload study material
// @route   POST /api/teacher/materials
// @access  Teacher
// 
// PRODUCTION-READY implementation:
// - Handles all file types (PDF, DOCX, PPTX, XLSX, images, videos, ZIP, RAR, TXT)
// - Stores large files on disk, streams to Cloudinary (no RAM bloat)
// - Preserves original filename and extension
// - Generates proper download URLs
// - Auto-cleanup of temp files after upload
const uploadMaterial = async (req, res) => {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file.',
      });
    }

    const { title, description, subject, grade, course, lockedForAll } = req.body;

    // Validate required fields
    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Title and subject are required.',
      });
    }

    logDev('[Teacher Upload] Starting upload');

    let uploadResult;

    // Determine upload strategy based on file location
    // diskStorage: req.file.path is set (large files)
    // memoryStorage: req.file.buffer is set (small files)
    if (req.file.path) {
      // DISK STORAGE PATH: Stream from disk to Cloudinary
      // This is for large files (200MB+ study materials, videos, archives)
      logDev('[Teacher Upload] Using disk storage');
      
      uploadResult = await storageService.uploadFileFromDisk(
        req.file.path,
        req.file.mimetype,
        req.file.originalname,
        'materials/study-materials'
      );
    } else if (req.file.buffer) {
      // MEMORY STORAGE PATH: Buffer to Cloudinary
      // This is for small files (avatars, small images)
      logDev('[Teacher Upload] Using memory storage (buffer)');
      
      uploadResult = await storageService.uploadFileFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        'materials/study-materials'
      );
    } else {
      throw new Error('No file buffer or path available');
    }

    logDev('[Teacher Upload] Upload successful, saving to database');

    // Build material payload with full metadata
    const materialPayload = {
      title: title.trim(),
      description: description ? description.trim() : '',
      type: getMaterialTypeFromMime(req.file.mimetype),
      subject: subject.trim(),
      grade: grade || undefined,
      course: course || undefined,
      teacher: req.user._id,
      
      // Storage identifiers
      fileUrl: uploadResult.fileUrl,
      publicId: uploadResult.publicId,
      storageType: uploadResult.storageType,
      
      // NEW: Complete file metadata for downloads
      originalFilename: uploadResult.originalFilename,
      extension: uploadResult.extension,
      resourceType: uploadResult.resourceType,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      
      // Access control (locked by default)
      lockedForAll: lockedForAll !== 'false',
    };

    // S3-specific fields (if applicable)
    if (uploadResult.storageType === 's3') {
      materialPayload.s3Key = uploadResult.publicId;
      materialPayload.s3Bucket = process.env.AWS_S3_BUCKET;
    }

    // Save to database
    const material = await StudyMaterial.create(materialPayload);

    // Generate PDF thumbnail if file is PDF
    if (req.file.mimetype === 'application/pdf' && uploadResult.publicId) {
      try {
        const thumbnailUrl = storageService.getPdfThumbnailUrl
          ? storageService.getPdfThumbnailUrl(uploadResult.publicId)
          : '';
        if (thumbnailUrl) {
          material.thumbnailUrl = thumbnailUrl;
          await material.save();
        }
      } catch (thumbErr) {
        warnDev('[Teacher Upload] Thumbnail generation failed:', thumbErr.message);
        // Non-critical, don't fail the upload
      }
    }

    logDev('[Teacher Upload] Complete');

    res.status(201).json({
      success: true,
      material,
      message: `Material uploaded successfully: ${uploadResult.originalFilename}`,
    });
  } catch (error) {
    errorCrit('[Teacher Upload] Error:', error.message);
    
    // Clean up file if on disk
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, (err) => {
          if (err) warnDev('[Cleanup] Failed to delete temp file:', err.message);
        });
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload material. Please try again.',
    });
  }
};

// @desc    Edit a material
// @route   PUT /api/teacher/materials/:id
// @access  Teacher
const editMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }
    res.status(200).json({ success: true, material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a material
// @route   DELETE /api/teacher/materials/:id
// @access  Teacher
const deleteMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }
    res.status(200).json({ success: true, message: 'Material deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Toggle material lock for student
// @route   PUT /api/teacher/materials/:id/lock
// @access  Teacher
const toggleMaterialLock = async (req, res) => {
  try {
    const { studentId, unlock, lockedForAll } = req.body;
    const material = await StudyMaterial.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!material) return res.status(404).json({ success: false, message: 'Material not found.' });

    const hasLockedForAll = typeof lockedForAll === 'boolean';
    if (hasLockedForAll) {
      material.lockedForAll = lockedForAll;
      if (!lockedForAll) {
        // Global unlock clears per-student overrides.
        material.lockedFor = [];
        material.unlockedFor = [];
      }
      await material.save();
      return res.status(200).json({ success: true, material });
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required for per-student lock changes.' });
    }

    if (unlock) {
      // Add to unlockedFor, remove from lockedFor
      if (!material.unlockedFor.includes(studentId)) {
        material.unlockedFor.push(studentId);
      }
      material.lockedFor = material.lockedFor.filter((id) => id.toString() !== studentId);
    } else {
      // Add to lockedFor, remove from unlockedFor
      if (!material.lockedFor.includes(studentId)) {
        material.lockedFor.push(studentId);
      }
      material.unlockedFor = material.unlockedFor.filter((id) => id.toString() !== studentId);
    }

    await material.save();

    if (unlock) {
      await notificationService.sendNotification({
        recipientId: studentId,
        senderId: req.user._id,
        type: 'study_material',
        title: 'Study Material Unlocked!',
        message: `"${material.title}" (${material.subject}) is now available for you to study.`,
        link: '/student/materials',
        referenceId: material._id,
        referenceType: 'StudyMaterial',
        io: req.app.get('io'),
      });
    }

    res.status(200).json({ success: true, material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher's materials
// @route   GET /api/teacher/materials
// @access  Teacher
const getTeacherMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Enter exam scores
// @route   POST /api/teacher/scores
// @access  Teacher
const enterExamScore = async (req, res) => {
  try {
    const { student, subject, examTitle, examType, maxMarks, marksObtained, examDate, weekNumber, remarks } = req.body;

    const score = await ExamScore.create({
      student,
      teacher: req.user._id,
      subject,
      examTitle,
      examType: examType || 'weekly',
      maxMarks,
      marksObtained,
      examDate: new Date(examDate),
      weekNumber,
      month: new Date(examDate).toLocaleString('default', { month: 'long' }),
      year: new Date(examDate).getFullYear(),
      remarks,
      isPublished: true,
    });

    await notificationService.sendNotification({
      recipientId: student,
      senderId: req.user._id,
      type: 'general',
      title: `New Score: ${examTitle}`,
      message: `Your ${subject} score has been entered: ${marksObtained}/${maxMarks}`,
      link: '/student/exam-scores',
      referenceId: score._id,
      referenceType: 'ExamScore',
      io: req.app.get('io'),
    });

    res.status(201).json({ success: true, score });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recent exam scores entered by teacher
// @route   GET /api/teacher/scores/recent
// @access  Teacher
const getRecentScores = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const scores = await ExamScore.find({ teacher: req.user._id })
      .populate('student', 'name displayName grade')
      .sort({ examDate: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.status(200).json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark attendance
// @route   POST /api/teacher/attendance
// @access  Teacher
const markAttendance = async (req, res) => {
  try {
    const { attendanceList, liveClassId, date } = req.body;
    // attendanceList: [{ student, status, loginTime }]
    const operations = attendanceList.map((item) => ({
      updateOne: {
        filter: { student: item.student, date: new Date(date), liveClass: liveClassId },
        update: {
          $set: {
            teacher: req.user._id,
            liveClass: liveClassId,
            date: new Date(date),
            status: item.status,
            loginTime: item.loginTime ? new Date(item.loginTime) : undefined,
            markedBy: 'teacher',
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);
    res.status(200).json({ success: true, message: 'Attendance marked successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher's monthly grading report
// @route   GET /api/teacher/grading/:month/:year
// @access  Teacher
const getMonthlyGrading = async (req, res) => {
  try {
    const { month, year } = req.params;
    const grading = await TeacherGrading.findOne({
      teacher: req.user._id,
      monthNumber: parseInt(month),
      year: parseInt(year),
    });

    res.status(200).json({ success: true, grading });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Apply for leave (teacher)
// @route   POST /api/teacher/leave
// @access  Teacher
const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const leave = await LeaveApplication.create({
      applicant: req.user._id,
      applicantRole: 'teacher',
      leaveType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
    });

    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const applicantName = req.user.name || req.user.displayName || 'A user';
      const leaveMessage = `${applicantName} applied for leave from ${new Date(fromDate).toDateString()} to ${new Date(toDate).toDateString()}`;

      if (admins.length > 1) {
        await notificationService.sendBulkNotifications({
          recipientIds: admins.map((admin) => admin._id),
          senderId: req.user._id,
          type: 'leave_applied',
          title: 'New Leave Application',
          message: leaveMessage,
          referenceId: leave._id,
          referenceType: 'LeaveApplication',
          link: '/admin/leaves',
          io: req.app.get('io'),
        });
      } else if (admins.length === 1) {
        await notificationService.sendNotification({
          recipientId: admins[0]._id,
          senderId: req.user._id,
          type: 'leave_applied',
          title: 'New Leave Application',
          message: leaveMessage,
          referenceId: leave._id,
          referenceType: 'LeaveApplication',
          link: '/admin/leaves',
          io: req.app.get('io'),
        });
      }
    } catch (notificationError) {
      errorCrit('[Teacher] Leave notification failed:', notificationError.message);
    }

    res.status(201).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher's leave applications
// @route   GET /api/teacher/leave
// @access  Teacher
const getTeacherLeaves = async (req, res) => {
  try {
    const leaves = await LeaveApplication.find({ applicant: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTeacherDashboard,
  getMyStudents,
  postLiveClass,
  markClassCompleted,
  uploadMaterial,
  editMaterial,
  deleteMaterial,
  toggleMaterialLock,
  getTeacherMaterials,
  enterExamScore,
  getRecentScores,
  markAttendance,
  getMonthlyGrading,
  applyLeave,
  getTeacherLeaves,
};
