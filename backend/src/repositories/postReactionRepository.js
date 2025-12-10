const PostReaction = require('../models/PostReaction');

class PostReactionRepository {
  // Toggle a reaction (add/update/remove)
  async toggleReaction(postId, userId, reactionType, emoji) {
    try {
      return await PostReaction.toggleReaction(postId, userId, reactionType, emoji);
    } catch (error) {
      throw error;
    }
  }

  // Get user's reaction on a post
  async getUserReaction(postId, userId) {
    try {
      return await PostReaction.getUserReaction(postId, userId);
    } catch (error) {
      throw error;
    }
  }

  // Get reaction summary for a post
  async getReactionSummary(postId) {
    try {
      return await PostReaction.getReactionSummary(postId);
    } catch (error) {
      throw error;
    }
  }

  // Count total reactions for a post
  async countReactionsByPost(postId) {
    try {
      return await PostReaction.countByPost(postId);
    } catch (error) {
      throw error;
    }
  }

  // Get all reactions for a post with user details
  async getReactionsByPost(postId) {
    try {
      return await PostReaction.find({ post: postId })
        .populate('user', 'firstName lastName email avatar')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  // Remove all reactions for a post (when post is deleted)
  async removeReactionsByPost(postId) {
    try {
      return await PostReaction.deleteMany({ post: postId });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PostReactionRepository();
