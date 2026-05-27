const mongoose = require('mongoose');

const examScoreSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    subject: { type: String, required: true },
    examTitle: { type: String, required: true }, // "Week 1 Test", "Monthly Exam"
    examType: {
      type: String,
      enum: ['weekly', 'monthly', 'unit', 'revision'],
      default: 'weekly',
    },
    maxMarks: { type: Number, required: true, default: 100 },
    marksObtained: { type: Number, required: true },
    grade: { type: String }, // A+, A, B, etc.
    examDate: { type: Date, required: true },
    weekNumber: { type: Number }, // 1-52
    month: { type: String },
    year: { type: Number },
    remarks: { type: String },
    isPublished: { type: Boolean, default: true }, // auto-appear on student dashboard
  },
  { timestamps: true }
);

// Auto-calculate percentage and grade
examScoreSchema.virtual('percentage').get(function () {
  return ((this.marksObtained / this.maxMarks) * 100).toFixed(1);
});

module.exports = mongoose.model('ExamScore', examScoreSchema);
