const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// Friend Requests
router.post('/send', connectionController.sendRequest);
router.post('/accept/:requestId', connectionController.acceptRequest);
router.post('/reject/:requestId', connectionController.rejectRequest);
router.delete('/cancel/:requestId', connectionController.cancelRequest);

// Friends Management
router.get('/friends', connectionController.getFriends);
router.delete('/unfriend/:friendId', connectionController.unfriend);

// Block/Unblock
router.post('/block/:targetUserId', connectionController.blockUser);
router.delete('/unblock/:targetUserId', connectionController.unblockUser);

// Lists
router.get('/requests', connectionController.getPendingRequests);
router.get('/sent', connectionController.getSentRequests);
router.get('/blocked', connectionController.getBlockedUsers);
router.get('/suggestions', connectionController.getSuggestions);

// Status
router.get('/status/:targetUserId', connectionController.getConnectionStatus);

module.exports = router;
