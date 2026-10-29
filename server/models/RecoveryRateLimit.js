const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String,
  events: { type: [Number], default: [] },
  allowed: Boolean,
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('RecoveryRateLimit', schema);
