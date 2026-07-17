const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    classSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSchedule' },
    liveClass: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass' },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'absent',
    },
    loginTime: { type: Date }, // when student actually joined
    logoutTime: { type: Date },
    minutesAttended: { type: Number, default: 0 },
    markedBy: {
      type: String,
      enum: ['teacher', 'system', 'admin'],
      default: 'teacher',
    },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Compound index: one attendance record per student per date
attendanceSchema.index({ student: 1, date: 1, liveClass: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
