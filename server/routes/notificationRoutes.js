const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPushStatus,
} = require('../controllers/notificationController');

router.get('/', verifyToken, getNotifications);
router.get('/push-status', verifyToken, isAdmin, getPushStatus);
router.get('/unread-count', verifyToken, getUnreadCount);
router.patch('/read-all', verifyToken, markAllRead);
router.patch('/:id/read', verifyToken, markRead);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;
