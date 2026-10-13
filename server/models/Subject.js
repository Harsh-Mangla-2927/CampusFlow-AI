const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    teacher: {
      type: String,
      trim: true,
      default: '',
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [1, 'Credits must be at least 1'],
      max: [6, 'Credits cannot exceed 6'],
    },
    // Attendance tracking
    totalClasses: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendedClasses: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendanceThreshold: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },
    // Marks tracking
    currentMarks: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    targetMarks: {
      type: Number,
      default: 75,
      min: 0,
      max: 100,
    },
    // Performance history for trend detection
    marksHistory: [
      {
        score: { type: Number, required: true },
        assessmentName: { type: String, default: 'Assessment' },
        date: { type: Date, default: Date.now },
      },
    ],
    color: {
      type: String,
      default: '#6366f1',
    },
    source: {
      type: String,
      enum: ['LOCAL', 'CODE_BRIGADE', 'SAMPLE'],
      default: 'LOCAL',
    },
    fromDate: {
      type: String,
      default: '',
    },
    toDate: {
      type: String,
      default: '',
    },
    dutyLeave: {
      type: Number,
      default: 0,
    },
    medicalLeave: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: attendance percentage
subjectSchema.virtual('attendancePercentage').get(function () {
  if (this.totalClasses === 0) return 0;
  return Math.round((this.attendedClasses / this.totalClasses) * 100);
});

// Virtual: attendance status
subjectSchema.virtual('attendanceStatus').get(function () {
  const pct = this.attendancePercentage;
  const threshold = this.attendanceThreshold;
  if (pct >= threshold + 5) return 'SAFE';
  if (pct >= threshold) return 'WARNING';
  return 'CRITICAL';
});

// Virtual: classes needed to reach threshold
subjectSchema.virtual('classesNeededForThreshold').get(function () {
  const threshold = this.attendanceThreshold / 100;
  const needed = Math.ceil(
    (threshold * this.totalClasses - this.attendedClasses) / (1 - threshold)
  );
  return needed > 0 ? needed : 0;
});

module.exports = mongoose.model('Subject', subjectSchema);
