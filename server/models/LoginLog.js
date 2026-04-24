const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    sessionDuration: { type: Number }, // minutes
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'], default: 'desktop' },
    date: { type: String, required: true }, // YYYY-MM-DD for dedup index
  },
  { timestamps: true }
);

// One log per user per day
loginLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LoginLog', loginLogSchema);
