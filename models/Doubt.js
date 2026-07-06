const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    storageType: { type: String, enum: ['cloudinary', 's3'], default: 'cloudinary' },
    resourceType: { type: String, enum: ['image', 'raw', 'video'], default: 'raw' },
    attachmentType: { type: String, enum: ['image', 'pdf', 'audio'], required: true },
    mimeType: { type: String, required: true },
    originalFilename: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
  },
  { _id: false }
);

const doubtSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],

    status: {
      type: String,
      enum: ['open', 'teacher_responded', 'waiting_for_student', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },

    attachments: [attachmentSchema],

    lastActivityAt: { type: Date, default: Date.now, index: true },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedReason: { type: String, trim: true, default: '' },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

doubtSchema.index({ createdAt: -1, isDeleted: 1 });

module.exports = mongoose.model('Doubt', doubtSchema);
