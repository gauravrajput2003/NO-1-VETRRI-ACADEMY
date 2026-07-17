const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema(
  {
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicantRole: { type: String, enum: ['student', 'teacher'], required: true },
    leaveType: {
      type: String,
      enum: ['sick', 'personal', 'emergency', 'other'],
      default: 'personal',
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    totalDays: { type: Number },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminRemarks: { type: String },
  },
  { timestamps: true }
);

// Auto-calculate totalDays
leaveApplicationSchema.pre('save', function (next) {
  if (this.fromDate && this.toDate) {
    const diff = Math.ceil((this.toDate - this.fromDate) / (1000 * 60 * 60 * 24)) + 1;
    this.totalDays = diff;
  }
  next();
});

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);
