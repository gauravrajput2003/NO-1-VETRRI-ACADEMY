const mongoose = require('mongoose');

const demoBookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    grade: { type: String, required: true },
    course: { type: String, required: true },
    preferredDate: { type: Date },
    preferredTime: { type: String },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    demoLink: { type: String },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DemoBooking', demoBookingSchema);
