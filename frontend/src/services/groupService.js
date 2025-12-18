import api from './api';

const groupService = {
  async createGroup(name, description, memberIds) {
    const response = await api.post('/groups', { name, description, memberIds });
    return response.data;
  },

  async getUserGroups() {
    const response = await api.get('/groups');
    return response.data;
  },

  async getGroup(groupId) {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  async getGroupMessages(groupId, limit = 50, skip = 0) {
    const response = await api.get(`/groups/${groupId}/messages`, {
      params: { limit, skip }
    });
    return response.data;
  },

  async sendGroupMessage(groupId, content, files = []) {
    const formData = new FormData();
    formData.append('content', content);
    
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    const response = await api.post(`/groups/${groupId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async addMember(groupId, userId) {
    const response = await api.post(`/groups/${groupId}/members`, { userId });
    return response.data;
  },

  async removeMember(groupId, userId) {
    const response = await api.delete(`/groups/${groupId}/members`, { data: { userId } });
    return response.data;
  },

  async togglePinMessage(messageId) {
    const response = await api.patch(`/groups/messages/${messageId}/pin`);
    return response.data;
  },

  async addReaction(messageId, emoji) {
    const response = await api.post(`/groups/messages/${messageId}/reaction`, { emoji });
    return response.data;
  },

  async removeReaction(messageId) {
    const response = await api.delete(`/groups/messages/${messageId}/reaction`);
    return response.data;
  },

  async markMessageAsRead(messageId) {
    const response = await api.patch(`/groups/messages/${messageId}/read`);
    return response.data;
  },

  async markGroupMessagesAsRead(groupId) {
    const response = await api.patch(`/groups/${groupId}/read`);
    return response.data;
  },

  async searchGroupMessages(groupId, query) {
    const response = await api.get(`/groups/${groupId}/messages/search`, {
      params: { q: query }
    });
    return response.data;
  }
};

export default groupService;
