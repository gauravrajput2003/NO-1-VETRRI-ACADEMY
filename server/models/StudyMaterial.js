const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, enum: ['pdf', 'ppt', 'video', 'image'], required: true },
    subject: { type: String, required: true },
    grade: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // S3 storage
    s3Key: { type: String, required: true }, // e.g., "pdfs/filename.pdf"
    s3Bucket: { type: String, required: true },
    fileSize: { type: Number }, // bytes
    mimeType: { type: String },

    // Access control — per student/batch
    // If lockedForAll = true, locked for everyone by default
    lockedForAll: { type: Boolean, default: true },
    // Specific student overrides
    unlockedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lockedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
