// calendarRoutes.js - Calendar API endpoints
const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticateToken } = require('../middlewares/auth');

// All calendar routes require authentication
router.use(authenticateToken);

/**
 * GET /api/calendar/events
 * Get calendar events with optional filters
 * Query params: startDate, endDate, workspace, priority, status
 */
router.get('/events', calendarController.getCalendarEvents);

/**
 * POST /api/calendar/events
 * Create a new calendar event
 * Body: { title, description, dueDate, workspace?, priority?, status? }
 */
router.post('/events', calendarController.createCalendarEvent);

/**
 * PATCH /api/calendar/events/:id
 * Update a calendar event
 * Body: { title?, description?, dueDate?, priority?, status? }
 */
router.patch('/events/:id', calendarController.updateCalendarEvent);

/**
 * DELETE /api/calendar/events/:id
 * Delete a calendar event
 */
router.delete('/events/:id', calendarController.deleteCalendarEvent);

/**
 * POST /api/calendar/events/:id/move
 * Move event to a different date (for drag & drop)
 * Body: { newDate }
 */
router.post('/events/:id/move', calendarController.moveCalendarEvent);

/**
 * GET /api/calendar/stats
 * Get calendar statistics
 * Query params: startDate?, endDate?
 */
router.get('/stats', calendarController.getCalendarStats);

module.exports = router;
