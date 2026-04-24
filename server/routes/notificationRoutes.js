const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getNotifications, getUnreadCount, markRead, markAllRead } = require('../controllers/notificationController');

router.get('/', verifyToken, getNotifications);
router.get('/unread-count', verifyToken, getUnreadCount);
router.patch('/:id/read', verifyToken, markRead);
router.patch('/read-all', verifyToken, markAllRead);

module.exports = router;
