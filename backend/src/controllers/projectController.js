// ProjectController - OOP, clean code, ready for future integrations
const projectService = require('../services/projectService');

const projectController = {
  async createProject(req, res, next) {
    try {
      const project = await projectService.createProject({ ...req.body, createdBy: req.user._id });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  },
  async addMember(req, res, next) {
    try {
      const { projectId, userId } = req.body;
      const project = await projectService.addMember(projectId, userId);
      res.json(project);
    } catch (err) {
      next(err);
    }
  },
  async addTask(req, res, next) {
    try {
      const { projectId, taskId } = req.body;
      const project = await projectService.addTask(projectId, taskId);
      res.json(project);
    } catch (err) {
      next(err);
    }
  },
  async getProject(req, res, next) {
    try {
      const project = await projectService.getProject(req.params.id);
      res.json(project);
    } catch (err) {
      next(err);
    }
  },
  async getProjects(req, res, next) {
    try {
      const projects = await projectService.getProjects(req.query);
      res.json(projects);
    } catch (err) {
      next(err);
    }
  },
  async deleteProject(req, res, next) {
    try {
      await projectService.deleteProject(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = projectController;
