const mongoose = require('mongoose');

const postCommentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment content cannot exceed 2000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
postCommentSchema.index({ post: 1, createdAt: -1 });
postCommentSchema.index({ author: 1 });
postCommentSchema.index({ post: 1, isActive: 1 });

// Static method to find comments by post
postCommentSchema.statics.findByPost = function(postId) {
  return this.find({ 
    post: postId,
    isActive: true 
  })
    .populate('author', 'firstName lastName email avatar')
    .sort({ createdAt: 1 }); // Oldest first for conversation flow
};

// Static method to count comments by post
postCommentSchema.statics.countByPost = function(postId) {
  return this.countDocuments({ 
    post: postId,
    isActive: true 
  });
};

// Method to check if user can edit/delete this comment
postCommentSchema.methods.canModify = function(userId) {
  const authorId = this.author._id || this.author;
  return authorId.toString() === userId.toString();
};

module.exports = mongoose.model('PostComment', postCommentSchema);
