const mongoose = require('mongoose');

const postReactionSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post is required']
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
postReactionSchema.index({ post: 1, user: 1 }, { unique: true }); // One reaction per user per post
postReactionSchema.index({ post: 1, reactionType: 1 });
postReactionSchema.index({ user: 1 });

// Static method to get user's reaction on a post
postReactionSchema.statics.getUserReaction = function(postId, userId) {
  return this.findOne({ post: postId, user: userId });
};

// Static method to get reaction summary for a post
postReactionSchema.statics.getReactionSummary = function(postId) {
  return this.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(postId) } },
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

// Static method to count total reactions for a post
postReactionSchema.statics.countByPost = function(postId) {
  return this.countDocuments({ post: postId });
};

// Static method to toggle reaction (add/update/remove)
postReactionSchema.statics.toggleReaction = async function(postId, userId, reactionType, emoji) {
  const existing = await this.findOne({ post: postId, user: userId });
  
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
    post: postId,
    user: userId,
    reactionType,
    emoji
  });
  return { action: 'added', reaction };
};

module.exports = mongoose.model('PostReaction', postReactionSchema);
