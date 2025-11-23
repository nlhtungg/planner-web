const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: [100, 'Workspace name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Workspace owner is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  color: {
    type: String,
    default: '#3B82F6', // Default blue color
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    defaultRole: {
      type: String,
      enum: ['member', 'viewer'],
      default: 'member'
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for performance
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ name: 1, owner: 1 });
workspaceSchema.index({ isActive: 1 });

// Pre-save middleware to add owner as a member with owner role
workspaceSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add owner as a member with owner role
    const ownerMember = {
      user: this.owner,
      role: 'owner',
      joinedAt: new Date()
    };
    
    // Check if owner is not already in members array
    const existingOwner = this.members.find(member => 
      member.user.toString() === this.owner.toString()
    );
    
    if (!existingOwner) {
      this.members.push(ownerMember);
    }
  }
  next();
});

// Virtual for member count
workspaceSchema.virtual('memberCount').get(function() {
  return this.members ? Math.max(this.members.length, 1) : 1;
});

// Method to check if user is a member
workspaceSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString()
  );
};

// Method to get user's role in workspace
workspaceSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Method to check if user can manage workspace (owner or admin)
workspaceSchema.methods.canManage = function(userId) {
  const role = this.getUserRole(userId);
  return role === 'owner' || role === 'admin';
};

// Static method to find workspaces by user
workspaceSchema.statics.findByUser = function(userId) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      }
    ]
  }).populate('owner', 'firstName lastName email avatar')
    .populate('members.user', 'firstName lastName email avatar')
    .sort({ lastActivity: -1 });
};

// Method to update last activity
workspaceSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Workspace', workspaceSchema);