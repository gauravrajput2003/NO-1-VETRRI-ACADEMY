const mongoose = require('mongoose');

const trainingVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    thumbnailUrl: { type: String },
    duration: { type: Number, default: 0 }, // seconds
    isMandatory: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ['platform-tutorial', 'teaching-methods', 'technical-setup', 'other'],
      default: 'other',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrainingVideo', trainingVideoSchema);
