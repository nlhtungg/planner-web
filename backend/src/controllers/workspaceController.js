const workspaceRepository = require('../repositories/workspaceRepository');
const User = require('../models/User');
const { 
  validateWorkspace, 
  validateWorkspaceUpdate, 
  validateAddMember, 
  validateUpdateMemberRole 
} = require('../utils/validation');

class WorkspaceController {
  // Create a new workspace
  async createWorkspace(req, res) {
    try {
      // Validate input data
      const { error } = validateWorkspace(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { name, description, color, settings } = req.body;
      const userId = req.user._id || req.user.id;

      // Create workspace data
      const workspaceData = {
        name: name.trim(),
        description: description?.trim() || '',
        owner: userId,
        color: color || '#3B82F6',
        settings: {
          isPublic: settings?.isPublic || false,
          allowMemberInvites: settings?.allowMemberInvites !== false,
          defaultRole: settings?.defaultRole || 'member'
        }
      };

      const workspace = await workspaceRepository.createWorkspace(workspaceData);

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspace
      });
    } catch (error) {
      console.error('Create workspace error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get all workspaces for current user
  async getMyWorkspaces(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const includePublic = req.query.includePublic === 'true';
      
      const workspaces = includePublic 
        ? await workspaceRepository.getAvailableWorkspaces(userId)
        : await workspaceRepository.getWorkspacesByUser(userId);

      res.status(200).json({
        success: true,
        message: 'Workspaces retrieved successfully',
        data: workspaces
      });
    } catch (error) {
      console.error('Get workspaces error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get workspace by ID
  async getWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user has access to this workspace
      console.log('getWorkspace Debug:');
      console.log('userId:', userId);
      console.log('workspace.owner:', workspace.owner);
      console.log('workspace.members:', workspace.members.map(m => ({ user: m.user, role: m.role })));
      console.log('isMember result:', workspace.isMember(userId));
      const ownerIdString = (workspace.owner._id || workspace.owner).toString();
      console.log('isOwner:', ownerIdString === userId.toString());
      
      // Check if user is the owner or is a member
      const isOwner = ownerIdString === userId.toString();
      const isMember = workspace.isMember(userId);
      
      if (!isOwner && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this workspace'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Workspace retrieved successfully',
        data: workspace
      });
    } catch (error) {
      console.error('Get workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update workspace
  async updateWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const { name, description, color, settings } = req.body;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user can manage this workspace (owner or admin)
      const isOwner = workspace.owner._id.toString() === userId.toString();
      const canManage = isOwner || workspace.canManage(userId);
      
      if (!canManage) {
        console.log('Permission check failed:', {
          userId: userId.toString(),
          ownerId: workspace.owner._id.toString(),
          isOwner,
          userRole: workspace.getUserRole(userId),
          membersCount: workspace.members ? workspace.members.length : 0
        });
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update this workspace'
        });
      }

      // Validate name if provided
      if (name !== undefined && (!name || name.trim().length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Workspace name cannot be empty'
        });
      }

      if (name && name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Workspace name cannot exceed 100 characters'
        });
      }

      // Prepare update data
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (color !== undefined) updateData.color = color;
      if (settings !== undefined) {
        updateData.settings = {
          ...workspace.settings,
          ...settings
        };
      }

      const updatedWorkspace = await workspaceRepository.updateWorkspace(workspaceId, updateData);

      res.status(200).json({
        success: true,
        message: 'Workspace updated successfully',
        data: updatedWorkspace
      });
    } catch (error) {
      console.error('Update workspace error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Delete workspace
  async deleteWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Only owner can delete workspace
      if (workspace.owner._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only workspace owner can delete the workspace'
        });
      }

      await workspaceRepository.deleteWorkspace(workspaceId);

      res.status(200).json({
        success: true,
        message: 'Workspace deleted successfully'
      });
    } catch (error) {
      console.error('Delete workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add member to workspace
  async addMember(req, res) {
    try {
      const { workspaceId } = req.params;
      const { email, role = 'member' } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate input
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user can manage this workspace
      if (!workspace.canManage(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to add members'
        });
      }

      // Find user by email
      const userToAdd = await User.findOne({ email: email.toLowerCase() });
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }

      const updatedWorkspace = await workspaceRepository.addMember(workspaceId, userToAdd._id, role);

      res.status(200).json({
        success: true,
        message: 'Member added successfully',
        data: updatedWorkspace
      });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Remove member from workspace
  async removeMember(req, res) {
    try {
      const { workspaceId, memberId } = req.params;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user can manage this workspace or is removing themselves
      if (!workspace.canManage(userId) && userId !== memberId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to remove members'
        });
      }

      const updatedWorkspace = await workspaceRepository.removeMember(workspaceId, memberId);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
        data: updatedWorkspace
      });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Join a public workspace
  async joinWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if workspace is public
      if (!workspace.settings?.isPublic) {
        return res.status(403).json({
          success: false,
          message: 'This workspace is private. You need an invitation to join.'
        });
      }

      // Check if user is already a member
      if (workspace.isMember(userId)) {
        return res.status(400).json({
          success: false,
          message: 'You are already a member of this workspace'
        });
      }

      const updatedWorkspace = await workspaceRepository.addMember(workspaceId, userId, 'member');

      res.status(200).json({
        success: true,
        message: 'Successfully joined the workspace',
        data: updatedWorkspace
      });
    } catch (error) {
      console.error('Join workspace error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Update member role
  async updateMemberRole(req, res) {
    try {
      const { workspaceId, memberId } = req.params;
      const { role } = req.body;
      const userId = req.user._id || req.user.id;

      // Validate role
      if (!['admin', 'member'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin or member'
        });
      }

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Only owner can update member roles
      if (workspace.owner._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only workspace owner can update member roles'
        });
      }

      const updatedWorkspace = await workspaceRepository.updateMemberRole(workspaceId, memberId, role);

      res.status(200).json({
        success: true,
        message: 'Member role updated successfully',
        data: updatedWorkspace
      });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get workspace statistics
  async getWorkspaceStats(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user has access to this workspace
      if (!workspace.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this workspace'
        });
      }

      const stats = await workspaceRepository.getWorkspaceStats(workspaceId);

      res.status(200).json({
        success: true,
        message: 'Workspace statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get workspace stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Fuzzy search members within a workspace (Jira-style user picker backend)
  async searchMembers(req, res) {
    try {
      const { workspaceId } = req.params;
      const { q, limit = 10 } = req.query;
      const userId = req.user._id || req.user.id;

      const workspace = await workspaceRepository.getWorkspaceById(workspaceId);
      if (!workspace || !workspace.isActive) {
        return res.status(404).json({ success: false, message: 'Workspace not found' });
      }

      // Access control: must be member or owner
      const isOwner = (workspace.owner._id || workspace.owner).toString() === userId.toString();
      const isMember = workspace.isMember(userId);
      if (!isOwner && !isMember) {
        return res.status(403).json({ success: false, message: 'Access denied to this workspace' });
      }

      // Basic validation: require at least 2 chars for query (unless empty for initial list)
      if (q && q.trim().length > 0 && q.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
      }

      const numericLimit = Math.min(parseInt(limit) || 10, 50);
      const results = await workspaceRepository.searchMembers(workspaceId, q, numericLimit);

      return res.status(200).json({
        success: true,
        message: 'Members search completed',
        data: results,
        meta: { count: results.length, limit: numericLimit, query: q || '' }
      });
    } catch (error) {
      console.error('Search members error:', error);
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }
}

module.exports = new WorkspaceController();