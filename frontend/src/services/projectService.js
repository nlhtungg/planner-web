// projectService.js - API calls for projects
import api from './api';

export const createProject = (data) => api.post('/projects', data);
export const addMember = (projectId, userId) => api.post('/projects/add-member', { projectId, userId });
export const addTask = (projectId, taskId) => api.post('/projects/add-task', { projectId, taskId });
export const getProject = (id) => api.get(`/projects/${id}`);
export const getProjects = (params) => api.get('/projects', { params });
export const deleteProject = (id) => api.delete(`/projects/${id}`);
