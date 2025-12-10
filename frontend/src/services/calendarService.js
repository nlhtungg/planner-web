// calendarService.js - Calendar API calls
import api from './api';

/**
 * Get calendar events with optional filters
 * @param {Object} params - Query params: startDate, endDate, workspace, priority, status
 */
export const getCalendarEvents = (params) => 
  api.get('/calendar/events', { params });

/**
 * Create a new calendar event
 * @param {Object} data - Event data: { title, description, dueDate, workspace?, priority?, status? }
 */
export const createCalendarEvent = (data) => 
  api.post('/calendar/events', data);

/**
 * Update a calendar event
 * @param {string} id - Event ID
 * @param {Object} data - Updated fields
 */
export const updateCalendarEvent = (id, data) => 
  api.patch(`/calendar/events/${id}`, data);

/**
 * Delete a calendar event
 * @param {string} id - Event ID
 */
export const deleteCalendarEvent = (id) => 
  api.delete(`/calendar/events/${id}`);

/**
 * Move event to a different date (drag & drop)
 * @param {string} id - Event ID
 * @param {Date|string} newDate - New due date
 */
export const moveCalendarEvent = (id, newDate) => 
  api.post(`/calendar/events/${id}/move`, { newDate });

/**
 * Get calendar statistics
 * @param {Object} params - Query params: startDate?, endDate?
 */
export const getCalendarStats = (params) => 
  api.get('/calendar/stats', { params });
