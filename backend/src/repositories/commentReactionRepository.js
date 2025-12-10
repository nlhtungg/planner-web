const CommentReaction = require('../models/CommentReaction');

class CommentReactionRepository {
  // Toggle a reaction (add/update/remove)
  async toggleReaction(commentId, userId, reactionType, emoji) {
    try {
      return await CommentReaction.toggleReaction(commentId, userId, reactionType, emoji);
    } catch (error) {
      throw error;
    }
  }

  // Get user's reaction on a comment
  async getUserReaction(commentId, userId) {
    try {
      return await CommentReaction.getUserReaction(commentId, userId);
    } catch (error) {
      throw error;
    }
  }

  // Get reaction summary for a comment
  async getReactionSummary(commentId) {
    try {
      return await CommentReaction.getReactionSummary(commentId);
    } catch (error) {
      throw error;
    }
  }

  // Count total reactions for a comment
  async countReactionsByComment(commentId) {
    try {
      return await CommentReaction.countByComment(commentId);
    } catch (error) {
      throw error;
    }
  }

  // Get all reactions for a comment with user details
  async getReactionsByComment(commentId) {
    try {
      return await CommentReaction.find({ comment: commentId })
        .populate('user', 'firstName lastName email avatar')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  // Remove all reactions for a comment (when comment is deleted)
  async removeReactionsByComment(commentId) {
    try {
      return await CommentReaction.deleteMany({ comment: commentId });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CommentReactionRepository();
