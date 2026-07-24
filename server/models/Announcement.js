const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetRole: { type: String, enum: ['all', 'student', 'teacher'], default: 'all' },
    targetCourse: { type: String },
    targetGrade: { type: String },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video', 'audio'], required: true },
        publicId: { type: String },
        originalFilename: { type: String },
        mimeType: { type: String },
        fileSize: { type: Number },
        duration: { type: Number },
        thumbnail: { type: String },
      },
    ],
  },
  { timestamps: true }
);

announcementSchema.index({ targetRole: 1, isActive: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
