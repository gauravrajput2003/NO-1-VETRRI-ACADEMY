const Notification = require('../models/Notification');
const User = require('../models/User');
const FeesRecord = require('../models/FeesRecord');
const { sendPushNotifications } = require('../services/pushService');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'name displayName profilePic');
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/notifications/send-fee-reminders
 *
 * Triggered by an external cron service (cron-job.org) on a daily schedule.
 * Secured via CRON_SECRET header — no user JWT required.
 *
 * Logic:
 * 1. Verifies the X-Cron-Secret header matches process.env.CRON_SECRET
 * 2. Finds all active students who have a fee amount set
 * 3. For each student, checks FeesRecord for overdue or upcoming fees
 * 4. Sends push notifications to students with pending/overdue fees
 *
 * IMPORTANT: Keep this endpoint lightweight — Render free tier will cold-start
 * (~30-60s) on the first cron ping. cron-job.org timeout should be set to 120s.
 *
 * @returns JSON { success, sent, failed, totalChecked }
 */
const sendFeeReminders = async (req, res) => {
  try {
    // ─── Secret validation ────────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    const incomingSecret = req.headers['x-cron-secret'];

    if (!cronSecret || incomingSecret !== cronSecret) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const now = new Date();
    const todayDay = now.getDate(); // day of month (1-31)

    // ─── Find students who have pending/overdue fee records ──────────────────
    const overdueRecords = await FeesRecord.find({
      status: { $in: ['pending', 'partial', 'overdue'] },
    })
      .populate({
        path: 'student',
        select: 'name expoPushToken isActive feeAmount',
        match: {
          isActive: true,
          expoPushToken: { $ne: null, $exists: true },
          feeAmount: { $gt: 0 },
        },
      })
      .lean();

    // Group by student and collect tokens
    const tokenMap = new Map(); // token → { name, status, monthYear }
    overdueRecords.forEach((record) => {
      if (!record.student || !record.student.expoPushToken) return;
      const token = record.student.expoPushToken;
      if (!tokenMap.has(token)) {
        tokenMap.set(token, {
          name: record.student.name,
          status: record.status,
          monthYear: record.monthYear,
        });
      }
    });

    const tokens = Array.from(tokenMap.keys());

    if (tokens.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, totalChecked: overdueRecords.length, message: 'No students with push tokens found' });
    }

    // ─── Send push notifications ──────────────────────────────────────────────
    const result = await sendPushNotifications(tokens, {
      title: '🔔 Fee Reminder',
      body: 'You have an outstanding fee balance. Please visit the Fees section for details.',
      data: { type: 'fee_reminder' },
    });

    console.log(`[FeeReminder] Sent: ${result.sent}, Failed: ${result.failed}, Dead tokens removed: ${result.deadTokens.length}`);

    res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      totalChecked: tokens.length,
    });
  } catch (error) {
    console.error('[FeeReminder] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead, sendFeeReminders };

