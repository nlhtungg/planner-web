import api from './api';

const commentService = {
  // Create a new comment on a post
  createComment: async (workspaceId, postId, content) => {
    const response = await api.post(`/workspaces/${workspaceId}/posts/${postId}/comments`, {
      content
    });
    return response.data;
  },

  // Get all comments for a post
  getPostComments: async (workspaceId, postId) => {
    const response = await api.get(`/workspaces/${workspaceId}/posts/${postId}/comments`);
    return response.data;
  },

  // Update a comment
  updateComment: async (workspaceId, postId, commentId, content) => {
    const response = await api.put(`/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}`, {
      content
    });
    return response.data;
  },

  // Delete a comment
  deleteComment: async (workspaceId, postId, commentId) => {
    const response = await api.delete(`/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}`);
    return response.data;
  }
};

export default commentService;
