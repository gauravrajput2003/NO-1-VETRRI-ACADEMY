require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); 
const helmet = require('helmet');
const cors = require('cors'); 
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const { logDev, warnDev, infoProd, errorCrit } = require('./utils/logger');
  
const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');

// ─── Route imports ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const adminRoutes = require('./routes/adminRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const classRoutes = require('./routes/classRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const demoRoutes = require('./routes/demoRoutes');
const profileRoutes = require('./routes/profileRoutes');
const aiRoutes = require('./routes/aiRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const storageRoutes = require('./routes/storageRoutes');
const doubtRoutes = require('./routes/doubtRoutes');
const supportRoutes = require('./routes/supportRoutes');


// ─── Models for Socket.io ──────────────────────────────────────────────────────
const ChatMessage = require('./models/ChatMessage');
const Notification = require('./models/Notification');
const User = require('./models/User');
const TeacherPermissions = require('./models/TeacherPermissions');
const UserSession = require('./models/UserSession');
const jwt = require('jsonwebtoken');

// ─── Express App Setup ─────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);

// ─── CORS Configuration ────────────────────────────────────────────────────────
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '').split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean),
  'https://no1vettriacademy.com', 
  'https://no1vettriacademy.in',
  'https://www.no1vettriacademy.in',
  'https://no1vettriacademy.com',
  'https://www.no1vettriacademy.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',                             // Expo/React Native app
  'http://127.0.0.1:8081',
  'http://localhost:19000',                            // Expo dev server
];

// ─── Socket.io Setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const compression = require('compression');

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Response compression for JSON API responses (skip binary download/stream routes)
app.use(compression({
  filter: (req, res) => {
    if (
      req.path.includes('/download') ||
      req.path.includes('/stream') ||
      req.path.includes('/direct-download') ||
      req.path.includes('/preview')
    ) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(generalLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/training-videos', trainingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/academic-reports', require('./routes/academicReportRoutes'));
app.use('/api/doubts', doubtRoutes);
app.use('/api/support', supportRoutes);


// ─── Public course listing ─────────────────────────────────────────────────────
app.get('/api/courses', async (req, res) => {
  try {
    const Course = require('./models/Course');
    const courses = await Course.find({ isActive: true }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'No.1 Vettri Academy API is running 🚀', timestamp: new Date() });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  errorCrit('[Server] Error:', err.message);
  logDev(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Socket.io Logic ───────────────────────────────────────────────────────────
const onlineUsers = new Map(); // userId → Set of socket IDs
const socketRollout = { authenticatedConnections: 0, legacyConnections: 0, rejectedConnections: 0 };
app.set('socketRollout', socketRollout);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    if (process.env.SOCKET_REQUIRE_AUTH === 'true') { socketRollout.rejectedConnections++; return next(new Error('Authentication required')); }
    socketRollout.legacyConnections++;
    socket.legacyClient = true;
    return next();
  }
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(claims.id);
    if (!user || !user.isActive || (claims.tokenVersion || 0) !== (user.tokenVersion || 0)) throw new Error('Session expired');
    if (claims.sid && !await UserSession.exists({ _id: claims.sid, userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } })) throw new Error('Session expired');
    socket.authUser = user;
    socket.authClaims = claims;
    socketRollout.authenticatedConnections++;
    return next();
  } catch { socketRollout.rejectedConnections++; return next(new Error('Authentication failed')); }
});

io.on('connection', (socket) => {
  logDev('Socket connected');
  if (socket.authUser) socket.use(async (_packet, next) => {
    try {
      const claims = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      const user = await User.findById(claims.id);
      if (!user?.isActive || user.mustChangePassword || (claims.tokenVersion || 0) !== (user.tokenVersion || 0)) throw new Error('Session expired');
      if (claims.sid && !await UserSession.exists({ _id: claims.sid, userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } })) throw new Error('Session expired');
      socket.authUser = user;
      next();
    } catch { socket.emit('auth:error', { message: 'Session expired. Sign in again.' }); socket.disconnect(true); }
  });

  // ─── User identifies + joins rooms ────────────────────────────────────────
  socket.on('user:join', async ({ userId, role } = {}) => {
    if (!userId) return;
    if (socket.authUser && String(socket.authUser._id) !== String(userId)) return;
    if (socket.authUser) role = socket.authUser.role;
    if (socket.userId && socket.userId !== String(userId)) return;
    const key = String(userId);
    const connections = onlineUsers.get(key) || new Set();
    connections.add(socket.id);
    onlineUsers.set(key, connections);
    socket.userId = key;
    socket.role = role;

    // Personal room
    socket.join(`user:${userId}`);
    socket.join(`user_${userId}`);

    // Update online status
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch {}

    logDev('User joined socket room');
  });

  // ─── Room management for broadcasts ───────────────────────────────────────
  socket.on('join:room', async ({ room } = {}) => {
    if (typeof room !== 'string' || room.length > 200) return;
    if (socket.authUser) {
      const id = String(socket.authUser._id);
      const role = socket.authUser.role;
      let ownRoom = room === `user:${id}` || room === `user_${id}` ||
        (role === 'teacher' && room === `teacher_${id}`) ||
        (role === 'admin' && room === 'admin_room');
      try {
        if (!ownRoom && role === 'student' && socket.authUser.course && socket.authUser.grade) {
          const course = await require('./models/Course').findById(socket.authUser.course).select('title');
          ownRoom = [String(socket.authUser.course), course?.title].filter(Boolean).some((value) => room === `course_${value}_${socket.authUser.grade}`);
        }
        if (!ownRoom && /^class_[0-9a-f]{24}$/i.test(room)) {
          const cls = await require('./models/ClassSchedule').findById(room.slice(6)).select('teacherId studentIds');
          ownRoom = Boolean(cls && (role === 'admin' || String(cls.teacherId) === id || cls.studentIds?.some((student) => String(student) === id)));
        }
        if (!ownRoom && /^doubt:[0-9a-f]{24}$/i.test(room)) {
          const doubt = await require('./models/Doubt').findById(room.slice(6)).select('studentId assignedTeachers participants');
          ownRoom = Boolean(doubt && (role === 'admin' || String(doubt.studentId) === id || doubt.assignedTeachers?.some((teacher) => String(teacher) === id) || doubt.participants?.some((participant) => String(participant) === id)));
        }
      } catch { return; }
      if (!ownRoom) return;
    }
    socket.join(room);
    logDev('Socket joined room');
  });

  socket.on('leave:room', ({ room }) => {
    socket.leave(room);
  });

  // ─── Admin monitor room ────────────────────────────────────────────────────
  socket.on('admin:join-monitor', () => {
    if (socket.authUser && socket.authUser.role !== 'admin') return;
    socket.join('admin_room');
  });

  // ─── Chat (text, via socket for real-time) ────────────────────────────────
  socket.on('chat:send', async ({ senderId, receiverId, message }) => {
    try {
      if (socket.authUser) senderId = String(socket.authUser._id);
      if (!socket.userId || String(socket.userId) !== String(senderId)) return;
      if (socket.authUser) {
        const service = require('./services/chatMessageService');
        const record = await service.createTextMessage({ sender: socket.authUser, receiverId, message });
        await service.publishTextMessage({ sender: socket.authUser, record, io });
        return;
      }
      const conversationId = [senderId, receiverId].sort().join('_');

      // Check permissions if teacher
      const senderUser = await User.findById(senderId).select('role name displayName');
      if (!senderUser) return;
      if (senderUser?.role === 'teacher') {
        const perms = await TeacherPermissions.findOne({ teacherId: senderId });
        if (perms && !perms.canSendMessages) {
          socket.emit('chat:error', { message: 'Message permission disabled.' });
          return;
        }
      }

      const chatMsg = await ChatMessage.create({
        senderId,
        receiverId,
        conversationId,
        message,
        messageType: 'text',
        sender: senderId,
        receiver: receiverId,
        roomId: conversationId,
      });

      const populated = await ChatMessage.findById(chatMsg._id)
        .populate('senderId', 'name displayName profilePic role');

      io.to(`user:${senderId}`).to(`user:${receiverId}`).emit('chat:message', populated);
      await require('./services/chatNotificationService').notifyChatMessage({
        sender: senderUser, receiverId, conversationId, messageId: chatMsg._id, preview: message, io,
      });
    } catch (error) {
      socket.emit('chat:error', { message: error.message });
    }
  });

  // ─── Chat: Join room ───────────────────────────────────────────────────────
  socket.on('chat:join', ({ userId1, userId2 }) => {
    if (socket.authUser && ![userId1, userId2].some((id) => String(id) === String(socket.authUser._id))) return;
    const roomId = [userId1, userId2].sort().join('_');
    socket.join(roomId);
  });

  // ─── Chat: Typing indicator ────────────────────────────────────────────────
  socket.on('chat:typing', ({ conversationId, isTyping, targetUserId }) => {
    if (socket.authUser && (!targetUserId || !conversationId?.split('_').includes(String(socket.authUser._id)) || !conversationId.split('_').includes(String(targetUserId)))) return;
    socket.to(`user:${targetUserId}`).emit('chat:typing', {
      conversationId,
      isTyping,
      userId: socket.userId,
    });
  });

  // ─── Notification read ─────────────────────────────────────────────────────
  socket.on('notification:read', async ({ notificationId }) => {
    try {
      await Notification.findOneAndUpdate({ _id: notificationId, ...(socket.authUser ? { recipient: socket.authUser._id } : {}) }, { isRead: true, readAt: new Date() });
    } catch {}
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    if (socket.userId) {
      const connections = onlineUsers.get(socket.userId);
      connections?.delete(socket.id);
      if (!connections?.size) {
        onlineUsers.delete(socket.userId);
        try {
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
        } catch {}
      }
    }
    logDev('Socket disconnected');
  });
});

// ─── Make io available to routes ─────────────────────────────────────────────
app.set('io', io);
require('./services/passwordRecoveryService').configureIO(io);
app.set('onlineUsers', onlineUsers);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let cronJobsStarted = false;

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    errorCrit(`❌ Port ${PORT} is already in use. Another backend instance is running.`);
    warnDev(`Stop the other process using port ${PORT} and restart the server.`);
    process.exitCode = 1;
    return;
  }

  throw err;
});

const startCronJobs = () => {
  if (cronJobsStarted) return;

  try {
    const { startWeeklyTopPerformerJob } = require('./jobs/weeklyTopPerformer');
    const { startClassReminderJob } = require('./jobs/classReminder');
    const { startFeeReminderJob } = require('./jobs/feeReminder');
    require('./jobs/teacherPerformance').startTeacherPerformanceJob();
    require('./jobs/announcementRetention').startAnnouncementRetentionJob();
    require('./jobs/passwordRecovery').startPasswordRecoveryJob();
    startWeeklyTopPerformerJob();
    startClassReminderJob(io);
    startFeeReminderJob(io);
    cronJobsStarted = true;
    logDev('⏰ Cron jobs started');
  } catch (err) {
    warnDev('⚠️ Cron job startup error:', err.message);
  }
};

connectDB().then(async () => {
  // Recovery duplicate prevention must exist before accepting public requests.
  await Promise.all([require('./models/ResetRequest').init(), require('./models/RecoveryRateLimit').init()]);
  if (process.env.BACKGROUND_JOBS_ENABLED !== 'false') require('./services/pushService').startPushDeliveryWorker();
  server.listen(PORT, process.env.BIND_HOST || undefined, () => {
    infoProd(`🚀 Server running on http://localhost:${PORT}`);
    infoProd(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.BACKGROUND_JOBS_ENABLED !== 'false') startCronJobs();
  });
}).catch(error => { errorCrit('[Startup] Recovery indexes unavailable:', error.name); process.exit(1); });

module.exports = { app, io };
