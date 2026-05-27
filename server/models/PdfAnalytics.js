const mongoose = require('mongoose');

const pdfAnalyticsSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyMaterial',
      required: true,
    },
    openedAt: { type: Date, required: true },
    closedAt: { type: Date },
    lastPage: { type: Number, default: 1 },
    totalTimeSpent: { type: Number, default: 0 }, // seconds
    completedPercentage: { type: Number, default: 0 },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'mobile',
    },
    sessionId: { type: String, required: true },
  },
  { timestamps: true }
);

pdfAnalyticsSchema.index({ studentId: 1, materialId: 1 });
pdfAnalyticsSchema.index({ materialId: 1 });
pdfAnalyticsSchema.index({ sessionId: 1 });

module.exports = mongoose.model('PdfAnalytics', pdfAnalyticsSchema);
