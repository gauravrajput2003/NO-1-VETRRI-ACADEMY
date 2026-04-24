require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');

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

// ─── Models for Socket.io ──────────────────────────────────────────────────────
const ChatMessage = require('./models/ChatMessage');
const Notification = require('./models/Notification');
const User = require('./models/User');
const TeacherPermissions = require('./models/TeacherPermissions');

// ─── Express App Setup ─────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
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

// ─── Public course listing ─────────────────────────────────────────────────────
app.get('/api/courses', async (req, res) => {
  try {
    const Course = require('./models/Course');
    const courses = await Course.find({ isActive: true }).sort({ createdAt: 1 });
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
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Socket.io Logic ───────────────────────────────────────────────────────────
const onlineUsers = new Map(); // userId → socketId

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ─── User identifies + joins rooms ────────────────────────────────────────
  socket.on('user:join', async ({ userId, role }) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.role = role;

    // Personal room
    socket.join(`user:${userId}`);

    // Update online status
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch {}

    console.log(`👤 User ${userId} (${role}) joined`);
  });

  // ─── Room management for broadcasts ───────────────────────────────────────
  socket.on('join:room', ({ room }) => {
    socket.join(room);
    console.log(`📢 Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('leave:room', ({ room }) => {
    socket.leave(room);
  });

  // ─── Admin monitor room ────────────────────────────────────────────────────
  socket.on('admin:join-monitor', () => {
    socket.join('admin_room');
  });

  // ─── Chat (text, via socket for real-time) ────────────────────────────────
  socket.on('chat:send', async ({ senderId, receiverId, message }) => {
    try {
      const conversationId = [senderId, receiverId].sort().join('_');

      // Check permissions if teacher
      const senderUser = await User.findById(senderId).select('role');
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
    } catch (error) {
      socket.emit('chat:error', { message: error.message });
    }
  });

  // ─── Chat: Join room ───────────────────────────────────────────────────────
  socket.on('chat:join', ({ userId1, userId2 }) => {
    const roomId = [userId1, userId2].sort().join('_');
    socket.join(roomId);
  });

  // ─── Chat: Typing indicator ────────────────────────────────────────────────
  socket.on('chat:typing', ({ conversationId, isTyping, targetUserId }) => {
    socket.to(`user:${targetUserId}`).emit('chat:typing', {
      conversationId,
      isTyping,
      userId: socket.userId,
    });
  });

  // ─── Notification read ─────────────────────────────────────────────────────
  socket.on('notification:read', async ({ notificationId }) => {
    try {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true, readAt: new Date() });
    } catch {}
  });

  // ─── Score notification ────────────────────────────────────────────────────
  socket.on('score:new', ({ studentId, scoreData }) => {
    io.to(`user:${studentId}`).emit('notification:new', {
      type: 'new_score',
      title: 'New Score Posted!',
      data: scoreData,
    });
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
      } catch {}
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ─── Make io available to routes ─────────────────────────────────────────────
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // ─── Start Cron Jobs ────────────────────────────────────────────────────────
  try {
    const { startWeeklyTopPerformerJob } = require('./jobs/weeklyTopPerformer');
    const { startClassReminderJob } = require('./jobs/classReminder');
    startWeeklyTopPerformerJob();
    startClassReminderJob(io);
    console.log('⏰ Cron jobs started');
  } catch (err) {
    console.warn('⚠️ Cron job startup error:', err.message);
  }
});

module.exports = { app, io };
