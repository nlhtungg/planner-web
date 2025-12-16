const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

class MessageRepository {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId) {
    return await Conversation.find({
      participants: userId
    })
      .populate('participants', 'firstName lastName email avatar')
      .sort({ lastMessageAt: -1 });
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
          [userId2]: 0
        }
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
      deletedBy: { $ne: userId1 } // Exclude messages deleted by current user
    })
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const systemCount = messages.filter(m => m.isSystemMessage).length;
    console.log(`📬 Fetched ${messages.length} messages (${systemCount} system messages) for conversation ${conversationId}`);
    
    return messages;
  }

  /**
   * Create a new message
   */
  async createMessage(messageData) {
    const { sender, receiver, content, attachments } = messageData;
    const conversationId = Message.generateConversationId(sender, receiver);
    
    console.log('💾 Creating message:', { sender, receiver, conversationId });
    
    const message = await Message.create({
      sender,
      receiver,
      content,
      attachments: attachments || [],
      conversationId
    });

    console.log('✅ Message created:', message._id);

    // Check if conversation exists
    let conversation = await Conversation.findOne({ conversationId });
    
    console.log('🔍 Conversation exists?', !!conversation);
    
    if (!conversation) {
      // Create new conversation
      console.log('📝 Creating new conversation...');
      try {
        conversation = await Conversation.create({
          conversationId,
          participants: [sender, receiver],
          lastMessage: content.substring(0, 100),
          lastMessageAt: new Date(),
          unreadCount: {
            [sender]: 0,
            [receiver]: 1
          }
        });
        console.log('✅ Conversation created:', conversation._id);
      } catch (error) {
        console.error('❌ Error creating conversation:', error);
        throw error;
      }
    } else {
      // Update existing conversation
      console.log('🔄 Updating existing conversation...');
      try {
        // Ensure participants exist (for old conversations)
        if (!conversation.participants || conversation.participants.length === 0) {
          console.log('⚠️ Participants missing, adding them...');
          conversation.participants = [sender, receiver];
        }
        
        conversation.lastMessage = content.substring(0, 100);
        conversation.lastMessageAt = new Date();
        
        // Increment unread count for receiver
        const currentUnread = conversation.unreadCount.get(receiver.toString()) || 0;
        conversation.unreadCount.set(receiver.toString(), currentUnread + 1);
        
        conversation.markModified('unreadCount'); // Important for Map type
        conversation.markModified('participants'); // Important for array type
        await conversation.save();
        console.log('✅ Conversation updated, participants:', conversation.participants.length, 'unreadCount:', conversation.unreadCount);
      } catch (error) {
        console.error('❌ Error updating conversation:', error);
        throw error;
      }
    }

    return await Message.findById(message._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar');
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, userId) {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    // Only receiver can mark as read
    if (message.receiver.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }
    
    message.readAt = new Date();
    await message.save();
    
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
        readAt: null
      },
      {
        readAt: new Date()
      }
    );

    // Reset unread count in conversation
    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        [`unreadCount.${currentUserId}`]: 0
      }
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
    
    // Check if user is sender or receiver
    if (
      message.sender.toString() !== userId.toString() &&
      message.receiver.toString() !== userId.toString()
    ) {
      throw new Error('Unauthorized');
    }
    
    // Add user to deletedBy array
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
      participants: userId
    });

    let total = 0;
    conversations.forEach(conv => {
      const count = conv.unreadCount.get(userId.toString()) || 0;
      total += count;
    });

    return total;
  }

  /**
   * Search users for chat (by name or email)
   */
  async searchUsers(query, currentUserId, limit = 10) {
    const User = require('../models/User');
    
    return await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
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

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== userId.toString()
    );

    // Add new reaction
    message.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date()
    });

    await message.save();

    return await Message.findById(messageId)
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
      r => r.user.toString() !== userId.toString()
    );

    await message.save();

    return await Message.findById(messageId)
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

    return await Message.findById(messageId)
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

    // Update nickname for userId2 as seen by userId1
    if (settings.nickname !== undefined) {
      conversation.nicknames.set(userId2.toString(), settings.nickname);
      conversation.markModified('nicknames');
    }

    // Update theme color
    if (settings.themeColor) {
      conversation.themeColor = settings.themeColor;
    }

    await conversation.save();

    return await Conversation.findById(conversation._id)
      .populate('participants', 'firstName lastName email avatar');
  }

  /**
   * Search messages in conversation
   */
  async searchMessages(userId1, userId2, query) {
    const conversationId = Message.generateConversationId(userId1, userId2);
    
    return await Message.find({
      conversationId,
      deletedBy: { $ne: userId1 },
      content: { $regex: query, $options: 'i' }
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
    const { sender, receiver, content, systemMessageType, relatedMessage } = notificationData;
    const conversationId = Message.generateConversationId(sender, receiver);
    
    console.log('📢 Creating system notification:', { content, systemMessageType, conversationId });
    
    const message = await Message.create({
      sender,
      receiver,
      content,
      conversationId,
      isSystemMessage: true,
      systemMessageType,
      relatedMessage,
      readAt: new Date() // System messages are auto-read
    });

    // Update conversation
    const conversation = await Conversation.findOne({ conversationId });
    if (conversation) {
      conversation.lastMessage = content.substring(0, 100);
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar');
    
    console.log('✅ System notification created and populated:', populatedMessage._id, populatedMessage.isSystemMessage);
    
    return populatedMessage;
  }
}

module.exports = new MessageRepository();
