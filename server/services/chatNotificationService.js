const { sendNotification } = require('./notificationService');

// Shared by REST text/files and legacy socket chat; no online-status gate.
async function notifyChatMessage({ sender, receiverId, conversationId, messageId, preview, io }) {
  const senderName = sender.displayName || sender.name || 'New Message';
  return sendNotification({
    recipientId: receiverId,
    senderId: sender._id,
    type: 'chat_message',
    title: senderName,
    message: preview.slice(0, 150),
    referenceId: messageId,
    referenceType: 'ChatMessage',
    data: { conversationId, messageId: String(messageId), senderId: String(sender._id), senderName, senderRole: sender.role },
    io,
  });
}

module.exports = { notifyChatMessage };
