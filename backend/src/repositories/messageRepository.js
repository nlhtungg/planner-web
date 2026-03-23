const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger').child({ module: 'repositories/messageRepository' });

class MessageRepository {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId) {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'firstName lastName email avatar')
      .populate('lastMessageSender', 'firstName lastName email avatar')
      .sort({ lastMessageAt: -1 });

    return conversations.map((conv) => {
      const plainConv = conv.toObject();
      return {
        ...plainConv,
        unreadCount: plainConv.unreadCount ? Object.fromEntries(plainConv.unreadCount) : {},
        nicknames: plainConv.nicknames ? Object.fromEntries(plainConv.nicknames) : {},
      };
    });
  }

  /**
   * Get or create conversation between two users
   */
  async getOrCreateConversation(userId1, userId2) {
    const conversationId = Message.generateConversationId(userId1, userId2);

    let conversation = await Conversation.findOne({ conversationId })
      .populate('participants', 'firstName lastName email avatar');

    if (!conversation) {
      conversation = await Conversation.create({
        conversationId,
        participants: [userId1, userId2],
        lastMessage: '',
        lastMessageAt: new Date(),
        unreadCount: {
          [userId1]: 0,
          [userId2]: 0,
        },
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'firstName lastName email avatar');
    }

    return conversation;
  }

  /**
   * Get messages between two users
   */
  async getMessages(userId1, userId2, limit = 50, skip = 0) {
    const conversationId = Message.generateConversationId(userId1, userId2);

    const messages = await Message.find({
      conversationId,
      deletedBy: { $ne: userId1 },
    })
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const systemCount = messages.filter((message) => message.isSystemMessage).length;
    logger.debug({
      conversationId,
      messageCount: messages.length,
      systemCount,
    }, 'Fetched conversation messages');

    return messages;
  }

  /**
   * Create a new message
   */
  async createMessage(messageData) {
    const { sender, receiver, content, attachments } = messageData;
    const conversationId = Message.generateConversationId(sender, receiver);

    logger.info({
      sender: sender.toString(),
      receiver: receiver.toString(),
      conversationId,
      attachmentCount: attachments?.length || 0,
    }, 'Creating message');

    const message = await Message.create({
      sender,
      receiver,
      content,
      attachments: attachments || [],
      conversationId,
    });

    let conversation = await Conversation.findOne({ conversationId });

    if (!conversation) {
      logger.info({ conversationId }, 'Creating new conversation');
      try {
        conversation = await Conversation.create({
          conversationId,
          participants: [sender, receiver],
          lastMessage: content.substring(0, 100),
          lastMessageSender: sender,
          lastMessageAt: new Date(),
          unreadCount: {
            [sender]: 0,
            [receiver]: 1,
          },
        });
      } catch (error) {
        logger.error({ err: error, conversationId }, 'Error creating conversation');
        throw error;
      }
    } else {
      logger.debug({ conversationId }, 'Updating existing conversation');
      try {
        if (!conversation.participants || conversation.participants.length === 0) {
          logger.warn({ conversationId }, 'Conversation participants missing, restoring participants');
          conversation.participants = [sender, receiver];
        }

        conversation.lastMessage = content.substring(0, 100);
        conversation.lastMessageSender = sender;
        conversation.lastMessageAt = new Date();

        const currentUnread = conversation.unreadCount.get(receiver.toString()) || 0;
        conversation.unreadCount.set(receiver.toString(), currentUnread + 1);

        conversation.markModified('unreadCount');
        conversation.markModified('participants');
        await conversation.save();
      } catch (error) {
        logger.error({ err: error, conversationId }, 'Error updating conversation');
        throw error;
      }
    }

    return Message.findById(message._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar');
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, userId) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.receiver.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    const alreadyRead = message.readBy.some(
      (readBy) => readBy.user.toString() === userId.toString(),
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date(),
      });
    }

    message.readAt = new Date();
    await message.save();
    await message.populate('readBy.user', 'firstName lastName avatar');

    return message;
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(userId1, userId2, currentUserId) {
    const conversationId = Message.generateConversationId(userId1, userId2);

    await Message.updateMany(
      {
        conversationId,
        receiver: currentUserId,
        readAt: null,
      },
      {
        readAt: new Date(),
      },
    );

    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        [`unreadCount.${currentUserId}`]: 0,
      },
    );
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (
      message.sender.toString() !== userId.toString()
      && message.receiver.toString() !== userId.toString()
    ) {
      throw new Error('Unauthorized');
    }

    if (!message.deletedBy.includes(userId)) {
      message.deletedBy.push(userId);
      await message.save();
    }

    return message;
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId) {
    const conversations = await Conversation.find({
      participants: userId,
    });

    let total = 0;
    conversations.forEach((conversation) => {
      const count = conversation.unreadCount.get(userId.toString()) || 0;
      total += count;
    });

    return total;
  }

  /**
   * Search users for chat (by name or email)
   */
  async searchUsers(query, currentUserId, limit = 10) {
    const User = require('../models/User');

    return User.find({
      _id: { $ne: currentUserId },
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('firstName lastName email avatar')
      .limit(limit);
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    message.reactions = message.reactions.filter(
      (reaction) => reaction.user.toString() !== userId.toString(),
    );

    message.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date(),
    });

    await message.save();

    return Message.findById(messageId)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .populate('reactions.user', 'firstName lastName avatar');
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId, userId) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    message.reactions = message.reactions.filter(
      (reaction) => reaction.user.toString() !== userId.toString(),
    );

    await message.save();

    return Message.findById(messageId)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .populate('reactions.user', 'firstName lastName avatar');
  }

  /**
   * Toggle pin message
   */
  async togglePinMessage(messageId) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    message.isPinned = !message.isPinned;
    await message.save();

    return Message.findById(messageId)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar');
  }

  /**
   * Update conversation settings
   */
  async updateConversationSettings(userId1, userId2, settings) {
    const conversationId = Message.generateConversationId(userId1, userId2);
    const conversation = await Conversation.findOne({ conversationId });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (settings.nickname !== undefined) {
      conversation.nicknames.set(userId2.toString(), settings.nickname);
      conversation.markModified('nicknames');
    }

    if (settings.themeColor) {
      conversation.themeColor = settings.themeColor;
    }

    await conversation.save();

    return Conversation.findById(conversation._id)
      .populate('participants', 'firstName lastName email avatar');
  }

  /**
   * Search messages in conversation
   */
  async searchMessages(userId1, userId2, query) {
    const conversationId = Message.generateConversationId(userId1, userId2);

    return Message.find({
      conversationId,
      deletedBy: { $ne: userId1 },
      content: { $regex: query, $options: 'i' },
    })
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(50);
  }

  /**
   * Create a system notification message
   */
  async createSystemNotification(notificationData) {
    const {
      sender,
      receiver,
      content,
      systemMessageType,
      relatedMessage,
    } = notificationData;
    const conversationId = Message.generateConversationId(sender, receiver);

    logger.info({
      conversationId,
      systemMessageType,
      relatedMessage,
    }, 'Creating system notification');

    const message = await Message.create({
      sender,
      receiver,
      content,
      conversationId,
      isSystemMessage: true,
      systemMessageType,
      relatedMessage,
      readAt: new Date(),
    });

    const conversation = await Conversation.findOne({ conversationId });
    if (conversation) {
      conversation.lastMessage = content.substring(0, 100);
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar');

    logger.info({
      messageId: populatedMessage._id.toString(),
      isSystemMessage: populatedMessage.isSystemMessage,
    }, 'Created system notification');

    return populatedMessage;
  }
}

module.exports = new MessageRepository();
