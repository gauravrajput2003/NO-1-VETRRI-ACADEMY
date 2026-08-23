const express = require('express');
const router = express.Router();
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const Announcement = require('../models/Announcement');
const cloudinaryService = require('../services/cloudinaryService');
const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncements,
  markAsRead,
} = require('../controllers/announcementController');

/**
 * GET /api/announcements/:id/media/:index/download
 * Generates an authenticated/direct download URL for an announcement's media item.
 */
const downloadAnnouncementMedia = async (req, res) => {
  try {
    const { id, index } = req.params;
    const mediaIndex = parseInt(index, 10);

    // 1. Fetch Announcement
    const announcement = await Announcement.findById(id);
    if (!announcement || announcement.deletedAt) {
      console.warn(`[Announcement Media Download] 404: Announcement not found or soft-deleted (ID: ${id})`);
      return res.status(404).json({
        success: false,
        reason: 'ANNOUNCEMENT_NOT_FOUND',
        message: `Announcement not found with ID: ${id}`,
      });
    }

    // 2. Validate Media Index
    const mediaList = announcement.media || [];
    if (isNaN(mediaIndex) || mediaIndex < 0 || mediaIndex >= mediaList.length) {
      console.warn(`[Announcement Media Download] 404: Media index out of bounds. Requested index: ${index}, Total media items: ${mediaList.length}, Announcement ID: ${id}`);
      return res.status(404).json({
        success: false,
        reason: 'MEDIA_INDEX_OUT_OF_BOUNDS',
        message: `Media item at index ${index} not found. Available media count: ${mediaList.length}`,
      });
    }

    const item = mediaList[mediaIndex];
    if (!item || !item.url) {
      console.warn(`[Announcement Media Download] 404: Media item missing or has no URL at index ${mediaIndex} for Announcement ID: ${id}`);
      return res.status(404).json({
        success: false,
        reason: 'MEDIA_URL_MISSING',
        message: 'Media URL is missing for this attachment.',
      });
    }

    // 3. Resolve resourceType & generate download/signed URL
    const filename = item.originalFilename || path.basename(item.url) || `announcement_${id}_media_${mediaIndex}`;
    const extension = item.originalFilename ? path.extname(item.originalFilename).replace('.', '') : '';
    const resourceType = item.resourceType || (item.mimeType?.startsWith('video/') || item.mimeType?.startsWith('audio/') || item.type === 'video' || item.type === 'audio' ? 'video' : item.mimeType?.startsWith('image/') || item.type === 'image' ? 'image' : 'raw');

    let downloadUrl = item.url;

    if (item.publicId && cloudinaryService) {
      // Use Cloudinary attachment download URL transformation
      downloadUrl = cloudinaryService.getDownloadUrl(
        item.url,
        filename,
        extension,
        true
      );

      // If signed URL is supported, generate signed URL
      if (typeof cloudinaryService.getSignedUrl === 'function') {
        const signed = cloudinaryService.getSignedUrl(item.publicId, resourceType, 3600);
        if (signed) {
          downloadUrl = signed;
        }
      }
    }

    console.log(`[Announcement Media Download] 200: Successfully generated download URL for Announcement ID: ${id}, Index: ${mediaIndex}, Filename: "${filename}", ResourceType: "${resourceType}"`);

    return res.json({
      success: true,
      url: downloadUrl,
      filename,
      media: item,
    });
  } catch (error) {
    console.error(`[Announcement Media Download] 500: Internal error generating download URL: ${error.message}`);
    return res.status(500).json({
      success: false,
      reason: 'INTERNAL_ERROR',
      message: error.message || 'Failed to generate download URL.',
    });
  }
};

router.post('/', verifyToken, adminOnly, createAnnouncement);
router.get('/', verifyToken, adminOnly, getAnnouncements);
router.get('/active', verifyToken, getActiveAnnouncements);
router.get('/:id/media/:index/download', verifyToken, downloadAnnouncementMedia);
router.post('/:id/read', verifyToken, markAsRead);
router.patch('/:id', verifyToken, adminOnly, updateAnnouncement);
router.delete('/:id', verifyToken, adminOnly, deleteAnnouncement);

module.exports = router;
