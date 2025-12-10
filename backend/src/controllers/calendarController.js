// calendarController.js - Calendar-specific operations
const calendarService = require('../services/calendarService');

const calendarController = {
  /**
   * Get calendar events (tasks with dueDate)
   * Query params: startDate, endDate, workspace, priority, status
   */
  async getCalendarEvents(req, res, next) {
    try {
      const { startDate, endDate, workspace, priority, status } = req.query;
      const events = await calendarService.getCalendarEvents(
        req.user._id,
        { startDate, endDate, workspace, priority, status }
      );
      res.json({ success: true, events });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a calendar event (task)
   */
  async createCalendarEvent(req, res, next) {
    try {
      const event = await calendarService.createCalendarEvent(
        { ...req.body, createdBy: req.user._id },
        req.user._id
      );
      res.status(201).json({ success: true, event });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update calendar event (task)
   */
  async updateCalendarEvent(req, res, next) {
    try {
      const event = await calendarService.updateCalendarEvent(
        req.params.id,
        req.body,
        req.user._id
      );
      res.json({ success: true, event });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete calendar event (task)
   */
  async deleteCalendarEvent(req, res, next) {
    try {
      await calendarService.deleteCalendarEvent(req.params.id, req.user._id);
      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Move event to different date (drag & drop)
   */
  async moveCalendarEvent(req, res, next) {
    try {
      const { newDate } = req.body;
      const event = await calendarService.moveCalendarEvent(
        req.params.id,
        newDate,
        req.user._id
      );
      res.json({ success: true, event });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get calendar statistics (tasks by status, priority breakdown)
   */
  async getCalendarStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await calendarService.getCalendarStats(
        req.user._id,
        { startDate, endDate }
      );
      res.json({ success: true, stats });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = calendarController;
