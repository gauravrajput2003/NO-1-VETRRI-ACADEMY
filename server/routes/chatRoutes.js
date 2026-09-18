const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { uploadChatFile } = require('../middleware/upload');
const {
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
} = require('../controllers/chatController');

// Admin contact info for direct messaging from teachers and students
router.get('/admin-contact', verifyToken, getAdminContact);

// Admin only — Directory of users (teachers & students) for direct messaging
router.get('/users', verifyToken, adminOnly, getChatUsers);

router.get('/conversations', verifyToken, getConversations);
router.get('/messages/:conversationId', verifyToken, getMessages);
router.post('/send', verifyToken, sendMessage);
router.post('/send-file', verifyToken, uploadChatFile.single('file'), sendFile);
router.patch('/read/:conversationId', verifyToken, markAsRead);
router.get('/unread-count', verifyToken, getUnreadCount);
router.delete('/message/:id', verifyToken, deleteMessage);

// Admin only — chat audit logs
router.get('/logs', verifyToken, adminOnly, getChatLogs);

module.exports = router;
