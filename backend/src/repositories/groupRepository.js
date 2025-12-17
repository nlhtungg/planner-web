const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

class GroupRepository {
  /**
   * Create a new group
   */
  async createGroup(groupData) {
    const group = new Group(groupData);
    await group.save();
    return await Group.findById(group._id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(userId) {
    const groups = await Group.find({
      'members.user': userId
    })
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('members.user', 'firstName lastName email avatar')
    .populate('lastMessageSender', 'firstName lastName email avatar')
    .sort({ lastMessageAt: -1 });

    // Convert Map to plain object for unreadCount
    return groups.map(group => {
      const plainGroup = group.toObject();
      return {
        ...plainGroup,
        unreadCount: plainGroup.unreadCount ? Object.fromEntries(plainGroup.unreadCount) : {}
      };
    });
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId) {
    return await Group.findById(groupId)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');
  }

  /**
   * Add member to group
   */
  async addMember(groupId, userId, role = 'member') {
    const group = await Group.findById(groupId);
    
    // Check if user already a member
    const existingMember = group.members.find(m => m.user.toString() === userId.toString());
    if (existingMember) {
      throw new Error('User is already a member');
    }

    group.members.push({
      user: userId,
      role: role
    });

    await group.save();
    return await this.getGroupById(groupId);
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId, userId) {
    const group = await Group.findById(groupId);
    group.members = group.members.filter(m => m.user.toString() !== userId.toString());
    await group.save();
    return await this.getGroupById(groupId);
  }

  /**
   * Update group info
   */
  async updateGroup(groupId, updateData) {
    await Group.findByIdAndUpdate(groupId, updateData);
    return await this.getGroupById(groupId);
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId) {
    // Delete all messages in the group
    await GroupMessage.deleteMany({ group: groupId });
    // Delete the group
    await Group.findByIdAndDelete(groupId);
  }

  /**
   * Get group messages
   */
  async getGroupMessages(groupId, limit = 50, skip = 0) {
    const messages = await GroupMessage.find({ group: groupId })
      .populate('sender', 'firstName lastName email avatar')
      .populate('reactions.user', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar')
      .populate('relatedMessage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return messages;
  }

  /**
   * Create group message
   */
  async createGroupMessage(messageData) {
    const message = new GroupMessage(messageData);
    await message.save();

    // Update group's last message and increment unread count for all members except sender
    const group = await Group.findById(messageData.group);
    
    group.lastMessage = messageData.content;
    group.lastMessageSender = messageData.sender;
    group.lastMessageAt = new Date();
    
    // Increment unread count for all members except sender
    group.members.forEach(member => {
      const memberId = member.user.toString();
      if (memberId !== messageData.sender.toString()) {
        const currentCount = group.unreadCount.get(memberId) || 0;
        group.unreadCount.set(memberId, currentCount + 1);
      }
    });
    
    group.markModified('unreadCount');
    await group.save();

    return await GroupMessage.findById(message._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar')
      .populate('group');
  }

  /**
   * Create system notification for group
   */
  async createSystemNotification(groupId, type, relatedMessageId = null, content = '') {
    const notification = new GroupMessage({
      group: groupId,
      sender: null,
      content: content,
      isSystemMessage: true,
      systemMessageType: type,
      relatedMessage: relatedMessageId
    });

    await notification.save();

    await Group.findByIdAndUpdate(groupId, {
      lastMessage: content,
      lastMessageAt: new Date()
    });

    return await GroupMessage.findById(notification._id)
      .populate('group')
      .populate('relatedMessage');
  }

  /**
   * Toggle pin message
   */
  async togglePinMessage(messageId) {
    const message = await GroupMessage.findById(messageId);
    message.isPinned = !message.isPinned;
    await message.save();
    return await GroupMessage.findById(messageId)
      .populate('sender', 'firstName lastName email avatar')
      .populate('reactions.user', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar')
      .populate('group');
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, userId, emoji) {
    const message = await GroupMessage.findById(messageId);
    
    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== userId.toString()
    );

    // Add new reaction
    message.reactions.push({
      user: userId,
      emoji: emoji
    });

    await message.save();
    return await GroupMessage.findById(messageId)
      .populate('sender', 'firstName lastName email avatar')
      .populate('reactions.user', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar')
      .populate('group');
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId, userId) {
    const message = await GroupMessage.findById(messageId);
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== userId.toString()
    );
    await message.save();
    return await GroupMessage.findById(messageId)
      .populate('sender', 'firstName lastName email avatar')
      .populate('reactions.user', 'firstName lastName email avatar')
      .populate('readBy.user', 'firstName lastName avatar')
      .populate('group');
  }

  /**
   * Mark message as read by user
   */
  async markAsRead(messageId, userId) {
    const message = await GroupMessage.findById(messageId);
    
    // Check if already read
    const alreadyRead = message.readBy.some(r => r.user.toString() === userId.toString());
    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await message.save();
    }

    // Populate readBy for response
    await message.populate('readBy.user', 'firstName lastName avatar');

    return message;
  }
}

module.exports = new GroupRepository();
