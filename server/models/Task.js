const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['Assignment', 'Lab', 'Project', 'Quiz', 'Exam Preparation', 'Other'],
      required: [true, 'Task type is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    estimatedHours: {
      type: Number,
      required: [true, 'Estimated effort in hours is required'],
      min: [0.5, 'Estimated hours must be at least 0.5'],
      max: [100, 'Estimated hours cannot exceed 100'],
    },
    academicWeight: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    // Computed by priority engine — stored for quick reads
    priorityScore: {
      type: Number,
      default: 0,
    },
    priorityLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    priorityExplanation: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: days until deadline
taskSchema.virtual('daysUntilDeadline').get(function () {
  const now = new Date();
  const diff = this.deadline - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual: is overdue
taskSchema.virtual('isOverdue').get(function () {
  return this.deadline < new Date() && this.status !== 'Completed';
});

module.exports = mongoose.model('Task', taskSchema);
