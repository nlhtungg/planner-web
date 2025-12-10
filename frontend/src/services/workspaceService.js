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

  // Join a public workspace
  async joinWorkspace(workspaceId) {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/join`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Leave workspace
  async leaveWorkspace(workspaceId) {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/leave`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const workspaceServiceInstance = new WorkspaceService();

// Named exports for convenience
export const getMyWorkspaces = (includePublic) => workspaceServiceInstance.getMyWorkspaces(includePublic);
export const getWorkspace = (workspaceId) => workspaceServiceInstance.getWorkspace(workspaceId);
export const createWorkspace = (data) => workspaceServiceInstance.createWorkspace(data);
export const updateWorkspace = (id, data) => workspaceServiceInstance.updateWorkspace(id, data);
export const deleteWorkspace = (id) => workspaceServiceInstance.deleteWorkspace(id);

export default workspaceServiceInstance;