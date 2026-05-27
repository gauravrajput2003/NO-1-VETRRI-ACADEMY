const LoginLog = require('../models/LoginLog');
const ClassAttendance = require('../models/ClassAttendance');
const ClassSchedule = require('../models/ClassSchedule');
const User = require('../models/User');

// ─── Login Attendance: My Logs ────────────────────────────────────────────────
const getMyLoginLogs = async (req, res) => {
  try {
    const { month, year, page = 1, limit = 31 } = req.query;
    const filter = { userId: req.user._id };

    if (month && year) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      filter.date = { $gte: start, $lte: end };
    }

    const logs = await LoginLog.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await LoginLog.countDocuments(filter);

    // Summary stats
    const thisMonth = logs.reduce(
      (acc, l) => {
        acc.days++;
        acc.totalMinutes += l.sessionDuration || 0;
        return acc;
      },
      { days: 0, totalMinutes: 0 }
    );

    res.json({
      success: true,
      logs,
      total,
      summary: {
        loginDays: thisMonth.days,
        avgSessionMinutes: thisMonth.days > 0 ? Math.round(thisMonth.totalMinutes / thisMonth.days) : 0,
        currentStreak: req.user.loginStreak,
        longestStreak: req.user.longestStreak,
        totalLoginDays: req.user.totalLoginDays,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: All Login Logs ────────────────────────────────────────────────────
const getAllLoginLogs = async (req, res) => {
  try {
    const { role, date, userId, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (role) filter.userRole = role;
    if (date) filter.date = date;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const logs = await LoginLog.find(filter)
      .populate('userId', 'name displayName role profilePic')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await LoginLog.countDocuments(filter);

    res.json({ success: true, logs, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Today's Logins ────────────────────────────────────────────────────
const getTodayLogins = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logs = await LoginLog.find({ date: today })
      .populate('userId', 'name displayName role profilePic grade')
      .sort({ loginTime: -1 });

    const summary = {
      total: logs.length,
      students: logs.filter((l) => l.userRole === 'student').length,
      teachers: logs.filter((l) => l.userRole === 'teacher').length,
      admins: logs.filter((l) => l.userRole === 'admin').length,
    };

    res.json({ success: true, logs, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Login Streak for a User ─────────────────────────────────────────────
const getLoginStreak = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('loginStreak longestStreak totalLoginDays lastLoginDate');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, streak: { current: user.loginStreak, longest: user.longestStreak, total: user.totalLoginDays } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Monthly Login Summary ────────────────────────────────────────────────────
const getMonthlySummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-31`;

    const logs = await LoginLog.find({ userId, date: { $gte: start, $lte: end } });

    const totalMinutes = logs.reduce((sum, l) => sum + (l.sessionDuration || 0), 0);
    const devices = logs.reduce((acc, l) => { acc[l.deviceType] = (acc[l.deviceType] || 0) + 1; return acc; }, {});

    res.json({
      success: true,
      summary: {
        loginDays: logs.length,
        totalHours: Math.round(totalMinutes / 60),
        avgSessionMinutes: logs.length > 0 ? Math.round(totalMinutes / logs.length) : 0,
        devices,
      },
      logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Student Class Attendance ─────────────────────────────────────────────────
const getStudentClassAttendance = async (req, res) => {
  try {
    const { month, year, subject, page = 1, limit = 50 } = req.query;
    const studentId = req.params.userId || req.user._id;

    // Find classes for student
    let classFilter = { studentIds: studentId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      classFilter.scheduledDate = { $gte: start, $lte: end };
    }
    if (subject) classFilter.subject = subject;

    const classes = await ClassSchedule.find(classFilter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName');

    const classIds = classes.map((c) => c._id);
    const attendance = await ClassAttendance.find({ classId: { $in: classIds }, studentId })
      .populate('classId', 'subject scheduledDate scheduledTime durationMinutes course grade');

    // Build merged records
    const records = classes.map((cls) => {
      const att = attendance.find((a) => a.classId?._id?.toString() === cls._id.toString());
      return {
        classId: cls._id,
        date: cls.scheduledDate,
        subject: cls.subject,
        scheduledTime: cls.scheduledTime,
        teacherName: cls.teacherId?.displayName || cls.teacherId?.name,
        joinTime: att?.joinTime,
        durationPresent: att?.durationPresent,
        status: att?.status || 'absent',
        isManualEntry: att?.isManualEntry,
      };
    });

    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const attendancePercent = records.length > 0 ? Math.round(((present + late) / records.length) * 100) : 0;

    res.json({
      success: true,
      records,
      summary: {
        total: records.length,
        present, late, absent,
        attendancePercent,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Report: Student Attendance (for reports/export) ─────────────────────────
const getStudentAttendanceReport = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { month, year, subject } = req.query;

    let classFilter = { studentIds: studentId };
    if (month && year) {
      classFilter.scheduledDate = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0),
      };
    }
    if (subject) classFilter.subject = new RegExp(subject, 'i');

    const classes = await ClassSchedule.find(classFilter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName')
      .sort({ scheduledDate: 1 });

    const classIds = classes.map((c) => c._id);
    const attendance = await ClassAttendance.find({ classId: { $in: classIds }, studentId });

    const attMap = new Map(attendance.map((a) => [a.classId.toString(), a]));

    const rows = classes.map((cls) => {
      const att = attMap.get(cls._id.toString());
      return {
        Date: new Date(cls.scheduledDate).toLocaleDateString('en-IN'),
        Subject: cls.subject,
        Teacher: cls.teacherId?.displayName || cls.teacherId?.name || '-',
        'Scheduled Time': cls.scheduledTime,
        'Join Time': att?.joinTime ? new Date(att.joinTime).toLocaleTimeString('en-IN') : '-',
        Duration: att?.durationPresent ? `${att.durationPresent} min` : '-',
        Status: att?.status || 'Absent',
      };
    });

    const present = rows.filter((r) => r.Status === 'present').length;
    const late = rows.filter((r) => r.Status === 'late').length;
    const absent = rows.filter((r) => r.Status === 'Absent').length;

    res.json({
      success: true,
      rows,
      summary: {
        total: rows.length,
        present, late, absent,
        attendancePercent: rows.length > 0 ? Math.round(((present + late) / rows.length) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Report: Teacher's Students Attendance ────────────────────────────────────
const getTeacherStudentsReport = async (req, res) => {
  try {
    const { id: teacherId } = req.params;
    const { classId, dateFrom, dateTo } = req.query;

    let classFilter = { teacherId };
    if (classId) classFilter._id = classId;
    if (dateFrom || dateTo) {
      classFilter.scheduledDate = {};
      if (dateFrom) classFilter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) classFilter.scheduledDate.$lte = new Date(dateTo);
    }

    const classes = await ClassSchedule.find(classFilter)
      .select('-meetLink')
      .sort({ scheduledDate: 1 });

    const classIds = classes.map((c) => c._id);
    const attendance = await ClassAttendance.find({ classId: { $in: classIds } })
      .populate('studentId', 'name grade displayName');

    const rows = attendance.map((att) => {
      const cls = classes.find((c) => c._id.toString() === att.classId.toString());
      return {
        'Student Name': att.studentId?.displayName || att.studentId?.name,
        Grade: att.studentId?.grade,
        Date: cls ? new Date(cls.scheduledDate).toLocaleDateString('en-IN') : '-',
        Subject: cls?.subject || '-',
        'Join Time': att.joinTime ? new Date(att.joinTime).toLocaleTimeString('en-IN') : '-',
        Duration: att.durationPresent ? `${att.durationPresent} min` : '-',
        Status: att.status,
        'Manual Entry': att.isManualEntry ? 'Yes' : 'No',
      };
    });

    res.json({ success: true, rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Report: Admin Full Attendance ───────────────────────────────────────────
const getAdminAttendanceReport = async (req, res) => {
  try {
    const { role, dateFrom, dateTo, course, grade } = req.query;

    // Login logs section
    const logFilter = {};
    if (role) logFilter.userRole = role;
    if (dateFrom || dateTo) {
      logFilter.date = {};
      if (dateFrom) logFilter.date.$gte = dateFrom.substring(0, 10);
      if (dateTo) logFilter.date.$lte = dateTo.substring(0, 10);
    }
    const loginLogs = await LoginLog.find(logFilter)
      .populate('userId', 'name displayName role grade')
      .sort({ date: -1 })
      .limit(500);

    const loginRows = loginLogs.map((l) => ({
      User: l.userId?.displayName || l.userId?.name || 'Unknown',
      Role: l.userRole,
      Date: l.date,
      'Login Time': l.loginTime ? new Date(l.loginTime).toLocaleTimeString('en-IN') : '-',
      'Logout Time': l.logoutTime ? new Date(l.logoutTime).toLocaleTimeString('en-IN') : '-',
      Duration: l.sessionDuration ? `${l.sessionDuration} min` : '-',
      Device: l.deviceType,
    }));

    // Class attendance section
    let classFilter = {};
    if (course) classFilter.course = course;
    if (grade) classFilter.grade = grade;
    if (dateFrom || dateTo) {
      classFilter.scheduledDate = {};
      if (dateFrom) classFilter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) classFilter.scheduledDate.$lte = new Date(dateTo);
    }

    const classes = await ClassSchedule.find(classFilter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName')
      .limit(200);

    const classIds = classes.map((c) => c._id);
    const classAtt = await ClassAttendance.find({ classId: { $in: classIds } })
      .populate('studentId', 'name displayName grade course')
      .populate('classId', 'subject scheduledDate course grade');

    const classRows = classAtt.map((att) => ({
      Student: att.studentId?.displayName || att.studentId?.name,
      Course: att.studentId?.course || att.classId?.course,
      Grade: att.studentId?.grade || att.classId?.grade,
      Subject: att.classId?.subject,
      Date: att.classId?.scheduledDate ? new Date(att.classId.scheduledDate).toLocaleDateString('en-IN') : '-',
      'Join Time': att.joinTime ? new Date(att.joinTime).toLocaleTimeString('en-IN') : '-',
      Status: att.status,
    }));

    res.json({ success: true, loginRows, classRows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Report: Monthly Summary (all students attendance %) ─────────────────────
const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const classes = await ClassSchedule.find({
      scheduledDate: { $gte: start, $lte: end },
    }).select('_id studentIds');

    const classIds = classes.map((c) => c._id);

    const students = await User.find({ role: 'student', isActive: true })
      .select('name displayName grade course profilePic');

    const allAttendance = await ClassAttendance.find({ classId: { $in: classIds } });

    const summary = students.map((student) => {
      const studentClasses = classes.filter((c) =>
        c.studentIds.some((id) => id.toString() === student._id.toString())
      );
      const studentAtt = allAttendance.filter(
        (a) => a.studentId.toString() === student._id.toString()
      );
      const present = studentAtt.filter((a) => a.status === 'present').length;
      const late = studentAtt.filter((a) => a.status === 'late').length;
      const total = studentClasses.length;
      const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        studentId: student._id,
        name: student.displayName || student.name,
        grade: student.grade,
        course: student.course,
        profilePic: student.profilePic,
        totalClasses: total,
        present, late,
        absent: total - present - late,
        attendancePercent: pct,
        riskLevel: pct < 75 ? 'high' : pct < 85 ? 'medium' : 'low',
      };
    });

    // Sort by attendance % ascending (at-risk first)
    summary.sort((a, b) => a.attendancePercent - b.attendancePercent);

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyLoginLogs,
  getAllLoginLogs,
  getTodayLogins,
  getLoginStreak,
  getMonthlySummary,
  getStudentClassAttendance,
  getStudentAttendanceReport,
  getTeacherStudentsReport,
  getAdminAttendanceReport,
  getMonthlyAttendanceSummary,
};
