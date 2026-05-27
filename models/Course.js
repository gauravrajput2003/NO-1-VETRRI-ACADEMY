const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['CBSE', 'State Board', 'Engineering', 'Arts & Science', 'Language', 'Competitive'],
      required: true,
    },
    grades: [{ type: String }], // e.g. ["6th","7th","8th","9th","10th","11th","12th"]
    subjects: [{ type: String }],
    description: { type: String },
    icon: { type: String, default: '📚' },
    isActive: { type: Boolean, default: true },
    price: { type: Number, default: 0 },
    duration: { type: String, default: '1 Year' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
