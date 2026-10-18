const Announcement = require('../models/Announcement');
const AnnouncementRead = require('../models/AnnouncementRead');
const User = require('../models/User');
const Course = require('../models/Course');
const notificationService = require('../services/notificationService');

const { retentionCutoff, announcementExpiry } = require('../utils/announcementRetention');

async function audienceFilter(user) {
  const filter = { targetRole: { $in: ['all', user.role] } };
  if (user.role !== 'student') return filter;
  const courses = [null, '', 'all'];
  if (user.course) {
    courses.push(String(user.course._id || user.course));
    const course = await Course.findById(user.course._id || user.course).select('title category').lean();
    if (course) {
      courses.push(course.title, course.category);
      if (course.category === 'State Board') courses.push('Matric');
      if (course.category === 'Arts & Science') courses.push('Arts');
    }
  }
  filter.$and = [{ targetCourse: { $in: courses.filter(v => v !== undefined) } }, { targetGrade: { $in: [null, '', 'all', ...(user.grade ? [user.grade] : [])] } }];
  return filter;
}

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
    notifMessage: String(content || `${name} shared an attachment.`).substring(0, 200),
  };
}

function getMediaTypeFromMime(mimeType = '') {
  const normalized = String(mimeType).toLowerCase();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  return 'document';
}

function getResourceTypeFromMedia(media = {}) {
  const explicit = media.resourceType || media.resource_type;
  if (['image', 'video', 'raw'].includes(explicit)) return explicit;

  const mimeType = String(media.mimeType || '').toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

function normalizeAnnouncementMedia(media = []) {
  if (!Array.isArray(media)) return [];

  return media
    .filter((item) => item && item.url)
    .map((item) => {
      const inferredType = getMediaTypeFromMime(item.mimeType);
      const rawType = item.type === 'raw' ? 'document' : item.type;
      const type = ['image', 'video', 'audio', 'document'].includes(rawType)
        ? rawType
        : inferredType;

      return {
        url: item.url,
        type,
        resourceType: getResourceTypeFromMedia(item),
        publicId: item.publicId || item.public_id,
        originalFilename: item.originalFilename || item.name,
        mimeType: item.mimeType,
        fileSize: item.fileSize || item.size,
        duration: item.duration,
        thumbnail: item.thumbnail,
      };
    });
}

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetRole, targetCourse, targetGrade, isPinned, expiresAt, media } = req.body;
    const io = req.app.get('io');
    const normalizedTargetRole = targetRole || 'all';
    const mediaList = normalizeAnnouncementMedia(media);

    const announcement = await Announcement.create({
      title, content, targetRole: normalizedTargetRole, targetCourse, targetGrade,
      isPinned, expiresAt: announcementExpiry(), postedBy: req.user._id,
      media: mediaList,
    });

    if (normalizedTargetRole === 'all' || normalizedTargetRole === 'student') {
      io?.emit('announcement:new', { announcement: { ...announcement.toObject(), content: String(announcement.content || '').substring(0, 200) } });
    } else if (normalizedTargetRole === 'teacher') {
      io?.emit('announcement:new', { announcement: { ...announcement.toObject() } });
    }

    // In-app + push notifications (fire-and-forget)
    (async () => {
      try {
        const roleFilter = normalizedTargetRole === 'all'
          ? { role: { $in: ['student', 'teacher'] } }
          : { role: normalizedTargetRole };

        let courseIds;
        if (targetCourse && targetCourse !== 'all') {
          // Web notices can use category names; User.course stores an ObjectId.
          const category = { Matric: 'State Board', Arts: 'Arts & Science' }[targetCourse] || targetCourse;
          courseIds = /^[a-f\d]{24}$/i.test(targetCourse) ? [targetCourse]
            : (await Course.find({ $or: [{ title: targetCourse }, { category }] }).select('_id').lean()).map((course) => course._id);
        }
        const grade = targetGrade && targetGrade !== 'all' ? targetGrade : null;

        const recipients = await User.find({
          ...roleFilter,
          isActive: true,
          // Course/grade targets restrict students; teachers still receive staff notices.
          ...((courseIds || grade) ? { $or: [
            { role: 'teacher' },
            { role: 'student', ...(courseIds ? { course: { $in: courseIds } } : {}), ...(grade ? { grade } : {}) },
          ] } : {}),
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
    console.error('[Announcement Create] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const filter = { deletedAt: null, createdAt: { $gt: retentionCutoff() } };
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
    const staleCutoff = retentionCutoff(now);
    
    const filter = {
      isActive: true,
      deletedAt: null,
      createdAt: { $gt: staleCutoff },
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null, createdAt: { $gte: staleCutoff } },
      ],
      ...await audienceFilter(user),
    };

    const activeAnnouncements = await Announcement.find(filter)
      .populate('postedBy', 'name displayName')
      .sort({ isPinned: -1, createdAt: -1 });

    const readRecords = await AnnouncementRead.find({
      userId: user._id,
      announcementId: { $in: activeAnnouncements.map(a => a._id) }
    });
    const readIds = readRecords.map(r => r.announcementId.toString());

    const unreadAnnouncements = req.query.includeRead === 'true'
      ? activeAnnouncements.map(a => ({ ...a.toObject(), isRead: readIds.includes(a._id.toString()) }))
      : activeAnnouncements.filter(a => !readIds.includes(a._id.toString()));

    res.json({ success: true, announcements: unreadAnnouncements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findOne({ _id: id, deletedAt: null, isActive: true, createdAt: { $gt: retentionCutoff() }, ...await audienceFilter(req.user) });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found or expired.' });
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
    const update = {};
    for (const key of ['title', 'content', 'targetRole', 'targetCourse', 'targetGrade', 'isPinned', 'isActive', 'media']) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) update[key] = req.body[key];
    }
    if (Object.prototype.hasOwnProperty.call(update, 'media')) {
      update.media = normalizeAnnouncementMedia(update.media);
    }
    const announcement = await Announcement.findOneAndUpdate({ _id: req.params.id, createdAt: { $gt: retentionCutoff() }, deletedAt: null }, update, { new: true, runValidators: true });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found or expired.' });
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
