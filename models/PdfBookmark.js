const mongoose = require('mongoose');

const pdfBookmarkSchema = new mongoose.Schema(
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
    pageNumber: { type: Number, required: true },
    label: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Each user can only bookmark a page once per material
pdfBookmarkSchema.index({ userId: 1, materialId: 1, pageNumber: 1 }, { unique: true });
pdfBookmarkSchema.index({ userId: 1 });

module.exports = mongoose.model('PdfBookmark', pdfBookmarkSchema);
