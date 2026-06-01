const mongoose = require('mongoose');

const doubtAuditLogSchema = new mongoose.Schema(
  {
    doubtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    action: {
      type: String,
      enum: [
        'doubt_created',
        'reply_added',
        'status_changed',
        'teacher_assigned',
        'teacher_reassigned',
        'doubt_resolved',
        'doubt_closed',
        'content_deleted',
        'retention_updated',
      ],
      required: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoubtAuditLog', doubtAuditLogSchema);
