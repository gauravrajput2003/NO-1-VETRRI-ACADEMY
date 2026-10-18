const mongoose = require('mongoose');

// Durable outbox: requests survive restarts and Expo/FCM failures are observable.
const schema = new mongoose.Schema({
  token: { type: String, required: true, select: false },
  payload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  recoveryRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResetRequest' },
  encryptedPayload: { type: String, select: false },
  dedupeKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ['queued', 'sending', 'receipt_pending', 'delivered', 'failed'], default: 'queued' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  ticketId: String,
  errorCode: String,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 86400000) },
}, { timestamps: true });
schema.index({ status: 1, nextAttemptAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PushDelivery', schema);
