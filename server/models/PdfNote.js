const mongoose = require('mongoose');

const pdfNoteSchema = new mongoose.Schema(
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
    noteText: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    color: {
      type: String,
      default: 'yellow',
      enum: ['yellow', 'green', 'blue', 'pink', 'purple'],
    },
  },
  { timestamps: true }
);

pdfNoteSchema.index({ userId: 1, materialId: 1 });
pdfNoteSchema.index({ userId: 1 });

module.exports = mongoose.model('PdfNote', pdfNoteSchema);
