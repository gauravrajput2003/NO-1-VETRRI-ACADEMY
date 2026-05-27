const mongoose = require('mongoose');

const pdfProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyMaterial',
      required: true,
    },
    lastPage: { type: Number, default: 1 },
    totalPages: { type: Number, default: 0 },
    completedPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Each user can only have one progress record per material
pdfProgressSchema.index({ userId: 1, materialId: 1 }, { unique: true });

module.exports = mongoose.model('PdfProgress', pdfProgressSchema);
