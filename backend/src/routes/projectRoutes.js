// projectRoutes.js - RESTful API for projects
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middlewares/auth');

router.post('/', auth, projectController.createProject);
router.post('/add-member', auth, projectController.addMember);
router.post('/add-task', auth, projectController.addTask);
router.get('/:id', auth, projectController.getProject);
router.get('/', auth, projectController.getProjects);
router.delete('/:id', auth, projectController.deleteProject);

module.exports = router;
