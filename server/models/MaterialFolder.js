const mongoose = require('mongoose');

const materialFolderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },       // e.g. "Class 8"
  grade: { type: String, required: true, unique: true },    // e.g. "8"
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  order: { type: Number, default: 0 }, // admin-controlled display order
}, { timestamps: true });

module.exports = mongoose.model('MaterialFolder', materialFolderSchema);
