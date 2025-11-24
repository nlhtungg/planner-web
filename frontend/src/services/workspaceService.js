import api from './api';

class WorkspaceService {
  // Create a new workspace
  async createWorkspace(workspaceData) {
    try {
      const response = await api.post('/workspaces', workspaceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get all user's workspaces
  async getMyWorkspaces(includePublic = true) {
    try {
      const response = await api.get(`/workspaces?includePublic=${includePublic}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get a specific workspace
  async getWorkspace(workspaceId) {
    try {
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update workspace
  async updateWorkspace(workspaceId, updateData) {
    try {
      const response = await api.put(`/workspaces/${workspaceId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete workspace
  async deleteWorkspace(workspaceId) {
    try {
      const response = await api.delete(`/workspaces/${workspaceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Add member to workspace
  async addMember(workspaceId, memberData) {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/members`, memberData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Remove member from workspace
  async removeMember(workspaceId, memberId) {
    try {
      const response = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update member role
  async updateMemberRole(workspaceId, memberId, role) {
    try {
      const response = await api.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get workspace statistics
  async getWorkspaceStats(workspaceId) {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/stats`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Add member to workspace
  async addMember(workspaceId, memberData) {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/members`, memberData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Remove member from workspace
  async removeMember(workspaceId, memberId) {
    try {
      const response = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Join a public workspace
  async joinWorkspace(workspaceId) {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/join`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new WorkspaceService();