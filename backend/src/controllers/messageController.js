const messageRepository = require('../repositories/messageRepository');

class MessageController {
  /**
   * Get all conversations for current user
   */
  async getConversations(req, res) {
    try {
      const userId = req.user._id;
      const conversations = await messageRepository.getConversations(userId);
      
      res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get messages with a specific user
   */
  async getMessages(req, res) {
    try {
      const userId = req.user._id;
      const { otherUserId } = req.params;
      const { limit = 50, skip = 0 } = req.query;
      
      const messages = await messageRepository.getMessages(
        userId,
        otherUserId,
        parseInt(limit),
        parseInt(skip)
      );
      
      res.json({
        success: true,
        data: messages.reverse() // Oldest first for display
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Send a message
   */
  async sendMessage(req, res) {
    try {
      const senderId = req.user._id;
      const { receiverId, content, attachments } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Receiver and content are required'
        });
      }

      const message = await messageRepository.createMessage({
        sender: senderId,
        receiver: receiverId,
        content,
        attachments
      });

      // Emit socket event to BOTH sender and receiver for real-time update
      if (global.io) {
        console.log(`📤 Emitting new-message to receiver: user-${receiverId}`);
        console.log(`📤 Emitting new-message to sender: user-${senderId}`);
        global.io.to(`user-${receiverId}`).emit('new-message', message);
        global.io.to(`user-${senderId}`).emit('new-message', message);
        
        // Log rooms for debugging
        const receiverRoom = global.io.sockets.adapter.rooms.get(`user-${receiverId}`);
        const senderRoom = global.io.sockets.adapter.rooms.get(`user-${senderId}`);
        console.log(`   Receiver room user-${receiverId} has ${receiverRoom ? receiverRoom.size : 0} clients`);
        console.log(`   Sender room user-${senderId} has ${senderRoom ? senderRoom.size : 0} clients`);
      } else {
        console.warn('⚠️ global.io not available');
      }

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user._id;
      const { messageId } = req.params;

      const message = await messageRepository.markAsRead(messageId, userId);

      // Emit socket event to sender
      if (global.io && message) {
        global.io.to(`user-${message.sender._id}`).emit('message-read', {
          messageId: message._id,
          readAt: message.readAt
        });
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(req, res) {
    try {
      const currentUserId = req.user._id;
      const { otherUserId } = req.params;

      await messageRepository.markConversationAsRead(
        currentUserId,
        otherUserId,
        currentUserId
      );

      // Emit socket event
      if (global.io) {
        global.io.to(`user-${otherUserId}`).emit('conversation-read', {
          userId: currentUserId
        });
      }

      res.json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(req, res) {
    try {
      const userId = req.user._id;
      const { messageId } = req.params;

      await messageRepository.deleteMessage(messageId, userId);

      res.json({
        success: true,
        message: 'Message deleted'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user._id;
      const count = await messageRepository.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Search users for chat
   */
  async searchUsers(req, res) {
    try {
      const currentUserId = req.user._id;
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const users = await messageRepository.searchUsers(q, currentUserId);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new MessageController();
