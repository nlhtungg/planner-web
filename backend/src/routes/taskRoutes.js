// taskRoutes.js - RESTful API for tasks
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middlewares/auth');

router.post('/', auth, taskController.createTask);
router.post('/assign', auth, taskController.assignTask);
router.post('/due-date', auth, taskController.setDueDate);
router.post('/priority', auth, taskController.setPriority);
router.post('/progress', auth, taskController.updateProgress);
router.get('/:id', auth, taskController.getTask);
router.get('/', auth, taskController.getTasks);
router.delete('/:id', auth, taskController.deleteTask);

module.exports = router;
