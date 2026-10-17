const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  attachments: [{ url: String, publicId: String, resourceType: String, filename: String, mimeType: String, size: Number }],
  classBoard: String,
  note: { type: String, default: '', maxlength: 3000 },
  submittedAt: { type: Date, required: true },
  gradedAt: Date,
  firstGradedAt: Date,
  marksObtained: Number,
  feedback: { type: String, default: '', maxlength: 3000 },
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
  gradingHistory: [{ marks: Number, feedback: String, at: Date, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
}, { timestamps: true });
schema.index({ exam: 1, student: 1 }, { unique: true });
module.exports = mongoose.model('ExamSubmission', schema);
