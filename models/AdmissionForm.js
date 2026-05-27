const mongoose = require('mongoose');

const admissionFormSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for walk-in
    studentName: { type: String, required: true, trim: true },
    parentName: { type: String, required: true, trim: true },
    grade: {
      type: String,
      required: true,
      enum: ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG', 'PG'],
    },
    board: {
      type: String,
      required: true,
      enum: ['CBSE', 'State Board', 'Arts College', 'Eng College', 'TNPSC', 'TRB', 'TET'],
    },
    dateOfBirth: { type: Date, required: true },
    subject: { type: String, required: true },
    demoClassStatus: {
      type: String,
      enum: ['Completed', 'Not Necessary', 'Pending'],
      default: 'Pending',
    },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    // Admin notes
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admissionStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'waitlisted'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminRemarks: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdmissionForm', admissionFormSchema);
