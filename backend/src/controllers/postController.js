const postRepository = require('../repositories/postRepository');
const workspaceRepository = require('../repositories/workspaceRepository');
const { extractMentions } = require('../utils/mentionUtils');

class PostController {
  // Create a new post
  async createPost(req, res) {
    try {
      const { workspaceId } = req.params;
      const { content, mentions, mentionsEveryone } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate content
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Post content is required'
        });
      }

      if (content.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Post content cannot exceed 5000 characters'
        });
      }

      // Check if workspace exists and user is a member
      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);
      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      if (!workspace.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only workspace members can create posts'
        });
      }

      // Create post with mentions
      const postData = {
        workspace: workspaceId,
        author: userId,
        content: content.trim(),
        mentions: mentions || [],
        mentionsEveryone: mentionsEveryone || false
      };

      const post = await postRepository.createPost(postData);

      // Emit socket event for real-time updates
      if (global.io) {
        console.log(`📡 Emitting new-post event to workspace-${workspaceId}`, post._id);
        global.io.to(`workspace-${workspaceId}`).emit('new-post', post);
      } else {
        console.warn('⚠️ Socket.io not available, cannot emit new-post event');
      }

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get all posts in a workspace
  async getWorkspacePosts(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user._id || req.user.id;

      // Check if workspace exists and user is a member
      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);
      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      if (!workspace.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only workspace members can view posts'
        });
      }

      const posts = await postRepository.getPostsByWorkspace(workspaceId);

      res.status(200).json({
        success: true,
        message: 'Posts retrieved successfully',
        data: posts
      });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update a post
  async updatePost(req, res) {
    try {
      const { workspaceId, postId } = req.params;
      const { content } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate content
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Post content is required'
        });
      }

      if (content.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Post content cannot exceed 5000 characters'
        });
      }

      // Get post and check permissions
      const post = await postRepository.getPostById(postId);
      if (!post || !post.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Verify post belongs to workspace
      if (post.workspace._id.toString() !== workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Post does not belong to this workspace'
        });
      }

      // Only author can update
      if (!post.canModify(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only the post author can edit this post'
        });
      }

      // Update with mentions if provided
      const updateData = {
        content: content.trim()
      };
      
      if (req.body.mentions !== undefined) {
        updateData.mentions = req.body.mentions;
      }
      
      if (req.body.mentionsEveryone !== undefined) {
        updateData.mentionsEveryone = req.body.mentionsEveryone;
      }

      const updatedPost = await postRepository.updatePost(postId, updateData);

      // Emit socket event for real-time updates
      if (global.io) {
        global.io.to(`workspace-${workspaceId}`).emit('update-post', updatedPost);
      }

      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: updatedPost
      });
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Delete a post
  async deletePost(req, res) {
    try {
      const { workspaceId, postId } = req.params;
      const userId = req.user._id || req.user.id;

      // Get post and check permissions
      const post = await postRepository.getPostById(postId);
      if (!post || !post.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Verify post belongs to workspace
      if (post.workspace._id.toString() !== workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Post does not belong to this workspace'
        });
      }

      // Check if workspace exists and get user role
      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);
      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Author or workspace owner/admin can delete
      const canDelete = post.canModify(userId) || workspace.canManage(userId);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete this post'
        });
      }

      await postRepository.deletePost(postId);

      // Emit socket event for real-time updates
      if (global.io) {
        global.io.to(`workspace-${workspaceId}`).emit('delete-post', postId);
      }

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PostController();
