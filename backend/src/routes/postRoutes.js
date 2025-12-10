const express = require('express');
const postController = require('../controllers/postController');
const postCommentController = require('../controllers/postCommentController');
const postReactionController = require('../controllers/postReactionController');
const commentReactionController = require('../controllers/commentReactionController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// All post routes require authentication
router.use(authenticateToken);

// Post CRUD routes within a workspace
router.post('/:workspaceId/posts', postController.createPost);
router.get('/:workspaceId/posts', postController.getWorkspacePosts);
router.put('/:workspaceId/posts/:postId', postController.updatePost);
router.delete('/:workspaceId/posts/:postId', postController.deletePost);

// Post comment routes
router.post('/:workspaceId/posts/:postId/comments', postCommentController.createComment);
router.get('/:workspaceId/posts/:postId/comments', postCommentController.getPostComments);
router.put('/:workspaceId/posts/:postId/comments/:commentId', postCommentController.updateComment);
router.delete('/:workspaceId/posts/:postId/comments/:commentId', postCommentController.deleteComment);

// Post reaction routes
router.post('/:workspaceId/posts/:postId/reactions', postReactionController.toggleReaction);
router.get('/:workspaceId/posts/:postId/reactions/summary', postReactionController.getReactionSummary);
router.get('/:workspaceId/posts/:postId/reactions', postReactionController.getReactions);

// Comment reaction routes
router.post('/:workspaceId/posts/:postId/comments/:commentId/reactions', commentReactionController.toggleReaction);
router.get('/:workspaceId/posts/:postId/comments/:commentId/reactions/summary', commentReactionController.getReactionSummary);
router.get('/:workspaceId/posts/:postId/comments/:commentId/reactions', commentReactionController.getReactions);

module.exports = router;
