const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    fileType: { type: String, enum: ['image', 'pdf', 'audio', 'doc'], default: 'image' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true }, // e.g. 'VASQ0001', 'VATQ0001'
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['student', 'teacher'], required: true, index: true },

    category: {
      type: String,
      enum: [
        'fee_issue',
        'study_material',
        'live_class',
        'leave_attendance',
        'exam_scores',
        'technical_app',
        'other',
      ],
      required: true,
      index: true,
    },
    categoryLabel: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    attachments: [attachmentSchema],

    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // Admin response & handling
    adminReply: { type: String, trim: true, default: '' },
    adminRepliedAt: { type: Date },
    adminRepliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    closedAt: { type: Date },

    // Retention safety policy (Delete only enabled after 3 days from creation)
    canDeleteAfter: {
      type: Date,
      required: true,
      index: true,
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for query performance
supportTicketSchema.index({ createdAt: -1, isDeleted: 1 });
supportTicketSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
