const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    course: {
      type: String,
      enum: ['CBSE', 'Matric', 'Engineering', 'Arts', 'Language', 'Competitive'],
      required: true,
    },
    board: {
      type: String,
      enum: ['CBSE', 'State Board', 'Arts College', 'Eng College', 'TNPSC', 'TRB', 'TET', ''],
    },
    subject: { type: String, required: true, trim: true },
    grade: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true }, // HH:MM (24h)
    durationMinutes: { type: Number, default: 60 },
    repeatType: { type: String, enum: ['once', 'weekly', 'daily'], default: 'once' },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    // SECURITY: meetLink NEVER returned in schedule listings — only from /join API
    meetLink: { type: String, default: null },
    meetLinkType: {
      type: String,
      enum: ['googlemeet', 'jitsi', 'zoom', 'other'],
      default: null,
    },
    recordingUrl: { type: String },
    recordingPublicId: { type: String },
    recordingDuration: { type: Number }, // seconds
    recordingUploadedAt: { type: Date },
    cancelReason: { type: String },
    googleMeetLink: { type: String, trim: true, default: '' },
    zoomMeetingLink: { type: String, trim: true, default: '' },
    // Metadata
    academicYear: { type: String },
    batch: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Index for quickly finding today's classes
classScheduleSchema.index({ teacherId: 1, scheduledDate: 1 });
classScheduleSchema.index({ studentIds: 1, scheduledDate: 1 });
classScheduleSchema.index({ course: 1, grade: 1, status: 1 });

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);
