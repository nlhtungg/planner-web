// taskRoutes.js - RESTful API for tasks
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/', authenticateToken, taskController.createTask);
router.post('/assign', authenticateToken, taskController.assignTask);
router.post('/due-date', authenticateToken, taskController.setDueDate);
router.post('/priority', authenticateToken, taskController.setPriority);
router.post('/progress', authenticateToken, taskController.updateProgress);
router.get('/:id', authenticateToken, taskController.getTask);
router.get('/', authenticateToken, taskController.getTasks);
router.delete('/:id', authenticateToken, taskController.deleteTask);

module.exports = router;
