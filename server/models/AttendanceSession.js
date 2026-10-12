/**
 * AttendanceSession — CampusFlow AI
 *
 * Records each individual class session for a subject.
 * This enables:
 *  - Attendance history display
 *  - Duplicate prevention per (user, subject, date)
 *  - Correction of past attendance
 *  - Accurate percentage = attendedClasses / totalClasses
 *
 * The Subject model keeps running totals (totalClasses, attendedClasses)
 * which are updated atomically when a session is recorded.
 */

const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['PRESENT', 'ABSENT'],
        message: 'Status must be PRESENT or ABSENT',
      },
      required: [true, 'Attendance status is required'],
    },
    // Optional: topic covered in this class
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    // Track corrections for audit trail
    correctedAt: {
      type: Date,
      default: null,
    },
    correctedFrom: {
      type: String,
      enum: ['PRESENT', 'ABSENT', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: one session per (user, subject, date)
attendanceSessionSchema.index({ user: 1, subject: 1, date: 1 }, { unique: true });

// Format date to YYYY-MM-DD for duplicate checking
attendanceSessionSchema.statics.normalizeDate = function (date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
