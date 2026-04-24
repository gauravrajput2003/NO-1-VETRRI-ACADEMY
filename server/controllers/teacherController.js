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

    const [todayClasses, myStudents, pendingLeaves, totalMaterials] = await Promise.all([
      ClassSchedule.find({
        teacherId,
        scheduledDate: { $gte: today, $lt: tomorrow },
      }).select('-meetLink').populate('studentIds', 'name grade'),
      User.countDocuments({ assignedTeacher: teacherId, role: 'student', isActive: true }),
      require('../models/LeaveApplication').countDocuments({ applicant: teacherId, status: 'pending' }),
      StudyMaterial.countDocuments({ teacher: teacherId }),
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        todayClasses,
        totalStudents: myStudents,
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
    const students = await User.find({
      assignedTeacher: req.user._id,
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
      const notifications = enrolledStudents.map((studentId) => ({
        recipient: studentId,
        sender: req.user._id,
        type: 'class_reminder',
        title: `Class Scheduled: ${subject}`,
        message: `${req.user.name} has scheduled a class on ${scheduledDate} at ${scheduledTime}`,
        link: '/student/dashboard',
        data: { liveClassId: liveClass._id },
      }));
      await Notification.insertMany(notifications);
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

// @desc    Upload study material (S3)
// @route   POST /api/teacher/materials
// @access  Teacher
const uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { title, description, subject, grade, course, lockedForAll } = req.body;

    const material = await StudyMaterial.create({
      title,
      description,
      type: req.file.mimetype.startsWith('video/')
        ? 'video'
        : req.file.mimetype === 'application/pdf'
        ? 'pdf'
        : req.file.mimetype.includes('presentation')
        ? 'ppt'
        : 'image',
      subject,
      grade,
      course: course || undefined,
      teacher: req.user._id,
      s3Key: req.file.key,
      s3Bucket: req.file.bucket,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      lockedForAll: lockedForAll !== 'false',
    });

    res.status(201).json({ success: true, material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle material lock for student
// @route   PUT /api/teacher/materials/:id/lock
// @access  Teacher
const toggleMaterialLock = async (req, res) => {
  try {
    const { studentId, unlock } = req.body;
    const material = await StudyMaterial.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!material) return res.status(404).json({ success: false, message: 'Material not found.' });

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
      // Notify student in real-time
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${studentId}`).emit('material:unlocked', {
          materialId: material._id,
          title: material.title,
          subject: material.subject,
          type: material.type,
          unlockedAt: new Date()
        });
      }

      // Create persistent notification in DB
      await Notification.create({
        recipient: studentId,
        sender: req.user._id,
        type: 'material_unlocked',
        title: 'Study Material Unlocked!',
        message: `"${material.title}" (${material.subject}) is now available for you to study.`,
        link: '/student/materials',
        data: { materialId: material._id }
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

    // Notify student
    await Notification.create({
      recipient: student,
      sender: req.user._id,
      type: 'new_score',
      title: `New Score: ${examTitle}`,
      message: `Your ${subject} score has been entered: ${marksObtained}/${maxMarks}`,
      link: '/student/exam-scores',
      data: { scoreId: score._id },
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
  toggleMaterialLock,
  getTeacherMaterials,
  enterExamScore,
  getRecentScores,
  markAttendance,
  getMonthlyGrading,
  applyLeave,
  getTeacherLeaves,
};
