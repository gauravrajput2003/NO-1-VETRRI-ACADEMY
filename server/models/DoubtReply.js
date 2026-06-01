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

const readBySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const doubtReplySchema = new mongoose.Schema(
  {
    doubtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderRole: { type: String, enum: ['student', 'teacher', 'admin'], required: true },

    message: { type: String, trim: true, default: '' },
    attachments: [attachmentSchema],

    parentReplyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoubtReply', default: null },
    readBy: [readBySchema],

    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedReason: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

doubtReplySchema.index({ doubtId: 1, createdAt: 1 });

module.exports = mongoose.model('DoubtReply', doubtReplySchema);
