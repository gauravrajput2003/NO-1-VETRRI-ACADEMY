const mongoose = require('mongoose');

const feesRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    month: { type: String, required: true }, // "January 2024"
    monthNumber: { type: Number }, // 1-12
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'partial'],
      default: 'pending',
    },
    paidAt: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online', 'upi', 'bank_transfer', 'cheque', 'card', 'other', ''],
      default: '',
    },
    transactionId: { type: String },
    receiptNumber: { type: String },
    dueDate: { type: Date },
    remarks: { type: String },
    reminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeesRecord', feesRecordSchema);
