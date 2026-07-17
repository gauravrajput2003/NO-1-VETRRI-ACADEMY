const mongoose = require('mongoose');

const trainingVideoProgressSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingVideo', required: true },
    watchedAt: { type: Date },
    isCompleted: { type: Boolean, default: false },
    watchDuration: { type: Number, default: 0 }, // seconds watched
    completedAt: { type: Date },
    lastWatchPosition: { type: Number, default: 0 }, // seconds
  },
  { timestamps: true }
);

// One progress per teacher per video
trainingVideoProgressSchema.index({ teacherId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('TrainingVideoProgress', trainingVideoProgressSchema);
