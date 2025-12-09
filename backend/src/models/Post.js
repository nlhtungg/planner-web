const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    trim: true,
    maxlength: [5000, 'Post content cannot exceed 5000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
postSchema.index({ workspace: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ workspace: 1, isActive: 1 });

// Static method to find posts by workspace
postSchema.statics.findByWorkspace = function(workspaceId) {
  return this.find({ 
    workspace: workspaceId,
    isActive: true 
  })
    .populate('author', 'firstName lastName email avatar')
    .sort({ createdAt: -1 });
};

// Method to check if user can edit/delete this post
postSchema.methods.canModify = function(userId) {
  const authorId = this.author._id || this.author;
  return authorId.toString() === userId.toString();
};

module.exports = mongoose.model('Post', postSchema);
