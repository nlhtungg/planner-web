// TaskController - OOP, clean code, ready for future integrations
const taskService = require('../services/taskService');

const taskController = {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask({ ...req.body, createdBy: req.user._id });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },
  async assignTask(req, res, next) {
    try {
      const { taskId, userId } = req.body;
      const task = await taskService.assignTask(taskId, userId);
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
  async setDueDate(req, res, next) {
    try {
      const { taskId, dueDate } = req.body;
      const task = await taskService.setDueDate(taskId, dueDate);
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
  async setPriority(req, res, next) {
    try {
      const { taskId, priority } = req.body;
      const task = await taskService.setPriority(taskId, priority);
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
  async updateProgress(req, res, next) {
    try {
      const { taskId, progress } = req.body;
      const task = await taskService.updateProgress(taskId, progress);
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
  async getTask(req, res, next) {
    try {
      const task = await taskService.getTask(req.params.id);
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
  async getTasks(req, res, next) {
    try {
      const tasks = await taskService.getTasks(req.query);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },
  async deleteTask(req, res, next) {
    try {
      await taskService.deleteTask(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = taskController;
