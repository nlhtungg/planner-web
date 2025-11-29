// TaskService - OOP, clean code, ready for future integrations
const taskRepository = require('../repositories/taskRepository');

class TaskService {
  async createTask(data) {
    // Add business logic here (e.g., validation, notifications)
    return await taskRepository.create(data);
  }

  async assignTask(taskId, userId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    if (!task.assignees.includes(userId)) {
      task.assignees.push(userId);
      await task.save();
    }
    return task;
  }

  async setDueDate(taskId, dueDate) {
    return await taskRepository.update(taskId, { dueDate });
  }

  async setPriority(taskId, priority) {
    return await taskRepository.update(taskId, { priority });
  }

  async updateProgress(taskId, progress) {
    return await taskRepository.update(taskId, { progress });
  }

  async getTask(taskId) {
    return await taskRepository.findById(taskId);
  }

  async getTasks(filter) {
    return await taskRepository.findAll(filter);
  }

  async deleteTask(taskId) {
    return await taskRepository.delete(taskId);
  }
}

module.exports = new TaskService();
