const mongoose = require('mongoose');

const commentReactionSchema = new mongoose.Schema({
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostComment',
    required: [true, 'Comment is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  reactionType: {
    type: String,
    required: [true, 'Reaction type is required'],
    enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'custom'],
    default: 'like'
  },
  emoji: {
    type: String,
    required: [true, 'Emoji is required']
  }
}, {
  timestamps: true
});

// Indexes for performance
commentReactionSchema.index({ comment: 1, user: 1 }, { unique: true }); // One reaction per user per comment
commentReactionSchema.index({ comment: 1, reactionType: 1 });
commentReactionSchema.index({ user: 1 });

// Static method to get user's reaction on a comment
commentReactionSchema.statics.getUserReaction = function(commentId, userId) {
  return this.findOne({ comment: commentId, user: userId });
};

// Static method to get reaction summary for a comment
commentReactionSchema.statics.getReactionSummary = function(commentId) {
  return this.aggregate([
    { $match: { comment: new mongoose.Types.ObjectId(commentId) } },
    {
      $group: {
        _id: '$emoji',
        count: { $sum: 1 },
        reactionType: { $first: '$reactionType' },
        users: { $push: '$user' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to count total reactions for a comment
commentReactionSchema.statics.countByComment = function(commentId) {
  return this.countDocuments({ comment: commentId });
};

// Static method to toggle reaction (add/update/remove)
commentReactionSchema.statics.toggleReaction = async function(commentId, userId, reactionType, emoji) {
  const existing = await this.findOne({ comment: commentId, user: userId });
  
  if (existing) {
    // If same reaction, remove it
    if (existing.emoji === emoji) {
      await this.deleteOne({ _id: existing._id });
      return { action: 'removed', reaction: null };
    }
    // If different reaction, update it
    existing.reactionType = reactionType;
    existing.emoji = emoji;
    await existing.save();
    return { action: 'updated', reaction: existing };
  }
  
  // Create new reaction
  const reaction = await this.create({
    comment: commentId,
    user: userId,
    reactionType,
    emoji
  });
  return { action: 'added', reaction };
};

module.exports = mongoose.model('CommentReaction', commentReactionSchema);
