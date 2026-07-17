const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true }, // sorted "id1_id2"
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    lastMessageBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
