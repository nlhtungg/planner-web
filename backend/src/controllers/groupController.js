const groupRepository = require('../repositories/groupRepository');
const minioService = require('../services/minioService');

exports.createGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, memberIds } = req.body;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group name and members are required'
      });
    }

    const group = await groupRepository.createGroup({
      name,
      description,
      createdBy: userId,
      members: [
        { user: userId, role: 'admin', joinedAt: new Date() },
        ...memberIds.map(id => ({ user: id, role: 'member', joinedAt: new Date() }))
      ]
    });

    if (global.io) {
      [userId, ...memberIds].forEach(memberId => {
        global.io.to(`user-${memberId}`).emit('new-group', group);
      });
    }

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await groupRepository.getUserGroups(userId);
    
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    const group = await groupRepository.getGroupById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(m => m.user._id.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error getting group:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const userId = req.user._id;

    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user._id.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const messages = await groupRepository.getGroupMessages(groupId, parseInt(limit), parseInt(skip));
    
    res.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    console.error('Error getting group messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const senderId = req.user._id;
    const { content } = req.body;

    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user._id.toString() === senderId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      console.log(`📎 Processing ${req.files.length} file(s) for group ${groupId}`);
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          console.log(`  [${i+1}/${req.files.length}] Uploading: ${file.originalname}`);
          
          const uploadResult = await minioService.uploadMessageMedia(
            senderId,
            file.buffer,
            file.originalname,
            file.mimetype
          );
          
          attachments.push({
            url: uploadResult.url,
            filename: uploadResult.fileName,
            mimetype: uploadResult.mimeType,
            size: uploadResult.size
          });
        } catch (error) {
          console.error(`  ❌ Error uploading file:`, error.message);
        }
      }
    }

    const message = await groupRepository.createGroupMessage({
      group: groupId,
      sender: senderId,
      content,
      attachments
    });

    if (global.io) {
      group.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('new-group-message', message);
      });
    }

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: newUserId } = req.body;
    const requesterId = req.user._id;

    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const requester = group.members.find(m => m.user._id.toString() === requesterId.toString());
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can add members' });
    }

    const updatedGroup = await groupRepository.addMember(groupId, newUserId);

    if (global.io) {
      updatedGroup.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('group-updated', updatedGroup);
      });
    }

    res.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: targetUserId } = req.body;
    const requesterId = req.user._id;

    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const requester = group.members.find(m => m.user._id.toString() === requesterId.toString());
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }

    const updatedGroup = await groupRepository.removeMember(groupId, targetUserId);

    if (global.io) {
      updatedGroup.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('group-updated', updatedGroup);
      });
      global.io.to(`user-${targetUserId}`).emit('removed-from-group', { groupId });
    }

    res.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await groupRepository.togglePinGroupMessage(messageId, userId);

    if (global.io && message) {
      const group = await groupRepository.getGroupById(message.group._id);
      group.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('group-message-pinned', {
          messageId: message._id,
          isPinned: message.isPinned,
          groupId: message.group._id
        });
      });
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
};

exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await groupRepository.addReaction(messageId, userId, emoji);

    if (global.io && message) {
      const group = await groupRepository.getGroupById(message.group._id);
      group.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('group-message-reaction', message);
      });
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
};

exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await groupRepository.removeReaction(messageId, userId);

    if (global.io && message) {
      const group = await groupRepository.getGroupById(message.group._id);
      group.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('group-message-reaction', message);
      });
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
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await groupRepository.markAsRead(messageId, userId);

    // Emit socket event to all group members
    if (global.io && message) {
      const group = await groupRepository.getGroupById(message.group);
      group.members.forEach(member => {
        global.io.to(`user-${member.user._id}`).emit('group-message-read', {
          messageId: message._id,
          readBy: message.readBy
        });
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.markGroupMessagesAsRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Get all unread messages in the group
    const messages = await groupRepository.getGroupMessages(groupId, 100);
    
    // Mark each message as read
    for (const message of messages) {
      if (message.sender._id.toString() !== userId.toString()) {
        await groupRepository.markAsRead(message._id, userId);
      }
    }
    
    // Reset unread count for this user in group
    const Group = require('../models/Group');
    const group = await Group.findById(groupId);
    if (group) {
      group.unreadCount.set(userId.toString(), 0);
      group.markModified('unreadCount');
      await group.save();
    }

    res.json({
      success: true,
      message: 'All messages marked as read'
    });
  } catch (error) {
    console.error('Error marking group messages as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.searchGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Check if user is a member of the group
    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user._id.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const messages = await groupRepository.searchGroupMessages(groupId, q);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error searching group messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
