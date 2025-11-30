// TaskRepository - OOP, clean code, ready for future integrations
const Task = require('../models/Task');

class TaskRepository {
  async create(taskData) {
    return await Task.create(taskData);
  }

  async findById(id) {
    return await Task.findById(id)
      .populate('assignees workspace createdBy timeEntries.user');
  }

  async findAll(filter = {}) {
    return await Task.find(filter)
      .populate('assignees workspace createdBy timeEntries.user');
  }

  async findByWorkspace(workspaceId) {
    return await Task.find({ workspace: workspaceId })
      .populate('assignees createdBy'); // omit time entries for workspace list to reduce payload
  }

  async update(id, updateData) {
    return await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignees workspace createdBy timeEntries.user');
  }

  async pushTimeEntry(id, entry) {
    const task = await Task.findById(id);
    if (!task) return null;
    task.timeEntries.push(entry);
    task.loggedHours = (task.loggedHours || 0) + entry.hours;
    await task.save();
    return await task.populate('assignees workspace createdBy timeEntries.user');
  }

  async delete(id) {
    return await Task.findByIdAndDelete(id);
  }
}

module.exports = new TaskRepository();
