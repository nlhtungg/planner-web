// Task model - OOP, extensible for future integrations
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dueDate: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  estimatedHours: { type: Number, min: 0 },
  loggedHours: { type: Number, min: 0, default: 0 },
  timeEntries: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      hours: { type: Number, min: 0, required: true },
      description: { type: String },
      loggedAt: { type: Date, default: Date.now }
    }
  ],
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: false }, // Optional for personal tasks
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPersonal: { type: Boolean, default: false }, // Flag for personal tasks (no workspace)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for performance
TaskSchema.index({ workspace: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ estimatedHours: 1 });
TaskSchema.index({ loggedHours: 1 });

// Virtual autoProgress (derived from logged/estimated hours)
TaskSchema.virtual('autoProgress').get(function() {
  if (!this.estimatedHours || this.estimatedHours <= 0) return 0;
  const ratio = this.loggedHours / this.estimatedHours;
  return Math.min(100, Math.round(ratio * 100));
});

TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

TaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
