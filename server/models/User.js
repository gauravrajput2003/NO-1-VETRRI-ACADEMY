const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },

    // Profile
    profilePic: { type: String, default: '' }, // DiceBear SVG URL or Cloudinary URL
    displayName: { type: String, trim: true },
    bio: { type: String, maxlength: 160 },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: true },

    // Student-specific
    grade: { type: String },
    board: { type: String, trim: true, default: '' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admissionFormFilled: { type: Boolean, default: false },
    firstLogin: { type: Boolean, default: true },
    feeAmount: { type: Number, default: 0 },
    feeFrequency: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'one-time'], default: 'monthly' },
    feeDueDate: { type: Number, default: 1 }, // e.g., 1st of every month
    feeNotes: { type: String, default: '' },

    // Teacher-specific
    qualification: { type: String },
    subjects: [{ type: String }],
    experience: { type: String },
    experienceYears: { type: Number },
    teacherBio: { type: String }, // Student-facing bio

    // Salary management
    salary: {
      baseSalary: { type: Number, default: 0 },
      performanceBonus: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      providentFund: { type: Number, default: 0 },
      taxDeduction: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
      bankAccount: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      paymentMode: { type: String, default: 'bank_transfer' },
      attendanceDeduction: { type: Boolean, default: false },
      daysInMonth: { type: Number, default: 26 },
      daysPresent: { type: Number, default: 26 },
      deductionPerDay: { type: Number, default: 0 },
      paidLeaveBalance: { type: Number, default: 12 },
      casualLeaveBalance: { type: Number, default: 5 },
      medicalLeaveBalance: { type: Number, default: 10 },
    },
    salaryHistory: [{
      month: { type: String },
      year: { type: Number },
      monthYear: { type: String },
      baseSalary: { type: Number, default: 0 },
      performanceBonus: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      grossSalary: { type: Number, default: 0 },
      providentFund: { type: Number, default: 0 },
      taxDeduction: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
      paymentStatus: { type: String, enum: ['paid', 'pending', 'partial', 'advance'], default: 'pending' },
      paidDate: { type: Date },
      paidAmount: { type: Number, default: 0 },
      paymentMethod: { type: String, default: 'bank_transfer' },
      transactionId: { type: String, default: '' },
      payments: [{
        amount: { type: Number },
        method: { type: String },
        transactionId: { type: String },
        proofImage: { type: String },
        remarks: { type: String },
        paidAt: { type: Date }
      }],
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedAt: { type: Date },
      notes: { type: String, default: '' },
      salarySlipGenerated: { type: Boolean, default: false },
      salarySlipUrl: { type: String, default: '' },
      processedAt: { type: Date },
      remarks: { type: String, default: '' },
    }],

    // Admin-specific
    institutionName: { type: String },
    contactEmail: { type: String },

    // Online/session tracking
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date },

    // Login streak
    loginStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalLoginDays: { type: Number, default: 0 },
    lastLoginDate: { type: String }, // YYYY-MM-DD

    // Push notifications
    deviceTokens: [{ type: String }],

    // Soft delete
    deactivatedAt: { type: Date },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Common
    refreshToken: { type: String },
    notificationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate DiceBear avatar URL from userId
userSchema.statics.getDiceBearUrl = function (userId) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
};

// Never expose password, refreshToken, or teacher contact to students
userSchema.methods.toSafeJSON = function (requestingRole) {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  if (requestingRole === 'student') {
    delete obj.mobile;
    delete obj.email;
    delete obj.deviceTokens;
  }
  return obj;
};

module.exports = mongoose.model('User', userSchema);
