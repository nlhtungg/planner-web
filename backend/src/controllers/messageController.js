const messageRepository = require('../repositories/messageRepository');
const minioService = require('../services/minioService');

class MessageController {
  /**
   * Get all conversations for current user
   */
  async getConversations(req, res) {
    try {
      const userId = req.user._id;
      console.log('📋 Getting conversations for user:', userId);
      const conversations = await messageRepository.getConversations(userId);
      console.log('📋 Found conversations:', conversations.length);
      
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
      const { receiverId, content } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Receiver and content are required'
        });
      }

      // Handle file attachments if any
      let attachments = [];
      if (req.files && req.files.length > 0) {
        console.log(`📎 Processing ${req.files.length} file(s) for user ${senderId}`);
        
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          try {
            console.log(`  [${i+1}/${req.files.length}] Uploading: ${file.originalname} (${(file.size/1024).toFixed(2)}KB, ${file.mimetype})`);
            
            const uploadResult = await minioService.uploadMessageMedia(
              senderId,
              file.buffer,
              file.originalname,
              file.mimetype
            );
            
            console.log(`  ✅ Uploaded successfully to: ${uploadResult.url}`);
            
            attachments.push({
              url: uploadResult.url,
              filename: uploadResult.fileName,
              mimetype: uploadResult.mimeType,
              size: uploadResult.size
            });
          } catch (error) {
            console.error(`  ❌ Error uploading file ${file.originalname}:`, error.message);
            // Continue with other files
          }
        }
        
        console.log(`📦 Total attachments uploaded: ${attachments.length}/${req.files.length}`);
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

      // Emit socket event to sender with readBy data
      if (global.io && message) {
        global.io.to(`user-${message.sender._id}`).emit('message-read', {
          messageId: message._id,
          readAt: message.readAt,
          readBy: message.readBy
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

  /**
   * Add reaction to message
   */
  async addReaction(req, res) {
    try {
      const userId = req.user._id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({
          success: false,
          message: 'Emoji is required'
        });
      }

      const message = await messageRepository.addReaction(messageId, userId, emoji);

      // Get both users in the conversation
      const senderId = message.sender._id;
      const receiverId = message.receiver._id;

      // Emit socket events - only emit reaction update, no system notification for reactions
      if (global.io) {
        console.log('📤 Emitting reaction update to both users');
        global.io.to(`user-${receiverId}`).emit('message-reaction', message);
        global.io.to(`user-${userId}`).emit('message-reaction', message);
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(req, res) {
    try {
      const userId = req.user._id;
      const { messageId } = req.params;

      const message = await messageRepository.removeReaction(messageId, userId);

      // Emit socket event
      if (global.io) {
        const receiverId = message.sender._id.toString() === userId.toString() 
          ? message.receiver._id 
          : message.sender._id;
        global.io.to(`user-${receiverId}`).emit('message-reaction', message);
        global.io.to(`user-${userId}`).emit('message-reaction', message);
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Pin/Unpin message
   */
  async togglePinMessage(req, res) {
    try {
      const userId = req.user._id;
      const { messageId } = req.params;

      const message = await messageRepository.togglePinMessage(messageId);

      // Get both users in the conversation
      const senderId = message.sender._id;
      const receiverId = message.receiver._id;

      // Create system notification - Use same sender/receiver pattern as original message for consistency
      const action = message.isPinned ? 'pinned' : 'unpinned';
      const notificationContent = `${req.user.firstName} ${req.user.lastName} ${action} a message`;
      console.log('📢 Creating pin notification:', notificationContent);
      console.log('   For conversation between:', senderId.toString(), 'and', receiverId.toString());
      const systemNotification = await messageRepository.createSystemNotification({
        sender: senderId,  // Use original message sender
        receiver: receiverId,  // Use original message receiver
        content: notificationContent,
        systemMessageType: message.isPinned ? 'message_pinned' : 'message_unpinned',
        relatedMessage: messageId
      });
      console.log('✅ System notification created:', systemNotification._id, 'isSystemMessage:', systemNotification.isSystemMessage);

      // Emit socket events
      if (global.io) {
        global.io.to(`user-${senderId}`).emit('message-pinned', message);
        global.io.to(`user-${receiverId}`).emit('message-pinned', message);
        
        // Emit the system notification message
        console.log('📤 Emitting pin notification to:', `user-${senderId}`, `user-${receiverId}`);
        global.io.to(`user-${senderId}`).emit('new-message', systemNotification);
        global.io.to(`user-${receiverId}`).emit('new-message', systemNotification);
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update conversation settings (nickname, theme color)
   */
  async updateConversationSettings(req, res) {
    try {
      const userId = req.user._id;
      const { otherUserId } = req.params;
      const { nickname, themeColor } = req.body;

      const conversation = await messageRepository.updateConversationSettings(
        userId,
        otherUserId,
        { nickname, themeColor }
      );

      // Emit socket event
      if (global.io) {
        global.io.to(`user-${userId}`).emit('conversation-updated', conversation);
        global.io.to(`user-${otherUserId}`).emit('conversation-updated', conversation);
      }

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Error updating conversation settings:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Search messages in conversation
   */
  async searchMessages(req, res) {
    try {
      const userId = req.user._id;
      const { otherUserId } = req.params;
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const messages = await messageRepository.searchMessages(userId, otherUserId, q);

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new MessageController();
