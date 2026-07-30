const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, enum: ['pdf', 'ppt', 'video', 'image', 'document', 'archive'], required: true },
    subject: { type: String, required: true },
    grade: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialFolder' },

    // Legacy S3 storage
    s3Key: { type: String }, // e.g., "pdfs/filename.pdf"
    s3Bucket: { type: String },

    // Unified storage fields (cloudinary/s3)
    fileUrl: { type: String },
    publicId: { type: String },
    storageType: { type: String, enum: ['s3', 'cloudinary'], default: 'cloudinary' },
    
    // ─── NEW: File metadata for proper download handling ────────────────────
    originalFilename: { type: String }, // Original filename with extension (e.g., "notes.pdf", "lecture1.pptx")
    extension: { type: String }, // File extension without dot (e.g., "pdf", "docx", "pptx")
    resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'raw' }, // Cloudinary resource type
    
    fileSize: { type: Number }, // bytes
    mimeType: { type: String }, // MIME type for content-type headers

    // PDF-specific fields
    totalPages: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: '' },

    // Access control — per student/batch
    // If lockedForAll = true, locked for everyone by default
    lockedForAll: { type: Boolean, default: true },
    // Specific student overrides
    unlockedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lockedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Admin approval workflow
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending_new', 'pending_edit', 'pending_delete', 'rejected'],
      default: 'approved',
    },
    pendingChanges: { type: mongoose.Schema.Types.Mixed, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    uploadedByRole: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
  },
  { timestamps: true }
);

// Index for faster queries
studyMaterialSchema.index({ teacher: 1, course: 1, subject: 1 });
studyMaterialSchema.index({ course: 1, lockedForAll: 1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
