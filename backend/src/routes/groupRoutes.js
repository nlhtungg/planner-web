const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middlewares/auth');
const messageUpload = require('../middlewares/messageUpload');

// Group routes
router.post('/', authenticateToken, groupController.createGroup);
router.get('/', authenticateToken, groupController.getUserGroups);
router.get('/:groupId', authenticateToken, groupController.getGroup);
router.get('/:groupId/messages', authenticateToken, groupController.getGroupMessages);
router.get('/:groupId/messages/search', authenticateToken, groupController.searchGroupMessages);
router.post('/:groupId/messages', authenticateToken, messageUpload.array('files', 5), groupController.sendGroupMessage);
router.post('/:groupId/members', authenticateToken, groupController.addMember);
router.delete('/:groupId/members', authenticateToken, groupController.removeMember);
router.patch('/messages/:messageId/pin', authenticateToken, groupController.togglePinMessage);
router.post('/messages/:messageId/reaction', authenticateToken, groupController.addReaction);
router.delete('/messages/:messageId/reaction', authenticateToken, groupController.removeReaction);
router.patch('/messages/:messageId/read', authenticateToken, groupController.markAsRead);
router.patch('/:groupId/read', authenticateToken, groupController.markGroupMessagesAsRead);

module.exports = router;
