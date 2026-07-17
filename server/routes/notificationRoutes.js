const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getNotifications, getUnreadCount, markRead, markAllRead, sendFeeReminders } = require('../controllers/notificationController');

router.get('/', verifyToken, getNotifications);
router.get('/unread-count', verifyToken, getUnreadCount);
router.patch('/:id/read', verifyToken, markRead);
router.patch('/read-all', verifyToken, markAllRead);

// External cron endpoint — secured by X-Cron-Secret header (no user JWT)
// Configure at cron-job.org: POST https://your-render-url/api/notifications/send-fee-reminders
// Add request header: X-Cron-Secret: <value of CRON_SECRET env var on Render>
// Set timeout to 120 seconds (Render free tier cold-starts in ~30-60s)
router.post('/send-fee-reminders', sendFeeReminders);

module.exports = router;
