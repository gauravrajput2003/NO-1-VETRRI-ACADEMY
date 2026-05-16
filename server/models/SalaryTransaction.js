const mongoose = require('mongoose');

const salaryTransactionSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherName: { type: String, required: true },
    teacherEmail: { type: String, default: '' },

    month: { type: String, required: true },
    year: { type: Number, required: true },
    monthYear: { type: String, required: true },

    baseSalary: { type: Number, default: 0 },
    performanceBonus: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    providentFund: { type: Number, default: 0 },
    taxDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },

    netSalary: { type: Number, default: 0 },

    paymentStatus: { type: String, enum: ['paid', 'pending', 'advance'], default: 'pending' },
    paidDate: { type: Date },
    paidAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'bank_transfer' },
    transactionId: { type: String, default: '' },

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String, default: '' },
    processedAt: { type: Date },

    salarySlipGenerated: { type: Boolean, default: false },
    salarySlipUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

salaryTransactionSchema.index({ teacherId: 1, monthYear: 1 }, { unique: true });

module.exports = mongoose.model('SalaryTransaction', salaryTransactionSchema);