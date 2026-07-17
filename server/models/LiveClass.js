const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    // Join link (Zoom/Meet/Teams) — visible to students but teacher contact details are NOT exposed
    joinLink: { type: String, required: true },
    platform: {
      type: String,
      enum: ['zoom', 'meet', 'teams', 'other'],
      default: 'meet',
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true }, // "10:00 AM"
    duration: { type: Number, default: 60 }, // minutes
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    // Students enrolled in this class
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Real-time tracking
    studentsJoined: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date },
        leftAt: { type: Date },
      },
    ],
    completedAt: { type: Date },
    recordingUrl: { type: String }, // S3 key for class recording
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveClass', liveClassSchema);
