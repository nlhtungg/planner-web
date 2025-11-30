const Workspace = require('../models/Workspace');

class WorkspaceRepository {
  // Create a new workspace
  async createWorkspace(workspaceData) {
    try {
      const workspace = new Workspace(workspaceData);
      await workspace.save();
      return await workspace.populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'members.user', select: 'firstName lastName email avatar' }
      ]);
    } catch (error) {
      throw error;
    }
  }

  // Get workspace by ID
  async getWorkspaceById(workspaceId) {
    try {
      const workspace = await Workspace.findById(workspaceId)
        .populate('owner', 'firstName lastName email avatar')
        .populate('members.user', 'firstName lastName email avatar');
      return workspace;
    } catch (error) {
      throw error;
    }
  }

  // Get workspaces by user (owner or member)
  async getWorkspacesByUser(userId) {
    try {
      const workspaces = await Workspace.findByUser(userId);
      return workspaces;
    } catch (error) {
      throw error;
    }
  }

  // Get all workspaces available to user (member + public)
  async getAvailableWorkspaces(userId) {
    try {
      const workspaces = await Workspace.findAvailableToUser(userId);
      return workspaces;
    } catch (error) {
      throw error;
    }
  }

  // Update workspace
  async updateWorkspace(workspaceId, updateData) {
    try {
      const workspace = await Workspace.findByIdAndUpdate(
        workspaceId,
        { ...updateData, lastActivity: new Date() },
        { new: true, runValidators: true }
      ).populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'members.user', select: 'firstName lastName email avatar' }
      ]);
      return workspace;
    } catch (error) {
      throw error;
    }
  }

  // Delete workspace (soft delete)
  async deleteWorkspace(workspaceId) {
    try {
      const workspace = await Workspace.findByIdAndUpdate(
        workspaceId,
        { isActive: false },
        { new: true }
      );
      return workspace;
    } catch (error) {
      throw error;
    }
  }

  // Add member to workspace
  async addMember(workspaceId, userId, role = 'member') {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check if user is already a member
      const existingMember = workspace.members.find(member => 
        member.user.toString() === userId.toString()
      );

      if (existingMember) {
        throw new Error('User is already a member of this workspace');
      }

      // Add new member
      workspace.members.push({
        user: userId,
        role: role,
        joinedAt: new Date()
      });

      workspace.lastActivity = new Date();
      await workspace.save();

      return await workspace.populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'members.user', select: 'firstName lastName email avatar' }
      ]);
    } catch (error) {
      throw error;
    }
  }

  // Remove member from workspace
  async removeMember(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Cannot remove the owner
      if (workspace.owner.toString() === userId.toString()) {
        throw new Error('Cannot remove the workspace owner');
      }

      // Remove member
      workspace.members = workspace.members.filter(member => 
        member.user.toString() !== userId.toString()
      );

      workspace.lastActivity = new Date();
      await workspace.save();

      return await workspace.populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'members.user', select: 'firstName lastName email avatar' }
      ]);
    } catch (error) {
      throw error;
    }
  }

  // Update member role
  async updateMemberRole(workspaceId, userId, newRole) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Cannot change owner's role
      if (workspace.owner.toString() === userId.toString()) {
        throw new Error('Cannot change the owner\'s role');
      }

      // Find and update member role
      const member = workspace.members.find(member => 
        member.user.toString() === userId.toString()
      );

      if (!member) {
        throw new Error('User is not a member of this workspace');
      }

      member.role = newRole;
      workspace.lastActivity = new Date();
      await workspace.save();

      return await workspace.populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'members.user', select: 'firstName lastName email avatar' }
      ]);
    } catch (error) {
      throw error;
    }
  }

  // Get workspace statistics
  async getWorkspaceStats(workspaceId) {
    try {
      const workspace = await this.getWorkspaceById(workspaceId);
      if (!workspace) {
        return null;
      }

      return {
        memberCount: workspace.memberCount,
        roles: workspace.members.reduce((acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        }, {}),
        lastActivity: workspace.lastActivity,
        createdAt: workspace.createdAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Fuzzy search members inside a workspace (case-insensitive partial match)
  async searchMembers(workspaceId, query, limit = 10) {
    try {
      const workspace = await Workspace.findById(workspaceId)
        .select('members isActive')
        .populate('members.user', 'firstName lastName email username avatar');

      if (!workspace || !workspace.isActive) {
        return [];
      }

      const trimmed = (query || '').trim();
      if (trimmed.length === 0) {
        // Return first N members if no query provided
        return workspace.members.slice(0, limit).map(m => ({
          _id: m.user._id,
          displayName: `${m.user.firstName} ${m.user.lastName}`.trim(),
          email: m.user.email,
          username: m.user.username || null,
          avatar: m.user.avatar || null,
          role: m.role
        }));
      }

      const regex = new RegExp(trimmed, 'i');
      const matched = workspace.members.filter(m => {
        const u = m.user;
        return regex.test(u.firstName) ||
               regex.test(u.lastName) ||
               regex.test(u.email) ||
               (u.username && regex.test(u.username));
      }).slice(0, limit).map(m => ({
        _id: m.user._id,
        displayName: `${m.user.firstName} ${m.user.lastName}`.trim(),
        email: m.user.email,
        username: m.user.username || null,
        avatar: m.user.avatar || null,
        role: m.role
      }));

      return matched;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new WorkspaceRepository();