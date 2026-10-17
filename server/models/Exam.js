const mongoose = require('mongoose');
const assetSchema = new mongoose.Schema({
  url: String, publicId: String, resourceType: String, filename: String, mimeType: String, size: Number,
}, { _id: false });
const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedByAdmin: { type: Boolean, default: false },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  grade: { type: String, required: true, trim: true },
  board: { type: String, default: '', trim: true },
  kind: { type: String, enum: ['exam', 'homework'], default: 'exam' },
  examType: { type: String, enum: ['weekly', 'monthly', 'unit', 'revision'], default: 'weekly' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxMarks: { type: Number, required: true, min: 1, max: 10000 },
  paperDueAt: { type: Date, required: true, index: true },
  startsAt: { type: Date, required: true },
  submissionsDueAt: { type: Date, required: true },
  gradingDueAt: { type: Date, required: true, index: true },
  paper: assetSchema,
  paperSubmittedAt: Date,
  paperSubmittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: Date,
  answerCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft', index: true },
  cancelReason: String,
  cancelledAt: Date,
}, { timestamps: true });
schema.index({ teacher: 1, paperDueAt: -1 });
schema.index({ studentIds: 1, status: 1, startsAt: -1 });
module.exports = mongoose.model('Exam', schema);
