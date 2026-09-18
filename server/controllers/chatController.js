const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const TeacherPermissions = require('../models/TeacherPermissions');
const { uploadToCloudinary, getResourceType } = require('../middleware/upload');
const { sendPushNotifications } = require('../services/pushService');

// ─── Get Admin Contact Info ───────────────────────────────────────────────────
// For Students and Teachers to initiate their private chat with Admin
const getAdminContact = async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' })
      .select('name displayName profilePic role isOnline lastSeen')
      .lean();

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin contact not found' });
    }

    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin Only: Get Directory of Users (Teachers & Students) for Chat ───────
const getChatUsers = async (req, res) => {
  try {
    const { role = 'all', search = '', page = 1, limit = 200 } = req.query;
    const filter = {};

    if (role === 'teacher') {
      filter.role = 'teacher';
    } else if (role === 'student') {
      filter.role = 'student';
    } else {
      filter.role = { $in: ['teacher', 'student'] };
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { grade: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('name displayName profilePic role grade board mobile subjects isOnline lastSeen')
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await User.countDocuments(filter);

    // Attach conversation snippet and unread counts for Admin if available
    const adminId = req.user._id.toString();
    const userIds = users.map(u => u._id.toString());
    const convIds = userIds.map(id => [adminId, id].sort().join('_'));

    const conversations = await Conversation.find({ conversationId: { $in: convIds } }).lean();
    const convMap = {};
    conversations.forEach(c => {
      convMap[c.conversationId] = c;
    });

    const enrichedUsers = users.map(u => {
      const cId = [adminId, u._id.toString()].sort().join('_');
      const conv = convMap[cId];
      return {
        ...u,
        conversationId: cId,
        lastMessage: conv?.lastMessage || '',
        lastMessageAt: conv?.lastMessageAt || null,
        unreadCount: (conv?.unreadCount && conv.unreadCount[adminId]) || 0,
      };
    });

    res.json({ success: true, users: enrichedUsers, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Conversations ────────────────────────────────────────────────────────
// Strictly returns conversations where the current user is a participant.
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name displayName profilePic role isOnline lastSeen grade board subjects');

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Messages ─────────────────────────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const userId = req.user._id.toString();

    // Authorization check: User must be part of this conversationId or an Admin
    const isParticipant = conversationId.split('_').includes(userId);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

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

    if (!receiverId || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'receiverId and message are required.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Recipient user not found.' });
    }

    // Role-based Authorization:
    // Teachers and Students can ONLY chat directly with Admin
    if (req.user.role === 'student' || req.user.role === 'teacher') {
      if (receiver.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Direct messaging is only available between students/teachers and the Admin desk.',
        });
      }
    }

    // Validate permissions for teachers if communicating with admin
    if (req.user.role === 'teacher') {
      const canSend = await checkPermission(senderId, 'canSendMessages');
      if (!canSend) {
        return res.status(403).json({ success: false, message: 'Message permission disabled by admin.' });
      }
    }

    const conversationId = ChatMessage.getConversationId(senderId, receiverId);

    const msg = await ChatMessage.create({
      senderId,
      senderRole: req.user.role,
      senderDisplayName: req.user.displayName || req.user.name,
      receiverId,
      conversationId,
      message: message.trim(),
      messageType: 'text',
      // Legacy compat
      sender: senderId,
      receiver: receiverId,
      roomId: conversationId,
    });

    // Update or insert conversation record
    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        $setOnInsert: { conversationId, participants: [senderId, receiverId] },
        lastMessage: message.trim().substring(0, 100),
        lastMessageAt: new Date(),
        lastMessageBy: senderId,
        $inc: { [`unreadCount.${receiverId}`]: 1 },
      },
      { upsert: true }
    );

    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'name displayName profilePic role');

    // Real-time notification to both parties via Socket.io
    if (io) {
      io.to(`user:${senderId}`).to(`user:${receiverId}`).emit('chat:message', populated);
    }

    // Send Expo push notification to receiver if offline/backgrounded
    if (receiver && receiver.expoPushToken) {
      const senderName = req.user.displayName || req.user.name || 'New Message';
      sendPushNotifications([receiver.expoPushToken], {
        title: senderName,
        body: message.trim().substring(0, 150),
        data: {
          type: 'chat_message',
          conversationId,
          senderId: senderId.toString(),
          senderName,
          senderRole: req.user.role,
        },
      }).catch((pushErr) => console.error('[Chat Push] Notification failed:', pushErr.message));
    }

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Send File / Media (Image, PDF, Audio, Video, Document) ──────────────────
const sendFile = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;
    const io = req.app.get('io');

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    if (!receiverId) return res.status(400).json({ success: false, message: 'receiverId is required.' });

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Recipient user not found.' });
    }

    // Role-based Authorization:
    // Teachers and Students can only send media directly to Admin
    if (req.user.role === 'student' || req.user.role === 'teacher') {
      if (receiver.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Direct media messaging is only allowed with Admin.',
        });
      }
    }

    // Check teacher file sharing permission
    if (req.user.role === 'teacher') {
      const canShare = await checkPermission(senderId, 'canShareFiles');
      if (!canShare) {
        return res.status(403).json({ success: false, message: 'File sharing permission disabled by admin.' });
      }
    }

    // Detect media types
    const mime = (req.file.mimetype || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const isPdf = mime === 'application/pdf';
    const isPpt = mime.includes('presentation') || mime.includes('powerpoint');

    let messageType = 'file';
    let fileType = 'doc';

    if (isImage) {
      messageType = 'image';
      fileType = 'image';
    } else if (isVideo) {
      messageType = 'video';
      fileType = 'video';
    } else if (isAudio) {
      messageType = 'audio';
      fileType = 'audio';
    } else if (isPdf) {
      messageType = 'file';
      fileType = 'pdf';
    } else if (isPpt) {
      messageType = 'file';
      fileType = 'ppt';
    }

    const cloudinaryResourceType = getResourceType(mime);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vettri-academy/chat-files',
      resource_type: cloudinaryResourceType,
      public_id: `chat_${Date.now()}`,
    });

    const conversationId = ChatMessage.getConversationId(senderId, receiverId);

    const msg = await ChatMessage.create({
      senderId,
      senderRole: req.user.role,
      senderDisplayName: req.user.displayName || req.user.name,
      receiverId,
      conversationId,
      messageType,
      fileUrl: result.secure_url,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      cloudinaryPublicId: result.public_id,
      sender: senderId,
      receiver: receiverId,
      roomId: conversationId,
    });

    let previewLabel = `📎 ${req.file.originalname}`;
    if (isImage) previewLabel = '📷 Photo';
    else if (isVideo) previewLabel = '🎥 Video';
    else if (isAudio) previewLabel = '🎙️ Audio';
    else if (isPdf) previewLabel = '📄 PDF Document';

    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        $setOnInsert: { conversationId, participants: [senderId, receiverId] },
        lastMessage: previewLabel,
        lastMessageAt: new Date(),
        lastMessageBy: senderId,
        $inc: { [`unreadCount.${receiverId}`]: 1 },
      },
      { upsert: true }
    );

    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'name displayName profilePic role');

    if (io) {
      io.to(`user:${senderId}`).to(`user:${receiverId}`).emit('chat:file', populated);
    }

    // Send Expo push notification for file/media attachment
    if (receiver && receiver.expoPushToken) {
      const senderName = req.user.displayName || req.user.name || 'New Attachment';
      sendPushNotifications([receiver.expoPushToken], {
        title: senderName,
        body: previewLabel,
        data: {
          type: 'chat_message',
          conversationId,
          senderId: senderId.toString(),
          senderName,
          senderRole: req.user.role,
        },
      }).catch((pushErr) => console.error('[Chat File Push] Notification failed:', pushErr.message));
    }

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
    if (io) {
      io.to(`user:${userId}`).emit('chat:read', { conversationId, readBy: userId });
    }

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
  getAdminContact,
  getChatUsers,
  getConversations,
  getMessages,
  sendMessage,
  sendFile,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  getChatLogs,
};
