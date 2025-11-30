// taskService.test.js - TDD for TaskService
const taskService = require('../services/taskService');
const taskRepository = require('../repositories/taskRepository');
const workspaceRepository = require('../repositories/workspaceRepository');
jest.mock('../repositories/taskRepository');
jest.mock('../repositories/workspaceRepository');
jest.mock('../repositories/userRepository');

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a task', async () => {
    const data = { title: 'Test', description: 'Desc', workspace: 'ws1', assignees: [] };
    const fakeWorkspace = { _id: 'ws1', isMember: () => true };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    taskRepository.create.mockResolvedValue({ ...data, _id: 'task1', createdBy: 'user1' });
    const result = await taskService.createTask(data, 'user1');
    expect(result.title).toBe('Test');
    expect(result._id).toBe('task1');
  });

  it('should assign a task to a member', async () => {
    const task = { _id: 'task1', workspace: 'ws1', assignees: [], save: jest.fn() };
    const fakeWorkspace = { _id: 'ws1', isMember: (id) => ['user1','user2'].includes(id) };
    taskRepository.findById.mockResolvedValue(task);
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    await taskService.assignTask('task1', 'user2', 'user1');
    expect(task.assignees).toContain('user2');
    expect(task.save).toHaveBeenCalled();
  });

  it('should set due date', async () => {
    taskRepository.update.mockResolvedValue({ _id: 'task1', dueDate: '2025-12-01' });
    const result = await taskService.setDueDate('task1', '2025-12-01');
    expect(result.dueDate).toBe('2025-12-01');
  });

  it('should set priority', async () => {
    taskRepository.update.mockResolvedValue({ _id: 'task1', priority: 'high' });
    const result = await taskService.setPriority('task1', 'high');
    expect(result.priority).toBe('high');
  });

  it('should update progress', async () => {
    taskRepository.update.mockResolvedValue({ _id: 'task1', progress: 50 });
    const result = await taskService.updateProgress('task1', 50);
    expect(result.progress).toBe(50);
  });

  it('should prevent non-member updating task', async () => {
    taskRepository.findById.mockResolvedValue({ _id: 'task1', workspace: 'ws1', createdBy: 'creator1', assignees: [] });
    const fakeWorkspace = { _id: 'ws1', isMember: () => false };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    await expect(taskService.updateTask('task1', { title: 'New' }, 'userX')).rejects.toThrow('You do not have access to this task');
  });

  it('should allow creator to update task', async () => {
    const task = { _id: 'task1', workspace: 'ws1', createdBy: 'creator1', assignees: [] };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: () => true, getUserRole: () => 'member' };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    taskRepository.update.mockResolvedValue({ ...task, title: 'Updated Title' });
    const result = await taskService.updateTask('task1', { title: 'Updated Title' }, 'creator1');
    expect(result.title).toBe('Updated Title');
  });

  it('should allow owner to set estimate', async () => {
    const task = { _id: 'task1', workspace: 'ws1', createdBy: 'creator1', assignees: [] };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: () => true, getUserRole: () => 'owner' };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    taskRepository.update.mockResolvedValue({ ...task, estimatedHours: 12 });
    const result = await taskService.setEstimate('task1', 12, 'owner1');
    expect(result.estimatedHours).toBe(12);
  });

  it('should reject invalid estimate', async () => {
    await expect(taskService.setEstimate('task1', 0, 'owner1')).rejects.toThrow('Estimated hours must be greater than zero');
  });

  it('should allow assignee to log time', async () => {
    const task = { _id: 'task1', workspace: 'ws1', createdBy: 'creator1', assignees: ['userA'] };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: () => true, getUserRole: () => 'member' };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    taskRepository.pushTimeEntry.mockResolvedValue({ ...task, loggedHours: 2, timeEntries: [{ user: 'userA', hours: 2 }] });
    const result = await taskService.logTime('task1', 2, 'Initial work', 'userA');
    expect(result.loggedHours).toBe(2);
    expect(result.timeEntries[0].hours).toBe(2);
  });

  it('should prevent non-assignee logging time', async () => {
    const task = { _id: 'task1', workspace: 'ws1', createdBy: 'creator1', assignees: [] };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: () => true, getUserRole: () => 'member' };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    await expect(taskService.logTime('task1', 1, 'Work', 'userB')).rejects.toThrow('Only assignees or workspace owner can log time');
  });

  it('assigns by identifier (email)', async () => {
    const userRepository = require('../repositories/userRepository');
    const task = { _id: 'task1', workspace: 'ws1', assignees: [], save: jest.fn() };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: (id) => ['userReq','userA'].includes(id) };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    userRepository.findByEmailOrUsername.mockResolvedValue({ _id: 'userA', email: 'a@example.com' });
    const result = await taskService.assignTaskByIdentifier('task1', 'a@example.com', 'userReq');
    expect(task.assignees).toContain('userA');
    expect(task.save).toHaveBeenCalled();
  });

  it('fails identifier when user not found', async () => {
    const userRepository = require('../repositories/userRepository');
    const task = { _id: 'task1', workspace: 'ws1', assignees: [], save: jest.fn() };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: () => true };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    userRepository.findByEmailOrUsername.mockResolvedValue(null);
    await expect(taskService.assignTaskByIdentifier('task1', 'nouser', 'userReq')).rejects.toThrow('User not found');
  });

  it('fails identifier when assignee not member', async () => {
    const userRepository = require('../repositories/userRepository');
    const task = { _id: 'task1', workspace: 'ws1', assignees: [], save: jest.fn() };
    taskRepository.findById.mockResolvedValue(task);
    const fakeWorkspace = { _id: 'ws1', isMember: (id) => id === 'req' };
    workspaceRepository.getWorkspaceById.mockResolvedValue(fakeWorkspace);
    userRepository.findByEmailOrUsername.mockResolvedValue({ _id: 'notMember', email: 'x@example.com' });
    await expect(taskService.assignTaskByIdentifier('task1', 'x@example.com', 'req')).rejects.toThrow('Assignee must be a member of the workspace');
  });
});
