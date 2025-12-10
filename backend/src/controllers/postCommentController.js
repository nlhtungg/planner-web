const postCommentRepository = require('../repositories/postCommentRepository');
const postRepository = require('../repositories/postRepository');
const workspaceRepository = require('../repositories/workspaceRepository');

class PostCommentController {
  // Create a comment on a post
  async createComment(req, res) {
    try {
      const { workspaceId, postId } = req.params;
      const { content } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate content
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }

      if (content.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Comment content cannot exceed 2000 characters'
        });
      }

      // Check if post exists
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

      // Check if user is a workspace member
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
          message: 'Only workspace members can comment on posts'
        });
      }

      // Create comment
      const commentData = {
        post: postId,
        author: userId,
        content: content.trim(),
        mentions: req.body.mentions || [],
        mentionsEveryone: req.body.mentionsEveryone || false
      };

      const comment = await postCommentRepository.createComment(commentData);

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: comment
      });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get all comments for a post
  async getPostComments(req, res) {
    try {
      const { workspaceId, postId } = req.params;
      const userId = req.user._id || req.user.id;

      // Check if post exists
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

      // Check if user is a workspace member
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
          message: 'Only workspace members can view comments'
        });
      }

      const comments = await postCommentRepository.getCommentsByPost(postId);

      res.status(200).json({
        success: true,
        message: 'Comments retrieved successfully',
        data: comments
      });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update a comment
  async updateComment(req, res) {
    try {
      const { workspaceId, postId, commentId } = req.params;
      const { content } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate content
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }

      if (content.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Comment content cannot exceed 2000 characters'
        });
      }

      // Get comment and check permissions
      const comment = await postCommentRepository.getCommentById(commentId);
      if (!comment || !comment.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Verify comment belongs to post
      if (comment.post.toString() !== postId) {
        return res.status(400).json({
          success: false,
          message: 'Comment does not belong to this post'
        });
      }

      // Only author can update
      if (!comment.canModify(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only the comment author can edit this comment'
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

      const updatedComment = await postCommentRepository.updateComment(commentId, updateData);

      res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        data: updatedComment
      });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Delete a comment
  async deleteComment(req, res) {
    try {
      const { workspaceId, postId, commentId } = req.params;
      const userId = req.user._id || req.user.id;

      // Get comment and check permissions
      const comment = await postCommentRepository.getCommentById(commentId);
      if (!comment || !comment.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Verify comment belongs to post
      if (comment.post.toString() !== postId) {
        return res.status(400).json({
          success: false,
          message: 'Comment does not belong to this post'
        });
      }

      // Get workspace to check if user is admin/owner
      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);
      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Author or workspace owner/admin can delete
      const canDelete = comment.canModify(userId) || workspace.canManage(userId);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete this comment'
        });
      }

      await postCommentRepository.deleteComment(commentId);

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PostCommentController();
