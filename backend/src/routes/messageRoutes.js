const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all conversations
router.get('/conversations', messageController.getConversations);

// Search users for chat
router.get('/users/search', messageController.searchUsers);

// Get unread message count
router.get('/unread-count', messageController.getUnreadCount);

// Get messages with a specific user
router.get('/:otherUserId', messageController.getMessages);

// Send a message
router.post('/send', messageController.sendMessage);

// Mark conversation as read
router.patch('/:otherUserId/read', messageController.markConversationAsRead);

// Mark single message as read
router.patch('/message/:messageId/read', messageController.markAsRead);

// Delete a message
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
