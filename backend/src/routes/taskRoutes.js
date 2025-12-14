// taskRoutes.js - RESTful API for tasks
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/auth');

// Secure all task routes with JWT authentication
router.post('/', authenticateToken, taskController.createTask);
router.post('/assign', authenticateToken, taskController.assignTask);
router.post('/unassign', authenticateToken, taskController.unassignTask);
router.post('/due-date', authenticateToken, taskController.setDueDate);
router.post('/priority', authenticateToken, taskController.setPriority);
router.post('/progress', authenticateToken, taskController.updateProgress);
router.patch('/:id', authenticateToken, taskController.updateTask);
router.post('/:id/estimate', authenticateToken, taskController.setEstimate);
router.post('/:id/time-entry', authenticateToken, taskController.logTime);
router.get('/workspace/:workspaceId', authenticateToken, taskController.getTasksByWorkspace);
router.get('/:id', authenticateToken, taskController.getTask);
router.get('/', authenticateToken, taskController.getTasks);
router.delete('/:id', authenticateToken, taskController.deleteTask);

module.exports = router;
