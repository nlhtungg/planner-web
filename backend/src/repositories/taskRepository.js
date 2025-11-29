// TaskRepository - OOP, clean code, ready for future integrations
const Task = require('../models/Task');

class TaskRepository {
  async create(taskData) {
    return await Task.create(taskData);
  }

  async findById(id) {
    return await Task.findById(id).populate('assignees project createdBy');
  }

  async findAll(filter = {}) {
    return await Task.find(filter).populate('assignees project createdBy');
  }

  async update(id, updateData) {
    return await Task.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id) {
    return await Task.findByIdAndDelete(id);
  }
}

module.exports = new TaskRepository();
