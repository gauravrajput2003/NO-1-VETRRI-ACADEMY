const ClassSchedule = require('../models/ClassSchedule');
const ClassAttendance = require('../models/ClassAttendance');
const LiveSession = require('../models/LiveSession');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary, getResourceType } = require('../middleware/upload');
const notificationService = require('../services/notificationService');

// ─── Admin: Create Schedule ───────────────────────────────────────────────────
const normalizeCourse = (value) => {
  const raw = String(value || '').trim();
  const courseMap = {
    CBSE: 'CBSE',
    Matric: 'Matric',
    Matriculation: 'Matric',
    Engineering: 'Engineering',
    'Arts College': 'Arts',
    Arts: 'Arts',
    Language: 'Language',
    'Spoken English/Hindi': 'Language',
    'Computer Course': 'Language',
    Competitive: 'Competitive',
    'Competition Exam': 'Competitive',
    'TET & TRB': 'Competitive',
    Others: 'Competitive',
  };
  return courseMap[raw] || raw;
};

const notifyStudentsClassScheduled = async ({ req, schedule }) => {
  const recipientIds = [...new Set((schedule.studentIds || []).map((id) => String(id)).filter(Boolean))];
  if (!recipientIds.length) return;

  const classDate = schedule.scheduledDate
    ? new Date(schedule.scheduledDate).toLocaleDateString('en-IN')
    : 'the scheduled date';

  await notificationService.sendBulkNotifications({
    recipientIds,
    senderId: req.user._id,
    type: 'class_reminder',
    title: 'Class Scheduled',
    message: `${schedule.title || schedule.subject} is scheduled for ${classDate} at ${schedule.scheduledTime}.`,
    link: '/student/classes',
    data: {
      classId: schedule._id,
      route: 'Classes',
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      type: 'class_reminder',
    },
    referenceId: schedule._id,
    referenceType: 'ClassSchedule',
    io: req.app.get('io'),
  });
};

const cleanupStaleLiveClasses = async () => {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const staleClasses = await ClassSchedule.find({
      status: 'live',
      $or: [
        { scheduledDate: { $lt: startOfToday } },
        { updatedAt: { $lt: fourHoursAgo } },
      ],
    });

    if (staleClasses.length > 0) {
      const staleIds = staleClasses.map((c) => c._id);
      await ClassSchedule.updateMany(
        { _id: { $in: staleIds } },
        { $set: { status: 'completed' } }
      );
      await LiveSession.updateMany(
        { classId: { $in: staleIds }, isLive: true },
        { $set: { isLive: false, endedAt: new Date() } }
      );
    }
  } catch (err) {
    console.error('[ClassSchedule] Cleanup stale live classes error:', err.message);
  }
};

const createSchedule = async (req, res) => {
  try {
    const {
      title, course, board, subject, grade,
      scheduledDate, scheduledTime, durationMinutes, repeatType,
      dayOfWeek, academicYear, batch, googleMeetLink, zoomMeetingLink,
    } = req.body;

    const teacherId = req.user.role === 'teacher'
      ? req.user._id
      : (req.body.teacherId || req.body.teacher);
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

    let normalizedCourse = '';
    if (course && String(course).trim()) {
      normalizedCourse = normalizeCourse(course);
      if (!['CBSE', 'Matric', 'Engineering', 'Arts', 'Language', 'Competitive'].includes(normalizedCourse)) {
        return res.status(400).json({ success: false, message: 'Invalid course selected' });
      }
    }

    // PRIVACY ENFORCEMENT: A scheduled class can only contain students assigned strictly to THAT teacher.
    if (studentIds.length > 0) {
      const validStudents = await User.countDocuments({
        _id: { $in: studentIds },
        assignedTeachers: teacherId,
        role: 'student'
      });
      if (validStudents !== studentIds.length) {
         return res.status(403).json({ success: false, message: 'You can only schedule classes for your assigned students.' });
      }
    }

    const parsedScheduledDate = new Date(scheduledDate);
    if (Number.isNaN(parsedScheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: 'scheduledDate is invalid' });
    }

    // DISALLOW BACK-DATES: Cannot schedule a class for past dates
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const scheduledDateOnly = new Date(parsedScheduledDate);
    scheduledDateOnly.setHours(0, 0, 0, 0);
    if (scheduledDateOnly < startOfToday) {
      return res.status(400).json({ success: false, message: 'Cannot schedule a class in the past. Please select today or a future date.' });
    }

    const validateOptionalUrl = (value, label) => {
      if (!value) return null;
      try {
        const url = new URL(String(value).trim());
        if (url.protocol === 'http:' || url.protocol === 'https:') return null;
      } catch {}
      return `${label} must be a valid URL`;
    };
    const urlError = validateOptionalUrl(googleMeetLink, 'Google Meet link') || validateOptionalUrl(zoomMeetingLink, 'Zoom meeting link');
    if (urlError) {
      return res.status(400).json({ success: false, message: urlError });
    }

    const schedule = await ClassSchedule.create({
      title: title || '', course: normalizedCourse, board, subject: subject || '', grade: grade || '',
      teacherId, studentIds,
      scheduledDate: parsedScheduledDate,
      scheduledTime, durationMinutes: durationMinutes || 60,
      repeatType: repeatType || 'once',
      dayOfWeek, academicYear, batch,
      googleMeetLink: String(googleMeetLink || '').trim(),
      zoomMeetingLink: String(zoomMeetingLink || '').trim(),
    });

    notifyStudentsClassScheduled({ req, schedule }).catch((error) => {
      console.error('[ClassSchedule] Failed to notify students:', error.message);
    });

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Schedules (role-filtered, NEVER includes meetLink) ──────────────────
const getSchedules = async (req, res) => {
  try {
    await cleanupStaleLiveClasses();
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
    await cleanupStaleLiveClasses();
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
    await cleanupStaleLiveClasses();
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

    const cls = await ClassSchedule.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (cls.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your class.' });
    }
    if (cls.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: `Class is already ${cls.status}.` });
    }

    const resolvedMeetLink = String(meetLink || cls.googleMeetLink || cls.zoomMeetingLink || '').trim();
    const resolvedMeetLinkType = meetLinkType || (cls.googleMeetLink ? 'googlemeet' : cls.zoomMeetingLink ? 'zoom' : 'googlemeet');

    try { new URL(resolvedMeetLink); } catch {
      return res.status(400).json({ success: false, message: 'Invalid meeting link URL.' });
    }

    // Update class status + store meetLink securely
    cls.status = 'live';
    cls.meetLink = resolvedMeetLink;
    cls.meetLinkType = resolvedMeetLinkType;
    await cls.save();

    // Create LiveSession
    const session = await LiveSession.create({
      classId,
      teacherId: req.user._id,
      meetLink: resolvedMeetLink,
      meetLinkType: resolvedMeetLinkType,
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

    // Validate student is enrolled (students only, teachers/admins can also join)
    if (req.user.role === 'student') {
      const isEnrolled = cls.studentIds.some((id) => id.toString() === studentId.toString());
      if (!isEnrolled) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this class.' });
      }
    }

    if (cls.status === 'completed' || cls.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This class has already ended.' });
    }

    // Try to find active LiveSession first
    let session = await LiveSession.findOne({ classId, isLive: true });

    // Resolve meeting link from session or schedule
    let resolvedMeetLink = session?.meetLink || cls.meetLink || cls.googleMeetLink || cls.zoomMeetingLink || '';
    let resolvedMeetLinkType = session?.meetLinkType || cls.meetLinkType || (cls.googleMeetLink ? 'googlemeet' : cls.zoomMeetingLink ? 'zoom' : 'googlemeet');

    if (!resolvedMeetLink && cls.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'Teacher has not started the live session or provided a meeting link yet.',
      });
    }

    // If teacher provided a meeting link during scheduling but hasn't explicitly tapped Go Live, activate session
    if (!session && resolvedMeetLink) {
      cls.status = 'live';
      cls.meetLink = resolvedMeetLink;
      cls.meetLinkType = resolvedMeetLinkType;
      await cls.save();

      session = await LiveSession.create({
        classId,
        teacherId: cls.teacherId?._id || cls.teacherId,
        meetLink: resolvedMeetLink,
        meetLinkType: resolvedMeetLinkType,
        isLive: true,
        startedAt: new Date(),
      });
    }

    // Record attendance
    const today = new Date().toISOString().split('T')[0];
    const joinTime = new Date();

    // Determine if late (10+ min after session start)
    const minsAfterStart = session?.startedAt
      ? Math.round((joinTime - session.startedAt) / 60000)
      : 0;
    const status = minsAfterStart >= 10 ? 'late' : 'present';

    if (req.user.role === 'student') {
      await ClassAttendance.findOneAndUpdate(
        { classId, studentId },
        {
          classId, studentId, joinTime,
          status, date: today,
        },
        { upsert: true, new: true }
      );
    }

    // Update LiveSession stats if session exists
    if (session) {
      await LiveSession.findByIdAndUpdate(session._id, {
        $inc: { totalJoined: 1 },
      });

      // Update peakStudentCount
      const joinedCount = await ClassAttendance.countDocuments({ classId, status: { $in: ['present', 'late'] } });
      await LiveSession.findByIdAndUpdate(session._id, {
        $max: { peakStudentCount: joinedCount },
      });

      // Notify teacher room & class room with complete student payload
      const joinPayload = {
        studentName: req.user.displayName || req.user.name,
        studentId: req.user._id.toString(),
        joinedAt: joinTime,
        count: joinedCount,
        classId,
      };
      if (io) {
        if (cls.teacherId?._id) io.to(`teacher_${cls.teacherId._id}`).emit('student:joined', joinPayload);
        io.to(`class_${classId}`).emit('student:joined', joinPayload);
        io.to('admin_room').emit('attendance:updated', { classId, presentCount: joinedCount });
      }
    }

    // Return meetLink
    res.json({
      success: true,
      meetLink: resolvedMeetLink,
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
    const existing = await ClassSchedule.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Schedule not found.' });

    if (req.user.role === 'teacher' && existing.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update your own classes.' });
    }

    const updates = { ...req.body };
    if (req.user.role === 'teacher') {
      delete updates.teacherId;
      delete updates.teacher;
    }

    const schedule = await ClassSchedule.findByIdAndUpdate(req.params.id, updates, { new: true });
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

    const existing = await ClassSchedule.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Schedule not found.' });

    if (req.user.role === 'teacher' && existing.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own classes.' });
    }

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

    // PRIVACY ENFORCEMENT
    if (studentIds.length > 0) {
      const validStudents = await User.countDocuments({
        _id: { $in: studentIds },
        assignedTeachers: teacherId,
        role: 'student'
      });
      if (validStudents !== studentIds.length) {
         return res.status(403).json({ success: false, message: 'You can only schedule classes for your assigned students.' });
      }
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

// ─── Teacher/Admin: Get Live Monitor Data for a Single Class ─────────────────
// @route   GET /api/classes/:id/live-monitor
// @access  Teacher / Admin
const getClassLiveMonitor = async (req, res) => {
  try {
    const classId = req.params.id;
    const cls = await ClassSchedule.findById(classId)
      .populate('studentIds', 'name displayName grade board profilePic')
      .populate('teacherId', 'name displayName profilePic');

    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Allow teacher of the class or admin
    if (req.user.role !== 'admin' && cls.teacherId?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to monitor this class.' });
    }

    const attendances = await ClassAttendance.find({ classId, status: { $in: ['present', 'late'] } })
      .populate('studentId', 'name displayName grade board profilePic');

    const joinedStudentMap = new Map();
    attendances.forEach((a) => {
      if (a.studentId) {
        joinedStudentMap.set(a.studentId._id.toString(), {
          _id: a.studentId._id,
          name: a.studentId.displayName || a.studentId.name,
          grade: a.studentId.grade,
          profilePic: a.studentId.profilePic,
          joinedAt: a.joinTime || a.createdAt,
          status: a.status,
        });
      }
    });

    const enrolledStudents = cls.studentIds || [];
    const joinedStudents = Array.from(joinedStudentMap.values());
    const pendingStudents = enrolledStudents
      .filter((s) => !joinedStudentMap.has(s._id.toString()))
      .map((s) => ({
        _id: s._id,
        name: s.displayName || s.name,
        grade: s.grade,
        profilePic: s.profilePic,
      }));

    const monitorData = {
      _id: cls._id,
      title: cls.title || cls.subject,
      subject: cls.subject,
      grade: cls.grade,
      course: cls.course,
      status: cls.status,
      meetLink: cls.meetLink || cls.googleMeetLink || cls.zoomMeetingLink || '',
      meetLinkType: cls.meetLinkType,
      teacher: {
        _id: cls.teacherId?._id,
        name: cls.teacherId?.displayName || cls.teacherId?.name,
      },
      totalStudents: enrolledStudents.length,
      studentsJoined: joinedStudents.length,
      joinedStudents,
      pendingStudents,
    };

    res.json({ success: true, class: monitorData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Teacher: Send Message to All Students in Live Class ─────────────────────
// @route   POST /api/classes/:id/message
// @access  Teacher / Admin
const sendClassMessage = async (req, res) => {
  try {
    const classId = req.params.id;
    const { message } = req.body;
    const io = req.app.get('io');

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const cls = await ClassSchedule.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    if (req.user.role !== 'admin' && cls.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to send messages to this class.' });
    }

    const notifications = (cls.studentIds || []).map((sid) => ({
      recipient: sid,
      sender: req.user._id,
      type: 'live_class',
      title: `Message from Teacher (${cls.subject || 'Class'})`,
      message: message.trim(),
      link: '/student/classes',
      data: { classId },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    if (io) {
      io.to(`class_${classId}`).emit('class:message', {
        classId,
        message: message.trim(),
        senderName: req.user.displayName || req.user.name,
        timestamp: new Date().toISOString(),
      });
      (cls.studentIds || []).forEach((sid) => {
        io.to(`user_${sid}`).emit('class:message', {
          classId,
          message: message.trim(),
          senderName: req.user.displayName || req.user.name,
          timestamp: new Date().toISOString(),
        });
      });
    }

    res.json({ success: true, message: 'Message sent to all students.' });
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
  getClassLiveMonitor,
  sendClassMessage,
};
