const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['student', 'teacher', 'admin'] },
    senderDisplayName: { type: String },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: String, required: true, index: true }, // sorted "id1_id2"
    message: { type: String, trim: true },
    messageType: {
      type: String,
      enum: ['text', 'file', 'image', 'system'],
      default: 'text',
    },
    fileUrl: { type: String }, // Cloudinary URL
    fileType: {
      type: String,
      enum: ['pdf', 'image', 'ppt', 'doc', null],
      default: null,
    },
    fileName: { type: String },
    fileSize: { type: Number }, // bytes
    cloudinaryPublicId: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    // Legacy compat
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roomId: { type: String },
  },
  { timestamps: true }
);

// Static method to generate consistent conversation/room ID
chatMessageSchema.statics.getConversationId = function (id1, id2) {
  return [id1.toString(), id2.toString()].sort().join('_');
};

// Legacy compat
chatMessageSchema.statics.getRoomId = chatMessageSchema.statics.getConversationId;

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
