const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageSender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  nicknames: {
    type: Map,
    of: String,
    default: {}
  },
  themeColor: {
    type: String,
    default: '#3B82F6' // blue-600
  }
}, {
  timestamps: true
});

// Index for finding user's conversations
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// Method to increment unread count for a user
conversationSchema.methods.incrementUnread = function(userId) {
  const count = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), count + 1);
};

// Method to reset unread count for a user
conversationSchema.methods.resetUnread = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
