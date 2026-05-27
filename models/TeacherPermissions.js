const mongoose = require('mongoose');

const teacherPermissionsSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    canShareFiles: { type: Boolean, default: true },
    canSendMessages: { type: Boolean, default: true },
    canAccessStudentList: { type: Boolean, default: true },
    canUploadMaterials: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
  },
  
  { timestamps: true }
);

module.exports = mongoose.model('TeacherPermissions', teacherPermissionsSchema);
