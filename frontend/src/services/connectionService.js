import api from './api';

const connectionService = {
  // Send friend request
  async sendRequest(recipientId) {
    const response = await api.post('/connections/send', { recipientId });
    return response.data;
  },

  // Accept friend request
  async acceptRequest(requestId) {
    const response = await api.post(`/connections/accept/${requestId}`);
    return response.data;
  },

  // Reject friend request
  async rejectRequest(requestId) {
    const response = await api.post(`/connections/reject/${requestId}`);
    return response.data;
  },

  // Cancel sent request
  async cancelRequest(requestId) {
    const response = await api.delete(`/connections/cancel/${requestId}`);
    return response.data;
  },

  // Unfriend
  async unfriend(friendId) {
    const response = await api.delete(`/connections/unfriend/${friendId}`);
    return response.data;
  },

  // Block user
  async blockUser(targetUserId) {
    const response = await api.post(`/connections/block/${targetUserId}`);
    return response.data;
  },

  // Unblock user
  async unblockUser(targetUserId) {
    const response = await api.delete(`/connections/unblock/${targetUserId}`);
    return response.data;
  },

  // Get friends list
  async getFriends() {
    const response = await api.get('/connections/friends');
    return response.data;
  },

  // Get pending requests
  async getPendingRequests() {
    const response = await api.get('/connections/requests');
    return response.data;
  },

  // Get sent requests
  async getSentRequests() {
    const response = await api.get('/connections/sent');
    return response.data;
  },

  // Get blocked users
  async getBlockedUsers() {
    const response = await api.get('/connections/blocked');
    return response.data;
  },

  // Get friend suggestions
  async getSuggestions() {
    const response = await api.get('/connections/suggestions');
    return response.data;
  },

  // Get connection status
  async getConnectionStatus(targetUserId) {
    const response = await api.get(`/connections/status/${targetUserId}`);
    return response.data;
  }
};

export default connectionService;
