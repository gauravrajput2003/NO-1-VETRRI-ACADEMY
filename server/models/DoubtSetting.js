const mongoose = require('mongoose');

const doubtSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    retentionDays: { type: Number, default: 180, min: 30, max: 3650 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoubtSetting', doubtSettingSchema);
