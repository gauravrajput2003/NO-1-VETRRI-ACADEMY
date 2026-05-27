const mongoose = require('mongoose');

const trainingVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // ─── Video Source (one of two methods) ──────────────────────────────────
    // Method 1: Cloudinary file upload
    cloudinaryUrl: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },

    // Method 2: External URL (YouTube, direct MP4, Vimeo, etc.)
    videoUrl: { type: String, default: '' },

    // ─── Thumbnail ───────────────────────────────────────────────────────────
    thumbnailUrl: { type: String, default: '' },

    // ─── Metadata ────────────────────────────────────────────────────────────
    duration: { type: Number, default: 0 }, // seconds
    isMandatory: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Number, default: 0 },

    // ─── Extended Categories ─────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'getting-started',
        'teaching-setup',
        'live-classes',
        'student-management',
        'attendance',
        'exams',
        'assignments',
        'platform-tutorials',
        // Legacy values kept for backward compat
        'platform-tutorial',
        'teaching-methods',
        'technical-setup',
        'other',
      ],
      default: 'getting-started',
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
trainingVideoSchema.index({ isActive: 1, order: 1 });
trainingVideoSchema.index({ category: 1, isActive: 1 });
trainingVideoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TrainingVideo', trainingVideoSchema);
