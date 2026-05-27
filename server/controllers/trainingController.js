const TrainingVideo = require('../models/TrainingVideo');
const TrainingVideoProgress = require('../models/TrainingVideoProgress');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { logDev, warnDev, errorCrit } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ─── Helper: get the best playable URL from a video doc ──────────────────────
const getPlayableUrl = (video) =>
  video.videoUrl || video.cloudinaryUrl || '';

// ─── Helper: cleanup temp file ───────────────────────────────────────────────
const cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
};

// ─── ADMIN: Upload Training Video (file upload to Cloudinary) ─────────────────
const uploadTrainingVideo = async (req, res) => {
  let tempFilePath = req.file?.path;
  try {
    logDev('[uploadTrainingVideo] Upload request received');

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received by server. Ensure Content-Type is multipart/form-data and field name is "video".' });
    }

    const { title, description, category, isMandatory, order, thumbnailUrl } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });

    // Upload to Cloudinary from disk — force resource_type video regardless of MIME
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'vettri-academy/training-videos',
      resource_type: 'video',
      eager: [{ width: 400, height: 300, crop: 'fill', format: 'jpg' }],
      eager_async: true,
    });

    const autoThumb =
      result.eager?.[0]?.secure_url ||
      `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/so_0/${result.public_id}.jpg`;

    // Get max order if not supplied
    let nextOrder = parseInt(order) || 0;
    if (!order) {
      const last = await TrainingVideo.findOne().sort({ order: -1 }).select('order');
      nextOrder = (last?.order || 0) + 1;
    }

    const video = await TrainingVideo.create({
      title,
      description,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      videoUrl: result.secure_url,      // also set videoUrl for unified player
      thumbnailUrl: thumbnailUrl || autoThumb,
      duration: result.duration || 0,
      isMandatory: isMandatory === 'true' || isMandatory === true,
      uploadedBy: req.user._id,
      order: nextOrder,
      category: category || 'getting-started',
      isActive: true,
    });

    cleanupTempFile(tempFilePath);
    res.status(201).json({ success: true, video });
  } catch (error) {
    cleanupTempFile(tempFilePath);
    errorCrit('[uploadTrainingVideo]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Upload Training Video by URL (no file) ───────────────────────────
const uploadTrainingVideoByUrl = async (req, res) => {
  try {
    const { title, description, category, isMandatory, order, videoUrl, thumbnailUrl, duration } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!videoUrl) return res.status(400).json({ success: false, message: 'videoUrl is required.' });

    let nextOrder = parseInt(order) || 0;
    if (!order) {
      const last = await TrainingVideo.findOne().sort({ order: -1 }).select('order');
      nextOrder = (last?.order || 0) + 1;
    }

    const video = await TrainingVideo.create({
      title,
      description,
      cloudinaryUrl: '',
      cloudinaryPublicId: '',
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      duration: parseInt(duration) || 0,
      isMandatory: isMandatory === 'true' || isMandatory === true,
      uploadedBy: req.user._id,
      order: nextOrder,
      category: category || 'getting-started',
      isActive: true,
    });

    res.status(201).json({ success: true, video });
  } catch (error) {
    errorCrit('[uploadTrainingVideoByUrl]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Get ALL Videos (active + inactive) ───────────────────────────────
const getAllVideosAdmin = async (req, res) => {
  try {
    const { search, category, status } = req.query;

    const filter = {};
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (category && category !== 'all') filter.category = category;
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;

    const videos = await TrainingVideo.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate('uploadedBy', 'name displayName');

    // Attach progress stats per video
    const progressCounts = await TrainingVideoProgress.aggregate([
      { $group: { _id: '$videoId', total: { $sum: 1 }, completed: { $sum: { $cond: ['$isCompleted', 1, 0] } } } },
    ]);
    const progMap = new Map(progressCounts.map((p) => [p._id.toString(), p]));

    const videosWithStats = videos.map((v) => {
      const prog = progMap.get(v._id.toString()) || { total: 0, completed: 0 };
      return {
        ...v.toObject(),
        playableUrl: getPlayableUrl(v),
        stats: { totalWatchers: prog.total, completedCount: prog.completed },
      };
    });

    res.json({ success: true, videos: videosWithStats, total: videos.length });
  } catch (error) {
    errorCrit('[getAllVideosAdmin]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Edit Training Video ───────────────────────────────────────────────
const editTrainingVideo = async (req, res) => {
  try {
    const { title, description, category, isMandatory, order, videoUrl, thumbnailUrl, duration, isActive } = req.body;
    const video = await TrainingVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (category !== undefined) video.category = category;
    if (isMandatory !== undefined) video.isMandatory = isMandatory === 'true' || isMandatory === true;
    if (order !== undefined) video.order = parseInt(order) || video.order;
    if (videoUrl !== undefined) video.videoUrl = videoUrl;
    if (thumbnailUrl !== undefined) video.thumbnailUrl = thumbnailUrl;
    if (duration !== undefined) video.duration = parseInt(duration) || video.duration;
    if (isActive !== undefined) video.isActive = isActive === 'true' || isActive === true;

    await video.save();
    res.json({ success: true, video });
  } catch (error) {
    errorCrit('[editTrainingVideo]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Toggle Active Status ──────────────────────────────────────────────
const toggleVideoStatus = async (req, res) => {
  try {
    const video = await TrainingVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    video.isActive = !video.isActive;
    await video.save();

    res.json({ success: true, isActive: video.isActive, message: `Video ${video.isActive ? 'activated' : 'deactivated'}.` });
  } catch (error) {
    errorCrit('[toggleVideoStatus]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Reorder Videos ────────────────────────────────────────────────────
const reorderVideos = async (req, res) => {
  try {
    const { items } = req.body; // [{ id, order }, ...]
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'items array required.' });

    const ops = items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: parseInt(order) || 0 } } },
    }));
    await TrainingVideo.bulkWrite(ops);

    res.json({ success: true, message: 'Videos reordered.' });
  } catch (error) {
    errorCrit('[reorderVideos]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TEACHER: Get All Active Training Videos (with own progress) ──────────────
const getTrainingVideos = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const videos = await TrainingVideo.find(filter).sort({ order: 1, createdAt: -1 });

    const progressList = await TrainingVideoProgress.find({ teacherId: req.user._id });
    const progressMap = new Map(progressList.map((p) => [p.videoId.toString(), p]));

    const videosWithProgress = videos.map((v) => {
      const progress = progressMap.get(v._id.toString());
      return {
        ...v.toObject(),
        playableUrl: getPlayableUrl(v),
        progress: progress
          ? {
              isCompleted: progress.isCompleted,
              watchDuration: progress.watchDuration,
              completedAt: progress.completedAt,
              lastWatchPosition: progress.lastWatchPosition || 0,
              percentWatched:
                v.duration > 0 ? Math.min(100, Math.round((progress.watchDuration / v.duration) * 100)) : 0,
            }
          : { isCompleted: false, watchDuration: 0, percentWatched: 0, lastWatchPosition: 0 },
      };
    });

    res.json({ success: true, videos: videosWithProgress });
  } catch (error) {
    errorCrit('[getTrainingVideos]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TEACHER: Mark Video as Complete ──────────────────────────────────────────
const markVideoComplete = async (req, res) => {
  try {
    const { watchDuration } = req.body;
    const videoId = req.params.id;

    const video = await TrainingVideo.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    const progress = await TrainingVideoProgress.findOneAndUpdate(
      { teacherId: req.user._id, videoId },
      {
        isCompleted: true,
        watchDuration: watchDuration || video.duration,
        watchedAt: new Date(),
        completedAt: new Date(),
        lastWatchPosition: watchDuration || video.duration,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TEACHER: Update Watch Progress ───────────────────────────────────────────
const updateWatchProgress = async (req, res) => {
  try {
    const { watchDuration, currentPosition } = req.body;
    const videoId = req.params.id;

    const video = await TrainingVideo.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    const percentWatched = video.duration > 0 ? (watchDuration / video.duration) * 100 : 0;
    const isCompleted = percentWatched >= 90;

    await TrainingVideoProgress.findOneAndUpdate(
      { teacherId: req.user._id, videoId },
      {
        watchDuration,
        lastWatchPosition: currentPosition || watchDuration,
        watchedAt: new Date(),
        ...(isCompleted && { isCompleted: true, completedAt: new Date() }),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, isCompleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TEACHER: Get Incomplete Mandatory Count ───────────────────────────────────
const getIncompleteMandatoryCount = async (req, res) => {
  try {
    const mandatoryVideos = await TrainingVideo.find({ isMandatory: true, isActive: true });
    const mandatoryIds = mandatoryVideos.map((v) => v._id);

    const completed = await TrainingVideoProgress.countDocuments({
      teacherId: req.user._id,
      videoId: { $in: mandatoryIds },
      isCompleted: true,
    });

    const count = mandatoryIds.length - completed;
    res.json({ success: true, count: Math.max(0, count) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Delete Training Video ─────────────────────────────────────────────
const deleteTrainingVideo = async (req, res) => {
  try {
    const video = await TrainingVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    // Delete from Cloudinary only if uploaded there
    if (video.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' });
      } catch (e) {
        warnDev('[deleteTrainingVideo] Cloudinary delete failed:', e.message);
      }
    }

    await TrainingVideoProgress.deleteMany({ videoId: video._id });
    await TrainingVideo.findByIdAndDelete(video._id);

    res.json({ success: true, message: 'Training video deleted.' });
  } catch (error) {
    errorCrit('[deleteTrainingVideo]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Get Teacher Progress Matrix ───────────────────────────────────────
const getProgressMatrix = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true }).select('name displayName profilePic');
    const videos = await TrainingVideo.find({ isActive: true }).sort({ order: 1 });
    const allProgress = await TrainingVideoProgress.find();

    const matrix = teachers.map((teacher) => {
      const teacherProgress = allProgress.filter(
        (p) => p.teacherId.toString() === teacher._id.toString()
      );
      const progressMap = new Map(teacherProgress.map((p) => [p.videoId.toString(), p]));

      const videoStatus = videos.map((v) => ({
        videoId: v._id,
        title: v.title,
        isMandatory: v.isMandatory,
        isCompleted: progressMap.get(v._id.toString())?.isCompleted || false,
        completedAt: progressMap.get(v._id.toString())?.completedAt,
      }));

      const completedMandatory = videoStatus.filter((v) => v.isMandatory && v.isCompleted).length;
      const totalMandatory = videos.filter((v) => v.isMandatory).length;

      return {
        teacher: { _id: teacher._id, name: teacher.name, displayName: teacher.displayName, profilePic: teacher.profilePic },
        videoStatus,
        completedMandatory,
        totalMandatory,
        allMandatoryDone: completedMandatory >= totalMandatory,
      };
    });

    const allDone = matrix.filter((t) => t.allMandatoryDone).length;
    res.json({ success: true, matrix, summary: { total: teachers.length, allDone } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // Admin
  uploadTrainingVideo,
  uploadTrainingVideoByUrl,
  getAllVideosAdmin,
  editTrainingVideo,
  toggleVideoStatus,
  reorderVideos,
  deleteTrainingVideo,
  getProgressMatrix,
  // Teacher
  getTrainingVideos,
  markVideoComplete,
  updateWatchProgress,
  getIncompleteMandatoryCount,
};
