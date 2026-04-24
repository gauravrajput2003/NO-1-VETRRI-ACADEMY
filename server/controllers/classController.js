const ClassSchedule = require('../models/ClassSchedule');
const ClassAttendance = require('../models/ClassAttendance');
const LiveSession = require('../models/LiveSession');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary, getResourceType } = require('../middleware/upload');

// ─── Admin: Create Schedule ───────────────────────────────────────────────────
const createSchedule = async (req, res) => {
  try {
    const {
      title, course, board, subject, grade,
      scheduledDate, scheduledTime, durationMinutes, repeatType,
      dayOfWeek, academicYear, batch, notes,
    } = req.body;

    const teacherId = req.body.teacherId || req.body.teacher;
    const studentIds = req.body.studentIds || req.body.students || [];

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'teacherId is required' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'scheduledDate is required' });
    }
    if (!scheduledTime || !/^\d{1,2}:\d{2}$/.test(scheduledTime)) {
      return res.status(400).json({ success: false, message: 'scheduledTime must be in HH:MM format' });
    }

    const parsedScheduledDate = new Date(scheduledDate);
    if (Number.isNaN(parsedScheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: 'scheduledDate is invalid' });
    }

    const schedule = await ClassSchedule.create({
      title, course, board, subject, grade,
      teacherId, studentIds,
      scheduledDate: parsedScheduledDate,
      scheduledTime, durationMinutes: durationMinutes || 60,
      repeatType: repeatType || 'once',
      dayOfWeek, academicYear, batch, notes,
    });

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Schedules (role-filtered, NEVER includes meetLink) ──────────────────
const getSchedules = async (req, res) => {
  try {
    const { page = 1, limit = 20, course, grade, status, from, to } = req.query;
    const user = req.user;

    let filter = {};

    if (user.role === 'student') {
      filter.studentIds = user._id;
    } else if (user.role === 'teacher') {
      filter.teacherId = user._id;
    }
    // Admin: no filter — sees all

    if (course) filter.course = course;
    if (grade) filter.grade = grade;
    if (status) filter.status = status;
    if (from || to) {
      filter.scheduledDate = {};
      if (from) filter.scheduledDate.$gte = new Date(from);
      if (to) filter.scheduledDate.$lte = new Date(to);
    }

    const schedules = await ClassSchedule.find(filter)
      .select('-meetLink') // SECURITY: never expose meetLink in listings
      .populate('teacherId', 'name displayName subjects profilePic')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ClassSchedule.countDocuments(filter);

    // Add recordingUrl but NOT meetLink
    res.json({ success: true, schedules, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Today's Classes ──────────────────────────────────────────────────────
const getTodayClasses = async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filter = { scheduledDate: { $gte: today, $lt: tomorrow } };

    if (user.role === 'student') filter.studentIds = user._id;
    else if (user.role === 'teacher') filter.teacherId = user._id;

    const classes = await ClassSchedule.find(filter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName profilePic subjects')
      .sort({ scheduledTime: 1 });

    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Upcoming Classes (next 7 days) ───────────────────────────────────────
const getUpcomingClasses = async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let filter = { scheduledDate: { $gte: today, $lte: nextWeek } };
    if (user.role === 'student') filter.studentIds = user._id;
    else if (user.role === 'teacher') filter.teacherId = user._id;

    const classes = await ClassSchedule.find(filter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName profilePic')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Calendar Data ────────────────────────────────────────────────────────
const getCalendarData = async (req, res) => {
  try {
    const user = req.user;
    const { month, year } = req.query;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    let filter = { scheduledDate: { $gte: start, $lte: end } };
    if (user.role === 'student') filter.studentIds = user._id;
    else if (user.role === 'teacher') filter.teacherId = user._id;

    const classes = await ClassSchedule.find(filter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName')
      .sort({ scheduledDate: 1 });

    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Teacher: Go Live ─────────────────────────────────────────────────────────
const goLive = async (req, res) => {
  try {
    const { meetLink, meetLinkType } = req.body;
    const classId = req.params.id;
    const io = req.app.get('io');

    // Validate URL format
    try { new URL(meetLink); } catch {
      return res.status(400).json({ success: false, message: 'Invalid meeting link URL.' });
    }

    const cls = await ClassSchedule.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (cls.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your class.' });
    }
    if (cls.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: `Class is already ${cls.status}.` });
    }

    // Update class status + store meetLink securely
    cls.status = 'live';
    cls.meetLink = meetLink;
    cls.meetLinkType = meetLinkType || 'googlemeet';
    await cls.save();

    // Create LiveSession
    const session = await LiveSession.create({
      classId,
      teacherId: req.user._id,
      meetLink,
      meetLinkType: meetLinkType || 'googlemeet',
      isLive: true,
      startedAt: new Date(),
    });

    // Notify enrolled students
    const notifications = cls.studentIds.map((sid) => ({
      recipient: sid,
      sender: req.user._id,
      type: 'class_starting',
      title: `Class is Live: ${cls.subject}`,
      message: `${req.user.displayName || req.user.name}'s ${cls.subject} class is now live. Join now!`,
      link: '/student/classes',
      data: { classId },
    }));
    await Notification.insertMany(notifications);

    // Emit to course room — NO meetLink in socket event
    const room = `course_${cls.course}_${cls.grade}`;
    io.to(room).emit('class:started', {
      classId,
      subject: cls.subject,
      teacherName: req.user.displayName || req.user.name,
      grade: cls.grade,
      course: cls.course,
      sessionId: session._id,
    });

    // Notify admin room
    io.to('admin_room').emit('class:started', { classId, subject: cls.subject, teacherId: req.user._id });

    res.json({ success: true, message: 'Class is now live!', sessionId: session._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Student: Join Class (ONLY place meetLink is returned) ───────────────────
const joinClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const studentId = req.user._id;
    const io = req.app.get('io');

    const cls = await ClassSchedule.findById(classId).populate('teacherId', 'name displayName');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Validate student is enrolled
    const isEnrolled = cls.studentIds.some((id) => id.toString() === studentId.toString());
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this class.' });
    }

    if (cls.status !== 'live') {
      return res.status(400).json({ success: false, message: 'Class is not live yet.' });
    }

    // Get meetLink from LiveSession (not directly from ClassSchedule in response)
    const session = await LiveSession.findOne({ classId, isLive: true });
    if (!session) return res.status(404).json({ success: false, message: 'Live session not found.' });

    // Record attendance
    const today = new Date().toISOString().split('T')[0];
    const joinTime = new Date();

    // Determine if late (10+ min after session start)
    const minsAfterStart = session.startedAt
      ? Math.round((joinTime - session.startedAt) / 60000)
      : 0;
    const status = minsAfterStart >= 10 ? 'late' : 'present';

    await ClassAttendance.findOneAndUpdate(
      { classId, studentId },
      {
        classId, studentId, joinTime,
        status, date: today,
      },
      { upsert: true, new: true }
    );

    // Update LiveSession stats
    await LiveSession.findByIdAndUpdate(session._id, {
      $inc: { totalJoined: 1 },
    });

    // Update peakStudentCount
    const joinedCount = await ClassAttendance.countDocuments({ classId, status: { $in: ['present', 'late'] } });
    await LiveSession.findByIdAndUpdate(session._id, {
      $max: { peakStudentCount: joinedCount },
    });

    // Notify teacher room
    io.to(`teacher_${cls.teacherId._id}`).emit('student:joined', {
      studentName: req.user.displayName || req.user.name,
      count: joinedCount,
      classId,
    });

    // Notify admin room
    io.to('admin_room').emit('attendance:updated', { classId, presentCount: joinedCount });

    // Return meetLink HERE ONLY
    res.json({
      success: true,
      meetLink: session.meetLink,
      status,
      message: status === 'late' ? 'You joined late. Attendance marked as LATE.' : 'Attendance recorded!',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Teacher: End Class ───────────────────────────────────────────────────────
const endClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const io = req.app.get('io');

    const cls = await ClassSchedule.findOne({ _id: classId, teacherId: req.user._id });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    cls.status = 'completed';
    await cls.save();

    // End LiveSession
    await LiveSession.findOneAndUpdate(
      { classId, isLive: true },
      { isLive: false, endedAt: new Date() }
    );

    // Mark all enrolled students who didn't join as absent
    const joined = await ClassAttendance.distinct('studentId', { classId });
    const joinedIds = joined.map((id) => id.toString());

    const absentOps = cls.studentIds
      .filter((sid) => !joinedIds.includes(sid.toString()))
      .map((sid) => ({
        updateOne: {
          filter: { classId, studentId: sid },
          update: { $setOnInsert: { classId, studentId: sid, status: 'absent', date: new Date().toISOString().split('T')[0] } },
          upsert: true,
        },
      }));

    if (absentOps.length > 0) await ClassAttendance.bulkWrite(absentOps);

    // Emit
    const room = `course_${cls.course}_${cls.grade}`;
    io.to(room).emit('class:ended', { classId });
    io.to('admin_room').emit('class:ended', { classId });

    res.json({ success: true, message: 'Class ended.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Teacher: Upload Recording ────────────────────────────────────────────────
const uploadRecording = async (req, res) => {
  try {
    const classId = req.params.id;
    const io = req.app.get('io');
    const { recordingUrl, recordingPublicId, recordingDuration } = req.body;

    const cls = await ClassSchedule.findOneAndUpdate(
      { _id: classId, teacherId: req.user._id },
      {
        recordingUrl,
        recordingPublicId,
        recordingDuration: recordingDuration || 0,
        recordingUploadedAt: new Date(),
      },
      { new: true }
    );

    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Notify students
    const notifications = cls.studentIds.map((sid) => ({
      recipient: sid,
      sender: req.user._id,
      type: 'recording_available',
      title: `Recording Available: ${cls.subject}`,
      message: `The recording for ${cls.subject} class is now available.`,
      link: '/student/classes',
      data: { classId },
    }));
    await Notification.insertMany(notifications);

    // Emit to course room
    const room = `course_${cls.course}_${cls.grade}`;
    io.to(room).emit('recording:available', { classId, subject: cls.subject });

    res.json({ success: true, message: 'Recording saved!', recordingUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Cloudinary Signature for Direct Upload ───────────────────────────────
const getUploadSignature = async (req, res) => {
  try {
    const { folder = 'vettri-academy/recordings' } = req.body;
    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder, resource_type: 'video' },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success: true,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Attendance for a Class ───────────────────────────────────────────────
const getClassAttendance = async (req, res) => {
  try {
    const classId = req.params.id;
    const cls = await ClassSchedule.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Only teacher of the class or admin
    if (req.user.role === 'teacher' && cls.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const attendance = await ClassAttendance.find({ classId })
      .populate('studentId', 'name grade profilePic displayName')
      .populate('markedBy', 'name');

    res.json({ success: true, attendance, totalStudents: cls.studentIds.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Update Schedule ───────────────────────────────────────────────────
const updateSchedule = async (req, res) => {
  try {
    const schedule = await ClassSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found.' });
    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Cancel Schedule ───────────────────────────────────────────────────
const cancelSchedule = async (req, res) => {
  try {
    const { reason } = req.body;
    const io = req.app.get('io');

    const cls = await ClassSchedule.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelReason: reason },
      { new: true }
    );
    if (!cls) return res.status(404).json({ success: false, message: 'Schedule not found.' });

    // Emit cancellation
    const room = `course_${cls.course}_${cls.grade}`;
    io.to(room).emit('class:cancelled', { classId: cls._id, reason });

    res.json({ success: true, message: 'Class cancelled.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Generate Full Year Schedule ──────────────────────────────────────
const generateYearSchedule = async (req, res) => {
  try {
    const {
      course, board, grade, subject,
      startDate, endDate, scheduledTime, durationMinutes,
      repeatType, dayOfWeek, academicYear,
    } = req.body;

    const teacherId = req.body.teacherId || req.body.teacher;
    const studentIds = req.body.studentIds || req.body.students || [];

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'teacherId is required' });
    }
    if (!startDate) {
      return res.status(400).json({ success: false, message: 'startDate is required' });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    const schedules = [];
    const current = new Date(start);

    while (current <= end) {
      const shouldAdd =
        repeatType === 'daily' ||
        (repeatType === 'weekly' && current.getDay() === parseInt(dayOfWeek)) ||
        (repeatType === 'once' && current.toDateString() === start.toDateString());

      if (shouldAdd) {
        schedules.push({
          course, board, grade, subject, teacherId,
          studentIds: studentIds || [],
          scheduledDate: new Date(current),
          scheduledTime,
          durationMinutes: durationMinutes || 60,
          repeatType, dayOfWeek, academicYear,
          status: 'scheduled',
        });
      }

      if (repeatType === 'daily') current.setDate(current.getDate() + 1);
      else if (repeatType === 'weekly') current.setDate(current.getDate() + 7);
      else break;

      // Safety limit
      if (schedules.length >= 400) break;
    }

    const created = await ClassSchedule.insertMany(schedules);
    res.status(201).json({ success: true, created: created.length, message: `${created.length} classes scheduled.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Manual Attendance Override ───────────────────────────────────────
const manualAttendance = async (req, res) => {
  try {
    const { classId, studentId, status, reason } = req.body;
    const record = await ClassAttendance.findOneAndUpdate(
      { classId, studentId },
      { status, isManualEntry: true, markedBy: req.user._id, manualReason: reason },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Live Monitor ──────────────────────────────────────────────────────
const getLiveMonitor = async (req, res) => {
  try {
    const { date, course, grade, teacherId } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let classFilter = { scheduledDate: { $gte: targetDate, $lt: nextDay } };
    if (course) classFilter.course = course;
    if (grade) classFilter.grade = grade;
    if (teacherId) classFilter.teacherId = teacherId;

    const classes = await ClassSchedule.find(classFilter)
      .select('-meetLink')
      .populate('teacherId', 'name displayName');

    const classIds = classes.map((c) => c._id);
    const attendance = await ClassAttendance.find({ classId: { $in: classIds } })
      .populate('studentId', 'name grade course profilePic displayName');

    res.json({ success: true, classes, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Class Details (meetLink excluded for students unless live) ────────────
const getClassDetails = async (req, res) => {
  try {
    const cls = await ClassSchedule.findById(req.params.id)
      .populate('teacherId', 'name displayName profilePic subjects teacherBio')
      .populate('studentIds', 'name grade profilePic');

    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const obj = cls.toObject();
    // SECURITY: Remove meetLink for students (they must call /join)
    if (req.user.role === 'student') {
      delete obj.meetLink;
    }
    res.json({ success: true, class: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getTodayClasses,
  getUpcomingClasses,
  getCalendarData,
  goLive,
  joinClass,
  endClass,
  uploadRecording,
  getUploadSignature,
  getClassAttendance,
  updateSchedule,
  cancelSchedule,
  generateYearSchedule,
  manualAttendance,
  getLiveMonitor,
  getClassDetails,
};
