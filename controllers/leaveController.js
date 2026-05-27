const LeaveApplication = require('../models/LeaveApplication');
const Notification = require('../models/Notification');
const TeacherGrading = require('../models/TeacherGrading');
const User = require('../models/User');
const LiveClass = require('../models/LiveClass');
const Attendance = require('../models/Attendance');

// @desc    Get all pending leaves (admin)
// @route   GET /api/leaves
// @access  Admin
const getAllLeaves = async (req, res) => {
  try {
    const { status, role } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.applicantRole = role;

    const leaves = await LeaveApplication.find(filter)
      .populate('applicant', 'name mobile role grade')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or reject leave (admin)
// @route   PUT /api/leaves/:id
// @access  Admin
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, adminRemarks } = req.body;

    const leave = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status, adminRemarks, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate('applicant', 'name');

    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });

    // Notify applicant
    await Notification.create({
      recipient: leave.applicant._id,
      sender: req.user._id,
      type: 'leave_update',
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your leave application from ${leave.fromDate.toDateString()} has been ${status}.`,
      link: leave.applicantRole === 'student' ? '/student/leave' : '/teacher/leave',
    });

    res.status(200).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get best teacher of month
// @route   GET /api/admin/best-teacher
// @access  Admin
const getBestTeacher = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const gradings = await TeacherGrading.find({
      monthNumber: currentMonth,
      year: currentYear,
    })
      .populate('teacher', 'name qualification subjects profileImage')
      .sort({ totalScore: -1 });

    // Mark best teacher
    if (gradings.length > 0 && !gradings[0].isBestTeacher) {
      await TeacherGrading.findByIdAndUpdate(gradings[0]._id, { isBestTeacher: true, rank: 1 });
      for (let i = 1; i < gradings.length; i++) {
        await TeacherGrading.findByIdAndUpdate(gradings[i]._id, { rank: i + 1 });
      }
    }

    res.status(200).json({ success: true, gradings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Grade teacher (admin)
// @route   POST /api/admin/grade-teacher
// @access  Admin
const gradeTeacher = async (req, res) => {
  try {
    const {
      teacher, month, monthNumber, year,
      loginPunctuality, questionPaperOnTime, answerSheetReturn,
      leaveScore, professionalAppearance, networkIssues, parentRating,
      remarks,
    } = req.body;

    const grading = await TeacherGrading.findOneAndUpdate(
      { teacher, monthNumber, year },
      {
        teacher, month, monthNumber, year,
        loginPunctuality, questionPaperOnTime, answerSheetReturn,
        leaveScore, professionalAppearance, networkIssues, parentRating,
        remarks, gradedBy: req.user._id, gradedAt: new Date(),
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('teacher', 'name');

    res.status(200).json({ success: true, grading });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Live Class Monitor (admin — real-time)
// @route   GET /api/admin/live-monitor
// @access  Admin
const getLiveMonitor = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const liveClasses = await LiveClass.find({
      scheduledDate: { $gte: today, $lt: tomorrow },
    })
      .populate('teacher', 'name mobile email') // Admin sees teacher contact
      .populate('enrolledStudents', 'name grade board')
      .sort({ scheduledTime: 1 });

    // Get attendance for today
    const classIds = liveClasses.map((c) => c._id);
    const attendanceToday = await Attendance.find({
      liveClass: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).populate('student', 'name grade');

    // Build monitor data
    const monitorData = liveClasses.flatMap((liveClass) => {
      return (liveClass.enrolledStudents || []).map((student) => {
        const att = attendanceToday.find(
          (a) => a.student._id.toString() === student._id.toString() && a.liveClass.toString() === liveClass._id.toString()
        );
        return {
          studentName: student.name,
          studentGrade: student.grade,
          course: liveClass.subject,
          teacher: liveClass.teacher.name,
          scheduledTime: liveClass.scheduledTime,
          loginTime: att?.loginTime || null,
          status: att ? att.status : 'not_yet',
          liveClassId: liveClass._id,
          studentId: student._id,
        };
      });
    });

    res.status(200).json({ success: true, monitor: monitorData, liveClasses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllLeaves,
  updateLeaveStatus,
  getBestTeacher,
  gradeTeacher,
  getLiveMonitor,
};
