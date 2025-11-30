// TaskService - OOP, clean code, ready for future integrations
const taskRepository = require('../repositories/taskRepository');
const workspaceRepository = require('../repositories/workspaceRepository');
const userRepository = require('../repositories/userRepository');
const { computeAutoProgress } = require('../utils/taskUtils');

class TaskService {
  async createTask(data, userId) {
    // Validate workspace exists and user is a member
    const workspace = await workspaceRepository.getWorkspaceById(data.workspace);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    if (!workspace.isMember(userId)) {
      throw new Error('You are not a member of this workspace');
    }
    
    // Validate assignees are members of the workspace
    if (data.assignees && data.assignees.length > 0) {
      for (const assigneeId of data.assignees) {
        if (!workspace.isMember(assigneeId)) {
          throw new Error('All assignees must be members of the workspace');
        }
      }
    }
    
    return await taskRepository.create(data);
  }

  async assignTask(taskId, assigneeId, requesterId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    // Verify requester is a member of the workspace
    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace.isMember(requesterId)) {
      throw new Error('You are not a member of this workspace');
    }
    
    // Verify assignee is a member of the workspace
    if (!workspace.isMember(assigneeId)) {
      throw new Error('Assignee must be a member of the workspace');
    }
    
    if (!task.assignees.includes(assigneeId)) {
      task.assignees.push(assigneeId);
      await task.save();
    }
    return task;
  }

  async assignTaskByIdentifier(taskId, identifier, requesterId) {
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      throw new Error('Identifier is required');
    }
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace || !workspace.isMember(requesterId)) {
      throw new Error('You are not a member of this workspace');
    }

    const user = await userRepository.findByEmailOrUsername(identifier.trim().toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    const assigneeId = user._id.toString();
    if (!workspace.isMember(assigneeId)) {
      throw new Error('Assignee must be a member of the workspace');
    }

    if (!task.assignees.map(a => a.toString()).includes(assigneeId)) {
      task.assignees.push(assigneeId);
      await task.save();
    }
    return task;
  }

  async setDueDate(taskId, dueDate) {
    return await taskRepository.update(taskId, { dueDate });
  }

  async setPriority(taskId, priority) {
    return await taskRepository.update(taskId, { priority });
  }

  async updateProgress(taskId, progress) {
    return await taskRepository.update(taskId, { progress });
  }

  async updateTask(taskId, updates, userId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace.isMember(userId)) throw new Error('You do not have access to this task');
    const role = workspace.getUserRole(userId);
    const isCreator = task.createdBy.toString() === userId.toString();
    const canEdit = isCreator || role === 'owner' || role === 'admin';
    if (!canEdit) throw new Error('You do not have permission to edit this task');

    // If assignees changed, validate membership
    if (updates.assignees) {
      for (const a of updates.assignees) {
        if (!workspace.isMember(a)) throw new Error('All assignees must be members of the workspace');
      }
    }

    // Prevent direct modification of loggedHours/timeEntries via generic update
    delete updates.loggedHours;
    delete updates.timeEntries;

    return await taskRepository.update(taskId, updates);
  }

  async setEstimate(taskId, estimatedHours, userId) {
    if (estimatedHours <= 0) throw new Error('Estimated hours must be greater than zero');
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace.isMember(userId)) throw new Error('You do not have access to this task');
    const role = workspace.getUserRole(userId);
    const isCreator = task.createdBy.toString() === userId.toString();
    if (!(isCreator || role === 'owner' || role === 'admin')) throw new Error('You do not have permission to set estimate');
    return await taskRepository.update(taskId, { estimatedHours });
  }

  async logTime(taskId, hours, description, userId) {
    if (hours <= 0) throw new Error('Logged hours must be greater than zero');
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace.isMember(userId)) throw new Error('You are not a member of this workspace');
    const role = workspace.getUserRole(userId);
    const isOwner = role === 'owner';
    const isAssignee = task.assignees.map(a => a.toString()).includes(userId.toString());
    if (!(isOwner || isAssignee)) throw new Error('Only assignees or workspace owner can log time');

    const updatedTask = await taskRepository.pushTimeEntry(taskId, { user: userId, hours, description });

    // Manual progress override allowed; autoProgress exposed via virtual
    // Optionally could auto-sync if manual progress < autoProgress; requirement says allow override so leave untouched.
    // Return populated task (already populated by repository)
    return updatedTask;
  }

  async getTask(taskId, userId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    // Verify user is a member of the workspace
    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace.isMember(userId)) {
      throw new Error('You do not have access to this task');
    }
    
    return task;
  }

  async getTasks(filter) {
    return await taskRepository.findAll(filter);
  }

  async getTasksByWorkspace(workspaceId, userId) {
    // Verify user is a member of the workspace
    const workspace = await workspaceRepository.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    if (!workspace.isMember(userId)) {
      throw new Error('You are not a member of this workspace');
    }
    
    return await taskRepository.findByWorkspace(workspaceId);
  }

  async deleteTask(taskId, userId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    // Verify user is a member of the workspace and has permission
    const workspace = await workspaceRepository.getWorkspaceById(task.workspace);
    if (!workspace.isMember(userId)) {
      throw new Error('You do not have access to this task');
    }
    
    // Only task creator or workspace admins/owners can delete
    const userRole = workspace.getUserRole(userId);
    if (task.createdBy.toString() !== userId.toString() && 
        userRole !== 'owner' && userRole !== 'admin') {
      throw new Error('You do not have permission to delete this task');
    }
    
    return await taskRepository.delete(taskId);
  }
}

module.exports = new TaskService();
