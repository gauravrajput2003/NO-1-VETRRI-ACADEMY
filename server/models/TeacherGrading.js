const mongoose = require('mongoose');

// Monthly Teacher Grading — 100 Point System
const teacherGradingSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // "January 2024"
    monthNumber: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },

    // 1. Login on time to class (20 points)
    loginPunctuality: { type: Number, default: 0, min: 0, max: 20 },
    loginPunctualityNotes: { type: String },

    // 2. Distribute question papers on time (15 points)
    questionPaperOnTime: { type: Number, default: 0, min: 0, max: 15 },
    questionPaperNotes: { type: String },

    // 3. Return corrected answer sheets on time (15 points)
    answerSheetReturn: { type: Number, default: 0, min: 0, max: 15 },
    answerSheetNotes: { type: String },

    // 4. Leave taken this month (10 points, deducted if excessive)
    leaveScore: { type: Number, default: 10, min: 0, max: 10 },
    leaveDaysTaken: { type: Number, default: 0 },

    // 5. Professional appearance rating (10 points)
    professionalAppearance: { type: Number, default: 0, min: 0, max: 10 },

    // 6. Network issues reported (10 points)
    networkIssues: { type: Number, default: 10, min: 0, max: 10 },
    networkIssueCount: { type: Number, default: 0 },

    // 7. Parent rating average this month (20 points)
    parentRating: { type: Number, default: 0, min: 0, max: 20 },
    parentRatingsCount: { type: Number, default: 0 },

    // Calculated automatically
    totalScore: { type: Number, default: 0, min: 0, max: 100 },
    rank: { type: Number }, // among all teachers this month
    isBestTeacher: { type: Boolean, default: false },

    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin
    gradedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Auto-calculate total score before save
teacherGradingSchema.pre('save', function (next) {
  this.totalScore =
    (this.loginPunctuality || 0) +
    (this.questionPaperOnTime || 0) +
    (this.answerSheetReturn || 0) +
    (this.leaveScore || 0) +
    (this.professionalAppearance || 0) +
    (this.networkIssues || 0) +
    (this.parentRating || 0);
  next();
});

module.exports = mongoose.model('TeacherGrading', teacherGradingSchema);
