import api from './api';

class PostService {
  // Create a new post in a workspace
  async createPost(workspaceId, postData) {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/posts`, postData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get all posts in a workspace
  async getWorkspacePosts(workspaceId) {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/posts`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update a post
  async updatePost(workspaceId, postId, postData) {
    try {
      const response = await api.put(`/workspaces/${workspaceId}/posts/${postId}`, postData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete a post
  async deletePost(workspaceId, postId) {
    try {
      const response = await api.delete(`/workspaces/${workspaceId}/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new PostService();
