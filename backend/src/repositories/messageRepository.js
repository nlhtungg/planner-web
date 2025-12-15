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
    
    return await Message.find({
      conversationId,
      deletedBy: { $ne: userId1 } // Exclude messages deleted by current user
    })
      .populate('sender', 'firstName lastName email avatar')
      .populate('receiver', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Create a new message
   */
  async createMessage(messageData) {
    const { sender, receiver, content, attachments } = messageData;
    const conversationId = Message.generateConversationId(sender, receiver);
    
    const message = await Message.create({
      sender,
      receiver,
      content,
      attachments: attachments || [],
      conversationId
    });

    // Update conversation
    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        lastMessage: content.substring(0, 100),
        lastMessageAt: new Date(),
        $inc: { [`unreadCount.${receiver}`]: 1 }
      },
      { upsert: true }
    );

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
}

module.exports = new MessageRepository();
