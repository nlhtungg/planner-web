const PostComment = require('../models/PostComment');

class PostCommentRepository {
  // Create a new comment
  async createComment(commentData) {
    try {
      const comment = new PostComment(commentData);
      await comment.save();
      return await comment.populate('author', 'firstName lastName email avatar');
    } catch (error) {
      throw error;
    }
  }

  // Get comment by ID
  async getCommentById(commentId) {
    try {
      const comment = await PostComment.findById(commentId)
        .populate('author', 'firstName lastName email avatar');
      return comment;
    } catch (error) {
      throw error;
    }
  }

  // Get all comments for a post
  async getCommentsByPost(postId) {
    try {
      const comments = await PostComment.findByPost(postId);
      return comments;
    } catch (error) {
      throw error;
    }
  }

  // Count comments for a post
  async countCommentsByPost(postId) {
    try {
      const count = await PostComment.countByPost(postId);
      return count;
    } catch (error) {
      throw error;
    }
  }

  // Update comment
  async updateComment(commentId, updateData) {
    try {
      const comment = await PostComment.findByIdAndUpdate(
        commentId,
        { ...updateData },
        { new: true, runValidators: true }
      ).populate('author', 'firstName lastName email avatar');
      return comment;
    } catch (error) {
      throw error;
    }
  }

  // Delete comment (soft delete)
  async deleteComment(commentId) {
    try {
      const comment = await PostComment.findByIdAndUpdate(
        commentId,
        { isActive: false },
        { new: true }
      );
      return comment;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PostCommentRepository();
