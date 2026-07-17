const mongoose = require('mongoose');

const weeklyTopPerformerSchema = new mongoose.Schema(
  {
    weekStart: { type: Date, required: true }, // Monday of the week
    weekEnd: { type: Date, required: true },   // Sunday
    course: { type: String },
    grade: { type: String },
    rankings: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rank: { type: Number },
        score: { type: Number }, // Combined score 0-100
        examAvgPercent: { type: Number },
        attendancePercent: { type: Number },
        points: { type: Number, default: 0 }, // Accumulated monthly
      },
    ],
    calculatedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

weeklyTopPerformerSchema.index({ weekStart: 1, course: 1, grade: 1 });

module.exports = mongoose.model('WeeklyTopPerformer', weeklyTopPerformerSchema);
