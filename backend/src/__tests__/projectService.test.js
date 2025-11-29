// projectService.test.js - TDD for ProjectService
const projectService = require('../services/projectService');
const projectRepository = require('../repositories/projectRepository');
jest.mock('../repositories/projectRepository');

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a project', async () => {
    const data = { name: 'Project', createdBy: 'user1' };
    projectRepository.create.mockResolvedValue({ ...data, _id: 'proj1' });
    const result = await projectService.createProject(data);
    expect(result.name).toBe('Project');
    expect(result._id).toBe('proj1');
  });

  it('should add a member', async () => {
    const project = { _id: 'proj1', members: [], save: jest.fn() };
    projectRepository.findById.mockResolvedValue(project);
    await projectService.addMember('proj1', 'user2');
    expect(project.members).toContain('user2');
    expect(project.save).toHaveBeenCalled();
  });

  it('should add a task', async () => {
    const project = { _id: 'proj1', tasks: [], save: jest.fn() };
    projectRepository.findById.mockResolvedValue(project);
    await projectService.addTask('proj1', 'task1');
    expect(project.tasks).toContain('task1');
    expect(project.save).toHaveBeenCalled();
  });
});
