/**
 * AcademicRecord Model — CampusFlow AI
 *
 * Persists verified university examination grade cards and report card records,
 * bound strictly to the authenticated student's User ID.
 *
 * Distinguishes official imported Code Brigade data from manual student records.
 */

'use strict';

const mongoose = require('mongoose');

const subjectGradeSchema = new mongoose.Schema(
  {
    sNo: { type: Number },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    credits: { type: Number, required: true, default: 0 },
    grade: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: ['PASS', 'FAIL'], default: 'PASS' },
  },
  { _id: false }
);

const semesterRecordSchema = new mongoose.Schema(
  {
    semester: { type: String, required: true, trim: true }, // e.g. "1 SEM", "2 SEM"
    sgpa: { type: Number, default: null },
    cgpa: { type: Number, default: null },
    totalCredits: { type: Number, default: 0 },
    subjects: [subjectGradeSchema],
  },
  { _id: false }
);

const academicRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    studentName: { type: String, trim: true, default: '' },
    rollNumber: { type: String, trim: true, default: '' },
    fatherName: { type: String, trim: true, default: '' },
    motherName: { type: String, trim: true, default: '' },
    className: { type: String, trim: true, default: '' },
    semesters: [semesterRecordSchema],
    summary: {
      totalSemesters: { type: Number, default: 0 },
      latestCgpa: { type: Number, default: null },
      latestSgpa: { type: Number, default: null },
      totalCreditsEarned: { type: Number, default: 0 },
    },
    officialNotes: [{ type: String, trim: true }],
    source: {
      type: String,
      enum: ['CODE_BRIGADE', 'MANUAL'],
      default: 'CODE_BRIGADE',
    },
    title: { type: String, default: 'Grade Card' },
    lastSyncedAt: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ['SYNCED', 'EMPTY', 'FAILED', 'NOT_CONNECTED'],
      default: 'NOT_CONNECTED',
    },
    syncMessage: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
