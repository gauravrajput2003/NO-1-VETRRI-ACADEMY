const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: Number, year: Number, asOf: Date, formulaVersion: String,
  totalScore: Number, coverage: Number, rank: Number, isBestTeacher: Boolean, eligible: Boolean,
  provisional: Boolean, components: mongoose.Schema.Types.Mixed, evidence: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
schema.index({ teacher: 1, month: 1, year: 1 }, { unique: true });
module.exports = mongoose.model('TeacherPerformanceReport', schema);
