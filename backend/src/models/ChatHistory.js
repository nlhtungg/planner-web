const mongoose = require('mongoose');

/**
 * Chat History Schema
 * Stores chatbot conversation history
 */
const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    knowledgeBaseSources: [{
      knowledgeBaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KnowledgeBase'
      },
      title: String,
      relevance: Number
    }]
  }]
}, {
  timestamps: true
});

// Index for efficient queries
chatHistorySchema.index({ userId: 1, sessionId: 1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;
