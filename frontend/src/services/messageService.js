import api from './api';

const messageService = {
  /**
   * Get all conversations
   */
  async getConversations() {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  /**
   * Get messages with a specific user
   */
  async getMessages(otherUserId, limit = 50, skip = 0) {
    const response = await api.get(`/messages/${otherUserId}`, {
      params: { limit, skip }
    });
    return response.data;
  },

  /**
   * Send a message
   */
  async sendMessage(receiverId, content, attachments = []) {
    const response = await api.post('/messages/send', {
      receiverId,
      content,
      attachments
    });
    return response.data;
  },

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(otherUserId) {
    const response = await api.patch(`/messages/${otherUserId}/read`);
    return response.data;
  },

  /**
   * Mark single message as read
   */
  async markMessageAsRead(messageId) {
    const response = await api.patch(`/messages/message/${messageId}/read`);
    return response.data;
  },

  /**
   * Delete a message
   */
  async deleteMessage(messageId) {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  /**
   * Get unread message count
   */
  async getUnreadCount() {
    const response = await api.get('/messages/unread-count');
    return response.data;
  },

  /**
   * Search users for chat
   */
  async searchUsers(query) {
    const response = await api.get('/messages/users/search', {
      params: { q: query }
    });
    return response.data;
  },

  /**
   * Add reaction to message
   */
  async addReaction(messageId, emoji) {
    const response = await api.post(`/messages/message/${messageId}/reaction`, {
      emoji
    });
    return response.data;
  },

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId) {
    const response = await api.delete(`/messages/message/${messageId}/reaction`);
    return response.data;
  },

  /**
   * Toggle pin message
   */
  async togglePinMessage(messageId) {
    const response = await api.patch(`/messages/message/${messageId}/pin`);
    return response.data;
  },

  /**
   * Update conversation settings (nickname, theme color)
   */
  async updateConversationSettings(otherUserId, settings) {
    const response = await api.patch(`/messages/${otherUserId}/settings`, settings);
    return response.data;
  },

  /**
   * Search messages in conversation
   */
  async searchMessages(otherUserId, query) {
    const response = await api.get(`/messages/${otherUserId}/search`, {
      params: { q: query }
    });
    return response.data;
  }
};

export default messageService;
