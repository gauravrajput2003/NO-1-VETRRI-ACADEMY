const mongoose = require('mongoose');

const ticketCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // 'VATQ' or 'VASQ'
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/**
 * Atomically generates the next formatted ticket ID.
 * Example: 'VASQ0001', 'VATQ0001'
 * 
 * @param {'student'|'teacher'} role
 * @returns {Promise<string>} e.g. 'VASQ0001'
 */
ticketCounterSchema.statics.getNextTicketId = async function (role) {
  const prefix = role === 'teacher' ? 'VATQ' : 'VASQ';
  const counter = await this.findOneAndUpdate(
    { key: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `${prefix}${formattedSeq}`;
};

module.exports = mongoose.model('TicketCounter', ticketCounterSchema);
