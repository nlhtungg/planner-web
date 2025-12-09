const express = require('express');
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// All post routes require authentication
router.use(authenticateToken);

// Post CRUD routes within a workspace
router.post('/:workspaceId/posts', postController.createPost);
router.get('/:workspaceId/posts', postController.getWorkspacePosts);
router.put('/:workspaceId/posts/:postId', postController.updatePost);
router.delete('/:workspaceId/posts/:postId', postController.deletePost);

module.exports = router;
