// ProjectRepository - OOP, clean code, ready for future integrations
const Project = require('../models/Project');

class ProjectRepository {
  async create(projectData) {
    return await Project.create(projectData);
  }

  async findById(id) {
    return await Project.findById(id).populate('members tasks createdBy');
  }

  async findAll(filter = {}) {
    return await Project.find(filter).populate('members tasks createdBy');
  }

  async update(id, updateData) {
    return await Project.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id) {
    return await Project.findByIdAndDelete(id);
  }
}

module.exports = new ProjectRepository();
