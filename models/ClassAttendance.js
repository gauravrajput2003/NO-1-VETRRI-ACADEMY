const mongoose = require('mongoose');

const classAttendanceSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSchedule', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinTime: { type: Date },
    leftTime: { type: Date },
    durationPresent: { type: Number, default: 0 }, // minutes
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'absent',
    },
    isManualEntry: { type: Boolean, default: false },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    manualReason: { type: String },
    date: { type: String }, // YYYY-MM-DD for easy querying
  },
  { timestamps: true }
);

// One attendance per student per class
classAttendanceSchema.index({ classId: 1, studentId: 1 }, { unique: true });
classAttendanceSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model('ClassAttendance', classAttendanceSchema);
