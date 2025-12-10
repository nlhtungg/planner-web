import api from './api';

const reactionService = {
  // Post reactions
  togglePostReaction: async (workspaceId, postId, reactionType, emoji) => {
    const response = await api.post(`/workspaces/${workspaceId}/posts/${postId}/reactions`, {
      reactionType,
      emoji
    });
    return response.data;
  },

  getPostReactionSummary: async (workspaceId, postId) => {
    const response = await api.get(`/workspaces/${workspaceId}/posts/${postId}/reactions/summary`);
    return response.data;
  },

  getPostReactions: async (workspaceId, postId) => {
    const response = await api.get(`/workspaces/${workspaceId}/posts/${postId}/reactions`);
    return response.data;
  },

  // Comment reactions
  toggleCommentReaction: async (workspaceId, postId, commentId, reactionType, emoji) => {
    const response = await api.post(`/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}/reactions`, {
      reactionType,
      emoji
    });
    return response.data;
  },

  getCommentReactionSummary: async (workspaceId, postId, commentId) => {
    const response = await api.get(`/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}/reactions/summary`);
    return response.data;
  },

  getCommentReactions: async (workspaceId, postId, commentId) => {
    const response = await api.get(`/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}/reactions`);
    return response.data;
  }
};

export default reactionService;
