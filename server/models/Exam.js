const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    name: {
      type: String,
      required: [true, 'Exam name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    syllabus: [
      {
        type: String,
        trim: true,
      },
    ],
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    targetScore: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },
    totalMarks: {
      type: Number,
      default: 100,
    },
    duration: {
      type: Number, // Duration in minutes
      default: 180,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Completed'],
      default: 'Upcoming',
    },
    actualScore: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: days until exam
examSchema.virtual('daysUntilExam').get(function () {
  const now = new Date();
  const diff = this.date - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Exam', examSchema);
