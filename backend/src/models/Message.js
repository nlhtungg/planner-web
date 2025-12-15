const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    url: String,
    filename: String,
    mimetype: String,
    size: Number
  }],
  readAt: {
    type: Date,
    default: null
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for conversation queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });

// Static method to generate conversation ID
messageSchema.statics.generateConversationId = function(userId1, userId2) {
  // Sort IDs to ensure same conversationId regardless of order
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Method to check if message is deleted for a user
messageSchema.methods.isDeletedFor = function(userId) {
  return this.deletedBy.some(id => id.toString() === userId.toString());
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
