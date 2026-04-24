const TrainingVideo = require('../models/TrainingVideo');
const TrainingVideoProgress = require('../models/TrainingVideoProgress');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../middleware/upload');

// ─── Admin: Upload Training Video ────────────────────────────────────────────
const uploadTrainingVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const { title, description, category, isMandatory, order } = req.body;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vettri-academy/training-videos',
      resource_type: 'video',
      eager: [{ width: 400, height: 300, crop: 'fill', format: 'jpg' }], // Auto thumbnail
      eager_async: true,
    });

    const thumbnailUrl = result.eager?.[0]?.secure_url ||
      `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/so_0/${result.public_id}.jpg`;

    const video = await TrainingVideo.create({
      title,
      description,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      thumbnailUrl,
      duration: result.duration || 0,
      isMandatory: isMandatory === 'true',
      uploadedBy: req.user._id,
      order: parseInt(order) || 0,
      category: category || 'other',
    });

    res.status(201).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Teacher: Get All Training Videos (with own progress) ────────────────────
const getTrainingVideos = async (req, res) => {
  try {
    const videos = await TrainingVideo.find({ isActive: true }).sort({ order: 1, createdAt: 1 });

    const progressList = await TrainingVideoProgress.find({ teacherId: req.user._id });
    const progressMap = new Map(progressList.map((p) => [p.videoId.toString(), p]));

    const videosWithProgress = videos.map((v) => {
      const progress = progressMap.get(v._id.toString());
      return {
        ...v.toObject(),
        progress: progress
          ? {
              isCompleted: progress.isCompleted,
              watchDuration: progress.watchDuration,
              completedAt: progress.completedAt,
              percentWatched: v.duration > 0 ? Math.min(100, Math.round((progress.watchDuration / v.duration) * 100)) : 0,
            }
          : { isCompleted: false, watchDuration: 0, percentWatched: 0 },
      };
    });

    res.json({ success: true, videos: videosWithProgress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Teacher: Mark Video as Complete ─────────────────────────────────────────
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

// ─── Teacher: Update Watch Progress ──────────────────────────────────────────
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

// ─── Teacher: Get Incomplete Mandatory Count (for sidebar badge) ──────────────
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

// ─── Admin: Delete Training Video ────────────────────────────────────────────
const deleteTrainingVideo = async (req, res) => {
  try {
    const video = await TrainingVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' });

    // Delete progress records
    await TrainingVideoProgress.deleteMany({ videoId: video._id });
    await TrainingVideo.findByIdAndDelete(video._id);

    res.json({ success: true, message: 'Training video deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Get All Teacher Progress (Matrix) ─────────────────────────────────
const getProgressMatrix = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true }).select('name displayName profilePic');
    const videos = await TrainingVideo.find({ isActive: true }).sort({ order: 1 });
    const allProgress = await TrainingVideoProgress.find();

    // Build matrix
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
  uploadTrainingVideo,
  getTrainingVideos,
  markVideoComplete,
  updateWatchProgress,
  getIncompleteMandatoryCount,
  deleteTrainingVideo,
  getProgressMatrix,
};
