const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetRole: { type: String, enum: ['all', 'student', 'teacher'], default: 'all' },
    targetCourse: { type: String }, // optional filter
    targetGrade: { type: String }, // optional filter
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

announcementSchema.index({ targetRole: 1, isActive: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
