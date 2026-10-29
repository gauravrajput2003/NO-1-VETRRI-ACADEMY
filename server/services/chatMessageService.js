const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const TeacherPermissions = require('../models/TeacherPermissions');
const { notifyChatMessage } = require('./chatNotificationService');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// HTTP messages and admin-assisted recovery share this authorization boundary.
async function createTextMessage({ sender, receiverId, message, session, recoveryRequestId, recoveryCiphertext, credentialType, expiresAt, recoveryStatus }) {
  if (!sender || !['admin', 'student', 'teacher'].includes(sender.role) || !receiverId
    || typeof message !== 'string' || !message.trim() || message.length > 5000) throw fail('Invalid message details.');
  const receiver = await User.findById(receiverId).session(session || null);
  if (!receiver || receiver.isActive === false) throw fail('Recipient is unavailable.', 404);
  if (sender.role !== 'admin' && receiver.role !== 'admin') throw fail('Direct messaging is only available with the Admin desk.', 403);
  if (sender.role === 'teacher') {
    const permissions = await TeacherPermissions.findOne({ teacherId: sender._id }).session(session || null);
    if (permissions?.canSendMessages === false) throw fail('Message permission disabled by admin.', 403);
  }
  if ((recoveryRequestId || recoveryCiphertext) && sender.role !== 'admin') throw fail('Admin access required.', 403);
  const conversationId = ChatMessage.getConversationId(sender._id, receiverId);
  const [record] = await ChatMessage.create([{
    senderId: sender._id, senderRole: sender.role, senderDisplayName: sender.displayName || sender.name,
    receiverId, conversationId, message: message.trim(), messageType: 'text',
    sender: sender._id, receiver: receiverId, roomId: conversationId,
    ...(recoveryRequestId ? { recoveryRequestId, recoveryCiphertext, credentialType, expiresAt, recoveryStatus } : {}),
  }], { session });
  await Conversation.findOneAndUpdate({ conversationId }, {
    $setOnInsert: { conversationId, participants: [sender._id, receiverId] },
    $set: { lastMessage: message.trim().slice(0, 100), lastMessageAt: new Date(), lastMessageBy: sender._id },
    $inc: { [`unreadCount.${receiverId}`]: 1 },
  }, { upsert: true, session });
  return record;
}

async function publishTextMessage({ sender, record, io }) {
  // Recovery messages carry generic previews over sockets; ciphertext is never emitted.
  const safe = record.toObject ? record.toObject() : { ...record };
  delete safe.recoveryCiphertext;
  safe.senderId = { _id: sender._id, name: sender.name, displayName: sender.displayName, role: sender.role, profilePic: sender.profilePic };
  io?.to(`user:${sender._id}`).to(`user:${record.receiverId}`).emit('chat:message', safe);
  if (!record.recoveryRequestId) await notifyChatMessage({ sender, receiverId: record.receiverId,
    conversationId: record.conversationId, messageId: record._id, preview: record.message, io });
  return safe;
}

module.exports = { createTextMessage, publishTextMessage };
