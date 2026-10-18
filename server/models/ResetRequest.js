const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  identifier: { type: String, required: true, maxlength: 254 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  status: { type: String, enum: ['pending', 'sent', 'used', 'expired', 'rejected', 'locked'], default: 'pending' },
  activeRequest: { type: Boolean, default: true },
  deviceToken: { type: String, select: false },
  tempPasswordHash: { type: String, select: false },
  revision: { type: Number, default: 0 },
  sentAt: Date,
  tempPasswordExpiresAt: Date,
  failedAttempts: { type: Number, default: 0 },
  pendingSince: { type: Date, default: Date.now },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handledAt: Date,
  chatMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  deliveryChannels: { type: [String], default: [] },
}, { timestamps: true });
schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { activeRequest: true } });
schema.index({ status: 1, createdAt: -1 });
schema.index({ status: 1, tempPasswordExpiresAt: 1 });
module.exports = mongoose.model('ResetRequest', schema);
