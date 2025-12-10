// calendarService.js - Calendar business logic
const taskRepository = require('../repositories/taskRepository');
const workspaceRepository = require('../repositories/workspaceRepository');

class CalendarService {
  /**
   * Get calendar events (tasks) for a user
   * Filters by date range, workspace, priority, status
   */
  async getCalendarEvents(userId, filters = {}) {
    const { startDate, endDate, workspace, priority, status } = filters;

    // Get user's workspaces
    const userWorkspaces = await workspaceRepository.getWorkspacesByUser(userId);
    const workspaceIds = userWorkspaces.map(w => w._id.toString());

    // Build query
    const query = {
      $or: [
        { isPersonal: true, createdBy: userId }, // Personal tasks
        { workspace: { $in: workspaceIds } } // Workspace tasks
      ]
    };

    // Filter by date range (tasks with dueDate)
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    } else {
      // Only return tasks with dueDate (calendar events must have dates)
      query.dueDate = { $exists: true, $ne: null };
    }

    // Filter by specific workspace
    if (workspace) {
      if (workspace === 'personal') {
        query.$or = [{ isPersonal: true, createdBy: userId }];
      } else {
        query.$or = [{ workspace: workspace }];
      }
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const tasks = await taskRepository.findAll(query);

    // Transform tasks to calendar event format
    return tasks.map(task => this.transformToCalendarEvent(task));
  }

  /**
   * Create a calendar event (task with dueDate required)
   */
  async createCalendarEvent(eventData, userId) {
    // Validate dueDate is provided
    if (!eventData.dueDate) {
      throw new Error('Calendar events must have a due date');
    }

    // Validate workspace if provided
    if (eventData.workspace) {
      const workspace = await workspaceRepository.getWorkspaceById(eventData.workspace);
      if (!workspace) throw new Error('Workspace not found');
      if (!workspace.isMember(userId)) {
        throw new Error('You are not a member of this workspace');
      }
    } else {
      // Personal calendar event
      eventData.isPersonal = true;
    }

    const task = await taskRepository.create(eventData);
    return this.transformToCalendarEvent(task);
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(eventId, updates, userId) {
    const task = await taskRepository.findById(eventId);
    if (!task) throw new Error('Event not found');

    // Check permissions
    const taskCreatorId = task.createdBy?._id ? task.createdBy._id.toString() : task.createdBy.toString();
    
    if (task.isPersonal || !task.workspace) {
      const isCreator = taskCreatorId === userId.toString();
      if (!isCreator) throw new Error('You do not have permission to edit this event');
    } else {
      const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
      if (!workspace) throw new Error('Workspace not found');
      if (!workspace.isMember(userId)) throw new Error('You do not have access to this event');
      const role = workspace.getUserRole(userId);
      const isCreator = taskCreatorId === userId.toString();
      const canEdit = isCreator || role === 'owner' || role === 'admin';
      if (!canEdit) throw new Error('You do not have permission to edit this event');
    }

    const updatedTask = await taskRepository.update(eventId, updates);
    return this.transformToCalendarEvent(updatedTask);
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(eventId, userId) {
    const task = await taskRepository.findById(eventId);
    if (!task) throw new Error('Event not found');

    // Check permissions
    const taskCreatorId = task.createdBy?._id ? task.createdBy._id.toString() : task.createdBy.toString();
    
    if (task.isPersonal || !task.workspace) {
      if (taskCreatorId !== userId.toString()) {
        throw new Error('You do not have permission to delete this event');
      }
    } else {
      const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
      if (!workspace.isMember(userId)) throw new Error('You do not have access to this event');
      const userRole = workspace.getUserRole(userId);
      if (taskCreatorId !== userId.toString() && 
          userRole !== 'owner' && userRole !== 'admin') {
        throw new Error('You do not have permission to delete this event');
      }
    }

    await taskRepository.delete(eventId);
  }

  /**
   * Move event to a different date (drag & drop)
   */
  async moveCalendarEvent(eventId, newDate, userId) {
    return await this.updateCalendarEvent(eventId, { dueDate: newDate }, userId);
  }

  /**
   * Get calendar statistics
   */
  async getCalendarStats(userId, filters = {}) {
    const events = await this.getCalendarEvents(userId, filters);

    // Calculate statistics
    const stats = {
      total: events.length,
      byStatus: {
        todo: events.filter(e => e.status === 'todo').length,
        'in-progress': events.filter(e => e.status === 'in-progress').length,
        done: events.filter(e => e.status === 'done').length
      },
      byPriority: {
        low: events.filter(e => e.priority === 'low').length,
        medium: events.filter(e => e.priority === 'medium').length,
        high: events.filter(e => e.priority === 'high').length
      },
      personal: events.filter(e => e.isPersonal).length,
      workspace: events.filter(e => !e.isPersonal).length,
      overdue: events.filter(e => 
        new Date(e.dueDate) < new Date() && e.status !== 'done'
      ).length
    };

    return stats;
  }

  /**
   * Transform task to calendar event format
   */
  transformToCalendarEvent(task) {
    return {
      id: task._id,
      title: task.title,
      description: task.description,
      start: task.dueDate,
      end: task.dueDate,
      allDay: true,
      priority: task.priority,
      status: task.status,
      workspace: task.workspace,
      isPersonal: task.isPersonal || false,
      createdBy: task.createdBy,
      assignees: task.assignees || [],
      // Include full task object for additional data
      resource: task
    };
  }
}

module.exports = new CalendarService();
