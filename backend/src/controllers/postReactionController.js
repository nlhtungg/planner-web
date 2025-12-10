const postReactionRepository = require('../repositories/postReactionRepository');
const postRepository = require('../repositories/postRepository');
const workspaceRepository = require('../repositories/workspaceRepository');

class PostReactionController {
  // Toggle reaction on a post
  async toggleReaction(req, res) {
    try {
      const { workspaceId, postId } = req.params;
      const { reactionType, emoji } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate input
      if (!reactionType || !emoji) {
        return res.status(400).json({
          success: false,
          message: 'Reaction type and emoji are required'
        });
      }

      // Validate reaction type
      const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'custom'];
      if (!validTypes.includes(reactionType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reaction type'
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
          message: 'Only workspace members can react to posts'
        });
      }

      // Toggle reaction
      const result = await postReactionRepository.toggleReaction(postId, userId, reactionType, emoji);

      res.status(200).json({
        success: true,
        message: `Reaction ${result.action}`,
        data: {
          action: result.action,
          reaction: result.reaction
        }
      });
    } catch (error) {
      console.error('Toggle post reaction error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get reaction summary for a post
  async getReactionSummary(req, res) {
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
          message: 'Only workspace members can view reactions'
        });
      }

      // Get reaction summary and user's reaction
      const [summary, userReaction] = await Promise.all([
        postReactionRepository.getReactionSummary(postId),
        postReactionRepository.getUserReaction(postId, userId)
      ]);

      res.status(200).json({
        success: true,
        message: 'Reaction summary retrieved successfully',
        data: {
          summary,
          userReaction
        }
      });
    } catch (error) {
      console.error('Get post reaction summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all reactions for a post with user details
  async getReactions(req, res) {
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
          message: 'Only workspace members can view reactions'
        });
      }

      const reactions = await postReactionRepository.getReactionsByPost(postId);

      res.status(200).json({
        success: true,
        message: 'Reactions retrieved successfully',
        data: reactions
      });
    } catch (error) {
      console.error('Get post reactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PostReactionController();
