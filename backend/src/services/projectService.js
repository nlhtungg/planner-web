// ProjectService - OOP, clean code, ready for future integrations
const projectRepository = require('../repositories/projectRepository');

class ProjectService {
  async createProject(data) {
    // Add business logic here (e.g., validation, notifications)
    return await projectRepository.create(data);
  }

  async addMember(projectId, userId) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!project.members.includes(userId)) {
      project.members.push(userId);
      await project.save();
    }
    return project;
  }

  async addTask(projectId, taskId) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!project.tasks.includes(taskId)) {
      project.tasks.push(taskId);
      await project.save();
    }
    return project;
  }

  async getProject(projectId) {
    return await projectRepository.findById(projectId);
  }

  async getProjects(filter) {
    return await projectRepository.findAll(filter);
  }

  async deleteProject(projectId) {
    return await projectRepository.delete(projectId);
  }
}

module.exports = new ProjectService();
