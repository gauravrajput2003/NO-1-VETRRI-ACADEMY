const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSchedule', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    meetLink: { type: String, required: true },
    meetLinkType: {
      type: String,
      enum: ['googlemeet', 'jitsi', 'zoom', 'other'],
      default: 'googlemeet',
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    isLive: { type: Boolean, default: true },
    peakStudentCount: { type: Number, default: 0 },
    totalJoined: { type: Number, default: 0 },
  },
  { timestamps: true }
);

liveSessionSchema.index({ classId: 1 }, { unique: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
