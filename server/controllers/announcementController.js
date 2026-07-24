const Announcement = require('../models/Announcement');
const AnnouncementRead = require('../models/AnnouncementRead');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

const DEFAULT_MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS = 30;
const parsedMaxAgeDays = Number.parseInt(process.env.MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS, 10);
const MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS = Number.isFinite(parsedMaxAgeDays) && parsedMaxAgeDays > 0
  ? parsedMaxAgeDays
  : DEFAULT_MAX_ACTIVE_ANNOUNCEMENT_AGE_DAYS;

function buildAnnouncementNotifyCopy({ title, content, media = [], posterName }) {
  const hasVoice = media.some((m) => m.type === 'audio');
  const hasVideo = media.some((m) => m.type === 'video');
  const name = posterName || 'Admin';

  if (hasVoice && !hasVideo) {
    return {
      pushTitle: 'New Voice Announcement',
      pushBody: `${name}\nTap to listen.`,
      notifTitle: 'New Voice Announcement',
      notifMessage: `${name} shared a voice message. Tap to listen.`,
    };
  }
  if (hasVideo) {
    return {
      pushTitle: 'New Video Announcement',
      pushBody: `${name}\nTap to watch.`,
      notifTitle: 'New Video Announcement',
      notifMessage: `${name} shared a video message. Tap to watch.`,
    };
  }
  return {
    pushTitle: title,
    pushBody: String(content || '').substring(0, 150),
    notifTitle: title,
    notifMessage: String(content || '').substring(0, 200),
  };
}

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetRole, targetCourse, targetGrade, isPinned, expiresAt, media } = req.body;
    const io = req.app.get('io');
    const mediaList = Array.isArray(media) ? media : [];

    const announcement = await Announcement.create({
      title, content, targetRole, targetCourse, targetGrade,
      isPinned, expiresAt, postedBy: req.user._id,
      media: mediaList,
    });

    if (targetRole === 'all' || targetRole === 'student') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject(), content: announcement.content.substring(0, 200) } });
    } else if (targetRole === 'teacher') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject() } });
    }

    // In-app + push notifications (fire-and-forget)
    (async () => {
      try {
        const roleFilter = targetRole === 'all'
          ? { role: { $in: ['student', 'teacher'] } }
          : { role: targetRole };

        const recipients = await User.find({
          ...roleFilter,
          isActive: true,
        }).select('_id expoPushToken').lean();

        const posterName = req.user.displayName || req.user.name || 'Admin';
        const copy = buildAnnouncementNotifyCopy({
          title,
          content,
          media: mediaList,
          posterName,
        });

        const recipientIds = recipients.map((u) => u._id);
        if (recipientIds.length) {
          await notificationService.sendBulkNotifications({
            recipientIds,
            senderId: req.user._id,
            type: 'announcement',
            title: copy.notifTitle,
            message: copy.notifMessage,
            referenceId: announcement._id,
            referenceType: 'Announcement',
            link: '/student/dashboard',
            data: { announcementId: String(announcement._id), type: 'announcement' },
            io,
          });
        }
      } catch (notifErr) {
        console.error('[Announcement] Notification failed:', notifErr.message);
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
