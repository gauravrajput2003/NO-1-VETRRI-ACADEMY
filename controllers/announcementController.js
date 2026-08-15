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
  if (mimeType.startsWith('image/') || mimeType === 'application/pdf') return 'image';
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
      isPinned, expiresAt, postedBy: req.user._id,
      media: mediaList,
    });

    if (normalizedTargetRole === 'all' || normalizedTargetRole === 'student') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject(), content: announcement.content.substring(0, 200) } });
    } else if (normalizedTargetRole === 'teacher') {
      io.emit('announcement:new', { announcement: { ...announcement.toObject() } });
    }

    // In-app + push notifications (fire-and-forget)
    (async () => {
      try {
        const roleFilter = normalizedTargetRole === 'all'
          ? { role: { $in: ['student', 'teacher'] } }
          : { role: normalizedTargetRole };

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
    console.error('[Announcement Create] Error:', error.message);
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
    const update = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(update, 'media')) {
      update.media = normalizeAnnouncementMedia(update.media);
    }
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
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

const downloadMedia = async (req, res) => {
  try {
    const { id, mediaIndex } = req.params;
    const user = req.user;

    const announcement = await Announcement.findOne({ _id: id, deletedAt: null });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    // Access check similar to getActiveAnnouncements
    if (user.role !== 'admin') {
      if (announcement.targetRole !== 'all' && announcement.targetRole !== user.role) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (user.role === 'student') {
        if (announcement.targetCourse && String(announcement.targetCourse) !== String(user.course)) {
          return res.status(403).json({ success: false, message: 'Access denied (Course mismatch).' });
        }
        if (announcement.targetGrade && announcement.targetGrade !== user.grade) {
          return res.status(403).json({ success: false, message: 'Access denied (Grade mismatch).' });
        }
      }
    }

    const index = parseInt(mediaIndex, 10);
    if (isNaN(index) || !announcement.media || index < 0 || index >= announcement.media.length) {
      return res.status(404).json({ success: false, message: 'Media not found at the specified index.' });
    }

    const mediaItem = announcement.media[index];
    const mimeType = mediaItem.mimeType || 'application/pdf';

    // Only allow download for document/pdf
    if (mediaItem.type !== 'document' && mimeType !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only documents/PDFs can be downloaded via this endpoint.' });
    }

    const StorageService = require('../services/StorageService');
    const filename = mediaItem.originalFilename || `document_${index}.pdf`;

    // Cloudinary strict delivery requires signed URLs for raw files
    const downloadUrl = StorageService.getSignedUrl(
      mediaItem.publicId,
      mediaItem.resourceType || 'raw',
      900
    );

    res.json({
      success: true,
      url: downloadUrl,
      filename,
      mimeType,
      fileSize: mediaItem.fileSize || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createAnnouncement, getAnnouncements, getActiveAnnouncements, markAsRead, updateAnnouncement, deleteAnnouncement, downloadMedia };
