const Connection = require('../models/Connection');
const User = require('../models/User');
const Group = require('../models/Group');

class ConnectionRepository {
  /**
   * Send friend request
   */
  async sendRequest(requesterId, recipientId) {
    // Check if connection already exists
    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'blocked') {
        throw new Error('Cannot send request to blocked user');
      }
      if (existing.status === 'pending') {
        throw new Error('Friend request already sent');
      }
      if (existing.status === 'accepted') {
        throw new Error('Already friends');
      }
    }

    const connection = new Connection({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    await connection.save();
    return await Connection.findById(connection._id)
      .populate('requester', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar');
  }

  /**
   * Accept friend request
   */
  async acceptRequest(requestId, userId) {
    const connection = await Connection.findById(requestId);
    
    if (!connection) {
      throw new Error('Request not found');
    }

    if (connection.recipient.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    if (connection.status !== 'pending') {
      throw new Error('Request is not pending');
    }

    connection.status = 'accepted';
    await connection.save();

    return await Connection.findById(connection._id)
      .populate('requester', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar');
  }

  /**
   * Reject friend request
   */
  async rejectRequest(requestId, userId) {
    const connection = await Connection.findById(requestId)
      .populate('requester', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar');
    
    if (!connection) {
      throw new Error('Request not found');
    }

    if (connection.recipient._id.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    connection.status = 'rejected';
    await connection.save();

    return connection;
  }

  /**
   * Cancel sent request
   */
  async cancelRequest(requestId, userId) {
    const connection = await Connection.findById(requestId)
      .populate('requester', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar');
    
    if (!connection) {
      throw new Error('Request not found');
    }

    if (connection.requester._id.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    if (connection.status !== 'pending') {
      throw new Error('Can only cancel pending requests');
    }

    await Connection.findByIdAndDelete(requestId);
    return connection;
  }

  /**
   * Unfriend
   */
  async unfriend(userId, friendId) {
    const connection = await Connection.findOne({
      $or: [
        { requester: userId, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: userId, status: 'accepted' }
      ]
    });

    if (!connection) {
      throw new Error('Not friends');
    }

    await Connection.findByIdAndDelete(connection._id);
    return { success: true };
  }

  /**
   * Block user
   */
  async blockUser(userId, targetUserId) {
    // Delete any existing connection
    await Connection.deleteMany({
      $or: [
        { requester: userId, recipient: targetUserId },
        { requester: targetUserId, recipient: userId }
      ]
    });

    // Create block connection
    const connection = new Connection({
      requester: userId,
      recipient: targetUserId,
      status: 'blocked',
      blockedBy: userId
    });

    await connection.save();
    return await Connection.findById(connection._id)
      .populate('recipient', 'firstName lastName email avatar');
  }

  /**
   * Unblock user
   */
  async unblockUser(userId, targetUserId) {
    const connection = await Connection.findOne({
      requester: userId,
      recipient: targetUserId,
      status: 'blocked',
      blockedBy: userId
    });

    if (!connection) {
      throw new Error('User is not blocked');
    }

    await Connection.findByIdAndDelete(connection._id);
    return { success: true };
  }

  /**
   * Get friends list
   */
  async getFriends(userId) {
    const connections = await Connection.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    })
      .populate('requester', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar')
      .sort({ updatedAt: -1 });

    return connections.map(conn => {
      const friend = conn.requester._id.toString() === userId.toString() 
        ? conn.recipient 
        : conn.requester;
      return {
        _id: friend._id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        email: friend.email,
        avatar: friend.avatar,
        connectedAt: conn.updatedAt
      };
    });
  }

  /**
   * Get pending requests (received)
   */
  async getPendingRequests(userId) {
    return await Connection.find({
      recipient: userId,
      status: 'pending'
    })
      .populate('requester', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });
  }

  /**
   * Get sent requests
   */
  async getSentRequests(userId) {
    return await Connection.find({
      requester: userId,
      status: 'pending'
    })
      .populate('recipient', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId) {
    const connections = await Connection.find({
      requester: userId,
      status: 'blocked',
      blockedBy: userId
    })
      .populate('recipient', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });

    return connections.map(conn => conn.recipient);
  }

  /**
   * Get friend suggestions based on mutual friends and common groups
   */
  async getSuggestions(userId, limit = 10) {
    // Get current user's friends
    const userConnections = await Connection.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    });

    const friendIds = userConnections.map(conn => 
      conn.requester.toString() === userId.toString() 
        ? conn.recipient.toString()
        : conn.requester.toString()
    );

    // Get all pending/rejected/blocked connections to exclude
    const existingConnections = await Connection.find({
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });

    const connectedUserIds = existingConnections.map(conn => 
      conn.requester.toString() === userId.toString() 
        ? conn.recipient.toString()
        : conn.requester.toString()
    );

    // Find friends of friends
    const friendsOfFriends = await Connection.find({
      $or: [
        { requester: { $in: friendIds }, status: 'accepted' },
        { recipient: { $in: friendIds }, status: 'accepted' }
      ]
    });

    const suggestionMap = new Map();

    friendsOfFriends.forEach(conn => {
      const suggestedUserId = conn.requester.toString() === userId.toString() || friendIds.includes(conn.requester.toString())
        ? conn.recipient.toString()
        : conn.requester.toString();

      if (suggestedUserId !== userId.toString() && 
          !connectedUserIds.includes(suggestedUserId)) {
        const count = suggestionMap.get(suggestedUserId) || 0;
        suggestionMap.set(suggestedUserId, count + 1);
      }
    });

    // Sort by mutual friends count
    const sortedSuggestions = Array.from(suggestionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // Get user details
    const suggestions = await User.find({
      _id: { $in: sortedSuggestions }
    }).select('firstName lastName email avatar');

    return suggestions.map(user => ({
      ...user.toObject(),
      mutualFriends: suggestionMap.get(user._id.toString())
    }));
  }

  /**
   * Get connection status between two users
   */
  async getConnectionStatus(userId, targetUserId) {
    const connection = await Connection.findOne({
      $or: [
        { requester: userId, recipient: targetUserId },
        { requester: targetUserId, recipient: userId }
      ]
    });

    if (!connection) {
      return { status: 'none', connection: null };
    }

    if (connection.status === 'accepted') {
      return { status: 'friends', connection };
    }

    if (connection.status === 'blocked') {
      if (connection.blockedBy.toString() === userId.toString()) {
        return { status: 'blocked_by_you', connection };
      }
      return { status: 'blocked_you', connection };
    }

    if (connection.status === 'pending') {
      if (connection.requester.toString() === userId.toString()) {
        return { status: 'request_sent', connection };
      }
      return { status: 'request_received', connection };
    }

    return { status: 'none', connection: null };
  }
}

module.exports = new ConnectionRepository();
