import api from './api';

/**
 * Chatbot Service
 * Handles chatbot API calls
 */
const chatbotService = {
  /**
   * Upload PDF document
   */
  async uploadDocument(file, type, title = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (title) {
      formData.append('title', title);
    }

    const response = await api.post('/chatbot/knowledge-base/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Upload URL
   */
  async uploadUrl(url, title = null) {
    const response = await api.post('/chatbot/knowledge-base/upload', {
      type: 'url',
      url,
      title,
    });
    return response.data;
  },

  /**
   * Get user's documents
   */
  async getDocuments(status = null) {
    const params = {};
    if (status) {
      params.status = status;
    }
    const response = await api.get('/chatbot/knowledge-base/documents', { params });
    return response.data;
  },

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    const response = await api.delete(`/chatbot/knowledge-base/documents/${documentId}`);
    return response.data;
  },

  /**
   * Send chat message
   */
  async sendMessage({ message, sessionId, selectedDocumentIds = [] }) {
    const response = await api.post('/chatbot/chat', {
      message,
      sessionId,
      selectedDocumentIds,
    });
    return response.data;
  },

  /**
   * Get chat history
   */
  async getChatHistory(sessionId) {
    const response = await api.get(`/chatbot/chat/history/${sessionId}`);
    return response.data;
  },

  /**
   * Get all chat sessions
   */
  async getChatSessions() {
    const response = await api.get('/chatbot/chat/sessions');
    return response.data;
  },

  /**
   * Delete chat session
   */
  async deleteSession(sessionId) {
    const response = await api.delete(`/chatbot/chat/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get user's workspaces
   */
  async getUserWorkspaces() {
    const response = await api.get('/chatbot/knowledge-base/workspaces');
    return response.data;
  },

  /**
   * Get documents in a workspace
   */
  async getWorkspaceDocuments(workspaceId) {
    const response = await api.get(`/chatbot/knowledge-base/workspaces/${workspaceId}/documents`);
    return response.data;
  },

  /**
   * Import document from workspace
   */
  async importFromWorkspace(documentId) {
    const response = await api.post('/chatbot/knowledge-base/import-from-workspace', {
      documentId
    });
    return response.data;
  },
};

export default chatbotService;
