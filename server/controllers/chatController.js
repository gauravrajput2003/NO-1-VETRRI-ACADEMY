const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const TeacherPermissions = require('../models/TeacherPermissions');
const { uploadToCloudinary, getResourceType } = require('../middleware/upload');

// ─── Get Conversations ────────────────────────────────────────────────────────
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name displayName profilePic role isOnline lastSeen');

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Messages ─────────────────────────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const messages = await ChatMessage.find({ conversationId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('senderId', 'name displayName profilePic role');

    const total = await ChatMessage.countDocuments({ conversationId, isDeleted: false });

    res.json({ success: true, messages: messages.reverse(), total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: Check teacher permissions ───────────────────────────────────────
const checkPermission = async (teacherId, permission) => {
  let perms = await TeacherPermissions.findOne({ teacherId });
  if (!perms) perms = { canSendMessages: true, canShareFiles: true };
  return perms[permission] !== false;
};

// ─── Send Text Message ────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user._id;
    const io = req.app.get('io');

    // Validate permissions for teachers
    if (req.user.role === 'teacher') {
      const canSend = await checkPermission(senderId, 'canSendMessages');
      if (!canSend) {
        return res.status(403).json({ success: false, message: 'Message permission disabled by admin.' });
      }
    }

    // Students cannot initiate to non-teachers
    if (req.user.role === 'student') {
      // Students can only reply/message their assigned teacher — validated in route
    }

    const conversationId = ChatMessage.getConversationId(senderId, receiverId);

    const msg = await ChatMessage.create({
      senderId,
      senderRole: req.user.role,
      senderDisplayName: req.user.displayName || req.user.name,
      receiverId,
      conversationId,
      message,
      messageType: 'text',
      // Legacy compat
      sender: senderId,
      receiver: receiverId,
      roomId: conversationId,
    });

    // Update conversation
    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        $setOnInsert: { conversationId, participants: [senderId, receiverId] },
        lastMessage: message.substring(0, 100),
        lastMessageAt: new Date(),
        lastMessageBy: senderId,
        $inc: { [`unreadCount.${receiverId}`]: 1 },
      },
      { upsert: true }
    );

    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'name displayName profilePic role');

    // Emit to both parties
    io.to(`user:${senderId}`).to(`user:${receiverId}`).emit('chat:message', populated);

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Send File ────────────────────────────────────────────────────────────────
const sendFile = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;
    const io = req.app.get('io');

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    // Students cannot send files
    if (req.user.role === 'student') {
      return res.status(403).json({ success: false, message: 'Students cannot send files.' });
    }

    // Check teacher file sharing permission
    if (req.user.role === 'teacher') {
      const canShare = await checkPermission(senderId, 'canShareFiles');
      if (!canShare) {
        return res.status(403).json({ success: false, message: 'File sharing permission disabled by admin.' });
      }
    }

    // Upload to Cloudinary
    const isImage = req.file.mimetype.startsWith('image/');
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vettri-academy/chat-files',
      resource_type: isImage ? 'image' : 'raw',
      public_id: `chat_${Date.now()}`,
    });

    const conversationId = ChatMessage.getConversationId(senderId, receiverId);

    // Detect fileType
    let fileType = 'doc';
    if (isImage) fileType = 'image';
    else if (req.file.mimetype === 'application/pdf') fileType = 'pdf';
    else if (req.file.mimetype.includes('presentation')) fileType = 'ppt';

    const msg = await ChatMessage.create({
      senderId,
      senderRole: req.user.role,
      senderDisplayName: req.user.displayName || req.user.name,
      receiverId,
      conversationId,
      messageType: isImage ? 'image' : 'file',
      fileUrl: result.secure_url,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      cloudinaryPublicId: result.public_id,
      sender: senderId,
      receiver: receiverId,
      roomId: conversationId,
    });

    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        $setOnInsert: { conversationId, participants: [senderId, receiverId] },
        lastMessage: `📎 ${req.file.originalname}`,
        lastMessageAt: new Date(),
        lastMessageBy: senderId,
        $inc: { [`unreadCount.${receiverId}`]: 1 },
      },
      { upsert: true }
    );

    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'name displayName profilePic role');

    io.to(`user:${senderId}`).to(`user:${receiverId}`).emit('chat:file', populated);

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Mark Messages as Read ────────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await ChatMessage.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread count for this user
    await Conversation.findOneAndUpdate(
      { conversationId },
      { $set: { [`unreadCount.${userId}`]: 0 } }
    );

    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('chat:read', { conversationId, readBy: userId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Total Unread Count ───────────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const count = await ChatMessage.countDocuments({
      receiverId: req.user._id,
      isRead: false,
      isDeleted: false,
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Soft Delete Message ──────────────────────────────────────────────────────
const deleteMessage = async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

    if (msg.senderId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    msg.isDeleted = true;
    await msg.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Get Chat Logs ─────────────────────────────────────────────────────
const getChatLogs = async (req, res) => {
  try {
    const { userId, teacherId, from, to, page = 1, limit = 50 } = req.query;

    const filter = { isDeleted: false };
    if (userId) filter.$or = [{ senderId: userId }, { receiverId: userId }];
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const messages = await ChatMessage.find(filter)
      .populate('senderId', 'name displayName role')
      .populate('receiverId', 'name displayName role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  sendFile,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  getChatLogs,
};
