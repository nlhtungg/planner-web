const connectionRepository = require('../repositories/connectionRepository');

class ConnectionController {
  /**
   * Send friend request
   */
  async sendRequest(req, res) {
    try {
      const userId = req.user._id;
      const { recipientId } = req.body;

      if (!recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Recipient ID is required'
        });
      }

      if (userId.toString() === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot send friend request to yourself'
        });
      }

      const connection = await connectionRepository.sendRequest(userId, recipientId);

      // Emit socket event to recipient
      if (global.io) {
        global.io.to(`user-${recipientId}`).emit('friend-request-received', {
          request: connection,
          from: req.user
        });
        
        // Also emit to sender for real-time update
        global.io.to(`user-${userId}`).emit('friend-request-sent', {
          request: connection,
          recipientId: recipientId
        });
      }

      res.json({
        success: true,
        data: connection,
        message: 'Friend request sent'
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Accept friend request
   */
  async acceptRequest(req, res) {
    try {
      const userId = req.user._id;
      const { requestId } = req.params;

      const connection = await connectionRepository.acceptRequest(requestId, userId);

      // Emit socket events to both users
      if (global.io) {
        const requesterId = connection.requester._id || connection.requester;
        const recipientId = userId;
        
        // Notify the requester that their request was accepted
        global.io.to(`user-${requesterId}`).emit('friend-request-accepted', {
          acceptedBy: recipientId,
          friend: req.user, // The person who accepted
          requestId: requestId
        });
        
        // Notify the recipient (accepter) that they have a new friend
        global.io.to(`user-${recipientId}`).emit('friend-request-accepted', {
          acceptedBy: recipientId,
          friend: connection.requester, // The person who sent the request
          requestId: requestId
        });
      }

      res.json({
        success: true,
        data: connection,
        message: 'Friend request accepted'
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Reject friend request
   */
  async rejectRequest(req, res) {
    try {
      const userId = req.user._id;
      const { requestId } = req.params;

      const connection = await connectionRepository.rejectRequest(requestId, userId);

      // Emit socket event to both users
      if (global.io && connection) {
        const requesterId = connection.requester?._id || connection.requester;
        const recipientId = userId;
        
        // Notify the requester that their request was rejected
        global.io.to(`user-${requesterId}`).emit('friend-request-rejected', {
          requestId: requestId,
          rejectedBy: recipientId
        });
        
        // Notify the recipient (rejecter) for real-time update
        global.io.to(`user-${recipientId}`).emit('friend-request-rejected', {
          requestId: requestId,
          rejectedBy: recipientId
        });
      }

      res.json({
        success: true,
        message: 'Friend request rejected'
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Cancel sent request
   */
  async cancelRequest(req, res) {
    try {
      const userId = req.user._id;
      const { requestId } = req.params;

      const connection = await connectionRepository.cancelRequest(requestId, userId);

      // Emit socket event to both users
      if (global.io && connection) {
        const requesterId = userId;
        const recipientId = connection.recipient?._id || connection.recipient;
        
        // Notify the recipient that the request was cancelled
        global.io.to(`user-${recipientId}`).emit('friend-request-cancelled', {
          requestId: requestId,
          cancelledBy: requesterId
        });
        
        // Notify the sender for real-time update
        global.io.to(`user-${requesterId}`).emit('friend-request-cancelled', {
          requestId: requestId,
          cancelledBy: requesterId
        });
      }

      res.json({
        success: true,
        message: 'Friend request cancelled'
      });
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Unfriend
   */
  async unfriend(req, res) {
    try {
      const userId = req.user._id;
      const { friendId } = req.params;

      await connectionRepository.unfriend(userId, friendId);

      // Emit socket event to both users
      if (global.io) {
        // Notify the friend that they were removed
        global.io.to(`user-${friendId}`).emit('friend-removed', {
          removedUser: { _id: userId },
          userId: userId
        });
        
        // Notify the user who initiated the unfriend
        global.io.to(`user-${userId}`).emit('friend-removed', {
          removedUser: { _id: friendId },
          userId: friendId
        });
      }

      res.json({
        success: true,
        message: 'Friend removed'
      });
    } catch (error) {
      console.error('Error unfriending:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Block user
   */
  async blockUser(req, res) {
    try {
      const userId = req.user._id;
      const { targetUserId } = req.params;

      const connection = await connectionRepository.blockUser(userId, targetUserId);

      // Emit socket event to the user who blocked
      if (global.io) {
        global.io.to(`user-${userId}`).emit('user-blocked', {
          blockedUser: { _id: targetUserId },
          userId: targetUserId
        });
        
        // Notify the blocked user that they were blocked
        global.io.to(`user-${targetUserId}`).emit('user-blocked-by', {
          blockedBy: { _id: userId },
          userId: userId
        });
      }

      res.json({
        success: true,
        data: connection,
        message: 'User blocked'
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Unblock user
   */
  async unblockUser(req, res) {
    try {
      const userId = req.user._id;
      const { targetUserId } = req.params;

      await connectionRepository.unblockUser(userId, targetUserId);

      // Emit socket event to the user who unblocked
      if (global.io) {
        global.io.to(`user-${userId}`).emit('user-unblocked', {
          unblockedUser: { _id: targetUserId },
          userId: targetUserId
        });
        
        // Notify the unblocked user
        global.io.to(`user-${targetUserId}`).emit('user-unblocked-by', {
          unblockedBy: { _id: userId },
          userId: userId
        });
      }

      res.json({
        success: true,
        message: 'User unblocked'
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get friends list
   */
  async getFriends(req, res) {
    try {
      const userId = req.user._id;
      const friends = await connectionRepository.getFriends(userId);

      res.json({
        success: true,
        data: friends
      });
    } catch (error) {
      console.error('Error getting friends:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get pending requests (received)
   */
  async getPendingRequests(req, res) {
    try {
      const userId = req.user._id;
      const requests = await connectionRepository.getPendingRequests(userId);

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error getting pending requests:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get sent requests
   */
  async getSentRequests(req, res) {
    try {
      const userId = req.user._id;
      const requests = await connectionRepository.getSentRequests(userId);

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error getting sent requests:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(req, res) {
    try {
      const userId = req.user._id;
      const blocked = await connectionRepository.getBlockedUsers(userId);

      res.json({
        success: true,
        data: blocked
      });
    } catch (error) {
      console.error('Error getting blocked users:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get friend suggestions
   */
  async getSuggestions(req, res) {
    try {
      const userId = req.user._id;
      const suggestions = await connectionRepository.getSuggestions(userId);

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get connection status with a user
   */
  async getConnectionStatus(req, res) {
    try {
      const userId = req.user._id;
      const { targetUserId } = req.params;

      const status = await connectionRepository.getConnectionStatus(userId, targetUserId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting connection status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ConnectionController();
