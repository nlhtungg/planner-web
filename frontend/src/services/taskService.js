// taskService.js - API calls for tasks
import api from './api';

export const createTask = (data) => api.post('/tasks', data);
export const assignTask = (taskId, userId) => api.post('/tasks/assign', { taskId, userId });
export const setDueDate = (taskId, dueDate) => api.post('/tasks/due-date', { taskId, dueDate });
export const setPriority = (taskId, priority) => api.post('/tasks/priority', { taskId, priority });
export const updateProgress = (taskId, progress) => api.post('/tasks/progress', { taskId, progress });
export const getTask = (id) => api.get(`/tasks/${id}`);
export const getTasks = (params) => api.get('/tasks', { params });
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
