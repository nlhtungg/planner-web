const express = require('express');
const workspaceController = require('../controllers/workspaceController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// All workspace routes require authentication
router.use(authenticateToken);

// Workspace CRUD routes
router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getMyWorkspaces);
router.get('/:workspaceId', workspaceController.getWorkspace);
router.put('/:workspaceId', workspaceController.updateWorkspace);
router.delete('/:workspaceId', workspaceController.deleteWorkspace);

// Member management routes
router.post('/:workspaceId/members', workspaceController.addMember);
router.delete('/:workspaceId/members/:memberId', workspaceController.removeMember);
router.put('/:workspaceId/members/:memberId/role', workspaceController.updateMemberRole);

// Statistics route
router.get('/:workspaceId/stats', workspaceController.getWorkspaceStats);

module.exports = router;