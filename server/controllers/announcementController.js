const Announcement = require('../models/Announcement');
const AnnouncementRead = require('../models/AnnouncementRead');
const User = require('../models/User');
const { sendPushNotifications } = require('../services/pushService');

const DEFAULT_MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS = 30;
const parsedMaxAgeDays = Number.parseInt(process.env.MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS, 10);
const MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS = Number.isFinite(parsedMaxAgeDays) && parsedMaxAgeDays > 0
  ? parsedMaxAgeDays
  : DEFAULT_MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS;

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetRole, targetCourse, targetGrade, isPinned, expiresAt } = req.body;
    const io = req.app.get('io');

    const announcement = await Announcement.create({
      title, content, targetRole, targetCourse, targetGrade,
      isPinned, expiresAt, postedBy: req.user._id,
    });

    if (targetRole === 'all' || targetRole === 'student') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject(), content: announcement.content.substring(0, 200) } });
    } else if (targetRole === 'teacher') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject() } });
    }

    // ─── Push Notification (fire-and-forget, never blocks response) ───────────
    // Runs asynchronously so the HTTP response is never delayed.
    (async () => {
      try {
        // Build role filter: 'all' targets both students and teachers
        const roleFilter = targetRole === 'all'
          ? { role: { $in: ['student', 'teacher'] } }
          : { role: targetRole };

        const users = await User.find({
          ...roleFilter,
          expoPushToken: { $ne: null, $exists: true },
          isActive: true,
        }).select('expoPushToken').lean();

        const tokens = users.map((u) => u.expoPushToken).filter(Boolean);

        if (tokens.length > 0) {
          const result = await sendPushNotifications(tokens, {
            title: `📢 ${title}`,
            body: content.substring(0, 150),
            data: { type: 'announcement', announcementId: String(announcement._id) },
          });
          console.log(`[Push] Announcement sent: ${result.sent} ok, ${result.failed} failed`);
        }
      } catch (pushErr) {
        // Never let push errors affect the announcement creation flow
        console.error('[Push] Announcement push failed:', pushErr.message);
      }
    })();

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const filter = { deletedAt: null };
    const { status, targetRole } = req.query;
    
    if (targetRole && targetRole !== 'all') {
      filter.targetRole = targetRole;
    }
    if (status === 'active') {
      filter.isActive = true;
      filter.$or = [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }];
    } else if (status === 'expired') {
      filter.isActive = true;
      filter.expiresAt = { $lte: new Date() };
    }

    const announcements = await Announcement.find(filter)
      .populate('postedBy', 'name displayName')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS * 24 * 60 * 60 * 1000);
    
    const filter = {
      isActive: true,
      deletedAt: null,
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null, createdAt: { $gte: staleCutoff } },
      ],
      targetRole: { $in: ['all', user.role] },
    };

    if (user.role === 'student') {
      const courseFilter = [{ targetCourse: null }];
      if (user.course) courseFilter.push({ targetCourse: user.course?.toString() });
      if (user.grade) courseFilter.push({ targetGrade: user.grade });
      filter.$and = [
        { $or: courseFilter },
        { $or: [{ targetGrade: null }, ...(user.grade ? [{ targetGrade: user.grade }] : [])] },
      ];
    }

    const activeAnnouncements = await Announcement.find(filter)
      .populate('postedBy', 'name displayName')
      .sort({ isPinned: -1, createdAt: -1 });

    const readRecords = await AnnouncementRead.find({
      userId: user._id,
      announcementId: { $in: activeAnnouncements.map(a => a._id) }
    });
    const readIds = readRecords.map(r => r.announcementId.toString());

    const unreadAnnouncements = activeAnnouncements.filter(a => !readIds.includes(a._id.toString()));

    res.json({ success: true, announcements: unreadAnnouncements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await AnnouncementRead.findOneAndUpdate(
      { announcementId: id, userId: req.user._id },
      { announcementId: id, userId: req.user._id, readAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createAnnouncement, getAnnouncements, getActiveAnnouncements, markAsRead, updateAnnouncement, deleteAnnouncement };
