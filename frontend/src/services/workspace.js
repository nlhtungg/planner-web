import api from './api';

export async function searchMembers(workspaceId, q = '', limit = 10) {
  const res = await api.get(`/workspaces/${workspaceId}/members/search`, {
    params: {
      ...(q ? { q } : {}),
      limit,
    },
  });

  // Backend responses in this project commonly wrap payload in { success, data }
  return res.data?.data || [];
}
