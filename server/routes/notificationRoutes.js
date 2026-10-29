const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const browserPush = require('../controllers/browserPushController');
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPushStatus,
} = require('../controllers/notificationController');

router.get('/', verifyToken, getNotifications);
router.get('/browser-push/config', verifyToken, browserPush.config);
router.post('/browser-push/subscribe', verifyToken, browserPush.subscribe);
router.post('/browser-push/unsubscribe', verifyToken, browserPush.unsubscribe);
router.get('/push-status', verifyToken, isAdmin, getPushStatus);
router.get('/unread-count', verifyToken, getUnreadCount);
router.patch('/read-all', verifyToken, markAllRead);
router.patch('/:id/read', verifyToken, markRead);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;
