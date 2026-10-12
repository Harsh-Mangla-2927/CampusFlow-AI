const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Study plan title is required'],
      trim: true,
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    availableHoursPerDay: {
      type: Number,
      required: [true, 'Available study hours per day is required'],
      min: [0.5, 'Must have at least 0.5 hours per day'],
      max: [16, 'Cannot exceed 16 hours per day'],
    },
    topics: [
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
    // Generated daily schedule by the study planner service
    schedule: [
      {
        day: { type: Number, required: true },
        date: { type: Date, required: true },
        topic: { type: String, required: true },
        sessionType: {
          type: String,
          enum: ['Study', 'Revision', 'Practice', 'Mock Test'],
          default: 'Study',
        },
        hoursPlanned: { type: Number, default: 2 },
        completed: { type: Boolean, default: false },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
