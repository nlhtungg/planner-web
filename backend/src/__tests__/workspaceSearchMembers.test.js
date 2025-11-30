// workspaceSearchMembers.test.js - TDD for fuzzy member search
const workspaceController = require('../controllers/workspaceController');
const workspaceRepository = require('../repositories/workspaceRepository');

jest.mock('../repositories/workspaceRepository');

describe('WorkspaceController.searchMembers', () => {
  const res = () => {
    const result = { status: null, body: null };
    return {
      status(code) { result.status = code; return this; },
      json(payload) { result.body = payload; return this; },
      get _result() { return result; }
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for short query', async () => {
    const fakeWorkspace = { _id: 'ws1', isActive: true, owner: { _id: 'owner1' }, isMember: () => true };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    const r = res();
    await workspaceController.searchMembers({ params: { workspaceId: 'ws1' }, query: { q: 'a' }, user: { _id: 'owner1' } }, r);
    expect(r._result.status).toBe(400);
    expect(r._result.body.success).toBe(false);
    expect(r._result.body.message).toMatch(/at least 2 characters/i);
  });

  it('returns 403 for non-member', async () => {
    const fakeWorkspace = { _id: 'ws1', isActive: true, owner: { _id: 'owner1' }, isMember: () => false };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    const r = res();
    await workspaceController.searchMembers({ params: { workspaceId: 'ws1' }, query: { q: 'john' }, user: { _id: 'stranger' } }, r);
    expect(r._result.status).toBe(403);
    expect(r._result.body.success).toBe(false);
  });

  it('returns matched members', async () => {
    const fakeWorkspace = { _id: 'ws1', isActive: true, owner: { _id: 'owner1' }, isMember: () => true };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    workspaceRepository.searchMembers.mockResolvedValue([
      { _id: 'u1', displayName: 'John Doe', email: 'john@example.com', avatar: null, role: 'member' }
    ]);
    const r = res();
    await workspaceController.searchMembers({ params: { workspaceId: 'ws1' }, query: { q: 'john', limit: '5' }, user: { _id: 'owner1' } }, r);
    expect(r._result.status).toBe(200);
    expect(r._result.body.success).toBe(true);
    expect(r._result.body.data).toHaveLength(1);
    expect(r._result.body.data[0].displayName).toBe('John Doe');
    expect(workspaceRepository.searchMembers).toHaveBeenCalledWith('ws1', 'john', 5);
  });
});
