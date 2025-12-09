const Post = require('../models/Post');

class PostRepository {
  // Create a new post
  async createPost(postData) {
    try {
      const post = new Post(postData);
      await post.save();
      return await post.populate('author', 'firstName lastName email avatar');
    } catch (error) {
      throw error;
    }
  }

  // Get post by ID
  async getPostById(postId) {
    try {
      const post = await Post.findById(postId)
        .populate('author', 'firstName lastName email avatar')
        .populate('workspace', 'name');
      return post;
    } catch (error) {
      throw error;
    }
  }

  // Get all posts in a workspace
  async getPostsByWorkspace(workspaceId) {
    try {
      const posts = await Post.findByWorkspace(workspaceId);
      return posts;
    } catch (error) {
      throw error;
    }
  }

  // Update post
  async updatePost(postId, updateData) {
    try {
      const post = await Post.findByIdAndUpdate(
        postId,
        { ...updateData },
        { new: true, runValidators: true }
      )
        .populate('author', 'firstName lastName email avatar')
        .populate('workspace', 'name');
      return post;
    } catch (error) {
      throw error;
    }
  }

  // Delete post (soft delete)
  async deletePost(postId) {
    try {
      const post = await Post.findByIdAndUpdate(
        postId,
        { isActive: false },
        { new: true }
      );
      return post;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PostRepository();
