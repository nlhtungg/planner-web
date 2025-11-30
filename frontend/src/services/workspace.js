export async function searchMembers(workspaceId, q = '', limit = 10) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  const res = await fetch(`/api/workspaces/${workspaceId}/members/search?` + params.toString(), {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Search failed (${res.status})`);
  }
  const json = await res.json();
  return json.data || [];
}
