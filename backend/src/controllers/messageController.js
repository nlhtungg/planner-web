const messageRepository = require('../repositories/messageRepository');
const minioService = require('../services/minioService');
const logger = require('../utils/logger').child({ module: 'controllers/messageController' });

class MessageController {
  /**
   * Get all conversations for current user
   */
  async getConversations(req, res) {
    try {
      const userId = req.user._id;
      logger.debug({ userId: userId.toString() }, 'Fetching conversations');
      const conversations = await messageRepository.getConversations(userId);

      logger.info({
        userId: userId.toString(),
        count: conversations.length,
      }, 'Fetched conversations');

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting conversations');
      res.status(500).json({
        success: false,
        message: error.message,
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
        parseInt(limit, 10),
        parseInt(skip, 10),
      );

      res.json({
        success: true,
        data: messages.reverse(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting messages');
      res.status(500).json({
        success: false,
        message: error.message,
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
          message: 'Receiver and content are required',
        });
      }

      let attachments = [];
      if (req.files && req.files.length > 0) {
        logger.info({
          senderId: senderId.toString(),
          fileCount: req.files.length,
        }, 'Processing message attachments');

        for (let i = 0; i < req.files.length; i += 1) {
          const file = req.files[i];
          try {
            logger.debug({
              senderId: senderId.toString(),
              index: i + 1,
              total: req.files.length,
              fileName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
            }, 'Uploading message attachment');

            const uploadResult = await minioService.uploadMessageMedia(
              senderId,
              file.buffer,
              file.originalname,
              file.mimetype,
            );

            logger.debug({
              senderId: senderId.toString(),
              fileName: file.originalname,
              url: uploadResult.url,
            }, 'Uploaded message attachment');

            attachments.push({
              url: uploadResult.url,
              filename: uploadResult.fileName,
              mimetype: uploadResult.mimeType,
              size: uploadResult.size,
            });
          } catch (error) {
            logger.error({
              err: error,
              senderId: senderId.toString(),
              fileName: file.originalname,
            }, 'Error uploading message attachment');
          }
        }

        logger.info({
          senderId: senderId.toString(),
          uploadedCount: attachments.length,
          requestedCount: req.files.length,
        }, 'Completed message attachment processing');
      }

      const message = await messageRepository.createMessage({
        sender: senderId,
        receiver: receiverId,
        content,
        attachments,
      });

      if (global.io) {
        global.io.to(`user-${receiverId}`).emit('new-message', message);
        global.io.to(`user-${senderId}`).emit('new-message', message);

        const receiverRoom = global.io.sockets.adapter.rooms.get(`user-${receiverId}`);
        const senderRoom = global.io.sockets.adapter.rooms.get(`user-${senderId}`);

        logger.info({
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
          receiverRoomSize: receiverRoom ? receiverRoom.size : 0,
          senderRoomSize: senderRoom ? senderRoom.size : 0,
        }, 'Emitted new-message socket event');
      } else {
        logger.warn({
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
        }, 'Socket.io not available while sending message');
      }

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error sending message');
      res.status(500).json({
        success: false,
        message: error.message,
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

      if (global.io && message) {
        global.io.to(`user-${message.sender._id}`).emit('message-read', {
          messageId: message._id,
          readAt: message.readAt,
          readBy: message.readBy,
        });
      }

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error marking message as read');
      res.status(400).json({
        success: false,
        message: error.message,
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
        currentUserId,
      );

      if (global.io) {
        global.io.to(`user-${otherUserId}`).emit('conversation-read', {
          userId: currentUserId,
        });
      }

      res.json({
        success: true,
        message: 'Conversation marked as read',
      });
    } catch (error) {
      logger.error({ err: error }, 'Error marking conversation as read');
      res.status(500).json({
        success: false,
        message: error.message,
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
        message: 'Message deleted',
      });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting message');
      res.status(400).json({
        success: false,
        message: error.message,
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
        data: { count },
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting unread count');
      res.status(500).json({
        success: false,
        message: error.message,
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
          message: 'Search query must be at least 2 characters',
        });
      }

      const users = await messageRepository.searchUsers(q, currentUserId);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error searching users');
      res.status(500).json({
        success: false,
        message: error.message,
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
          message: 'Emoji is required',
        });
      }

      const message = await messageRepository.addReaction(messageId, userId, emoji);
      const senderId = message.sender._id;
      const receiverId = message.receiver._id;

      if (global.io) {
        global.io.to(`user-${receiverId}`).emit('message-reaction', message);
        global.io.to(`user-${userId}`).emit('message-reaction', message);

        logger.info({
          messageId: message._id.toString(),
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
        }, 'Emitted message reaction update');
      }

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error adding reaction');
      res.status(500).json({
        success: false,
        message: error.message,
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

      if (global.io) {
        const receiverId = message.sender._id.toString() === userId.toString()
          ? message.receiver._id
          : message.sender._id;
        global.io.to(`user-${receiverId}`).emit('message-reaction', message);
        global.io.to(`user-${userId}`).emit('message-reaction', message);
      }

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error removing reaction');
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Pin/Unpin message
   */
  async togglePinMessage(req, res) {
    try {
      const { messageId } = req.params;
      const message = await messageRepository.togglePinMessage(messageId);
      const senderId = message.sender._id;
      const receiverId = message.receiver._id;

      const action = message.isPinned ? 'pinned' : 'unpinned';
      const notificationContent = `${req.user.firstName} ${req.user.lastName} ${action} a message`;

      logger.info({
        messageId: message._id.toString(),
        senderId: senderId.toString(),
        receiverId: receiverId.toString(),
        action,
      }, 'Creating pin notification');

      const systemNotification = await messageRepository.createSystemNotification({
        sender: senderId,
        receiver: receiverId,
        content: notificationContent,
        systemMessageType: message.isPinned ? 'message_pinned' : 'message_unpinned',
        relatedMessage: messageId,
      });

      if (global.io) {
        global.io.to(`user-${senderId}`).emit('message-pinned', message);
        global.io.to(`user-${receiverId}`).emit('message-pinned', message);
        global.io.to(`user-${senderId}`).emit('new-message', systemNotification);
        global.io.to(`user-${receiverId}`).emit('new-message', systemNotification);
      }

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error toggling pin');
      res.status(500).json({
        success: false,
        message: error.message,
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
        { nickname, themeColor },
      );

      if (global.io) {
        global.io.to(`user-${userId}`).emit('conversation-updated', conversation);
        global.io.to(`user-${otherUserId}`).emit('conversation-updated', conversation);
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error updating conversation settings');
      res.status(500).json({
        success: false,
        message: error.message,
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
          message: 'Search query must be at least 2 characters',
        });
      }

      const messages = await messageRepository.searchMessages(userId, otherUserId, q);

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error searching messages');
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new MessageController();
