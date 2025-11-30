// taskService.js - API calls for tasks
import api from './api';

// Create a task (workspace id included in body)
export const createTask = (data) => api.post('/tasks', data);

// Fetch tasks by workspace (scoped)
export const getTasksByWorkspace = (workspaceId) => api.get(`/tasks/workspace/${workspaceId}`);

// Generic task operations
export const assignTask = (taskId, userId) => api.post('/tasks/assign', { taskId, userId });
export const assignTaskByIdentifier = (taskId, identifier) => api.post('/tasks/assign', { taskId, identifier });
export const setDueDate = (taskId, dueDate) => api.post('/tasks/due-date', { taskId, dueDate });
export const setPriority = (taskId, priority) => api.post('/tasks/priority', { taskId, priority });
export const updateProgress = (taskId, progress) => api.post('/tasks/progress', { taskId, progress });
export const getTask = (id) => api.get(`/tasks/${id}`);
export const getTasks = (params) => api.get('/tasks', { params });
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
// New extended operations
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data);
export const setEstimate = (id, estimatedHours) => api.post(`/tasks/${id}/estimate`, { estimatedHours });
export const logTime = (id, hours, description) => api.post(`/tasks/${id}/time-entry`, { hours, description });
