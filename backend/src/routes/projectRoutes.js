// projectRoutes.js - RESTful API for projects
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/', authenticateToken, projectController.createProject);
router.post('/add-member', authenticateToken, projectController.addMember);
router.post('/add-task', authenticateToken, projectController.addTask);
router.get('/:id', authenticateToken, projectController.getProject);
router.get('/', authenticateToken, projectController.getProjects);
router.delete('/:id', authenticateToken, projectController.deleteProject);

module.exports = router;
