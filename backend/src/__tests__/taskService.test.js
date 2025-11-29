// taskService.test.js - TDD for TaskService
const taskService = require('../services/taskService');
const taskRepository = require('../repositories/taskRepository');
jest.mock('../repositories/taskRepository');

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a task', async () => {
    const data = { title: 'Test', createdBy: 'user1' };
    taskRepository.create.mockResolvedValue({ ...data, _id: 'task1' });
    const result = await taskService.createTask(data);
    expect(result.title).toBe('Test');
    expect(result._id).toBe('task1');
  });

  it('should assign a task to a member', async () => {
    const task = { _id: 'task1', assignees: [], save: jest.fn() };
    taskRepository.findById.mockResolvedValue(task);
    await taskService.assignTask('task1', 'user2');
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
});
