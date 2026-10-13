/**
 * CodeBrigadeSession Model — CampusFlow AI
 *
 * Securely associates Code Brigade / Chalkpad Pro connection metadata
 * with an authenticated CampusFlow AI student user.
 *
 * Security guarantees:
 *  - University passwords are NEVER stored in this collection.
 *  - University API keys and session tokens remain strictly server-side.
 *  - Every session is uniquely bound to the student's CampusFlow User ID.
 */

'use strict';

const mongoose = require('mongoose');

const codeBrigadeSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      trim: true,
      default: '',
    },
    schoolCode: {
      type: String,
      default: '800002', // CUIET Chitkara University
    },
    baseUrl: {
      type: String,
      default: 'https://cuiet.codebrigade.in',
    },
    apiKey: {
      type: String,
      default: '',
    },
    securityToken: {
      type: String,
      default: '',
    },
    deviceUUID: {
      type: String,
      default: '',
    },
    studentId: {
      type: String,
      default: '',
    },
    userId: {
      type: String,
      default: '',
    },
    sessionId: {
      type: String,
      default: '',
    },
    roleId: {
      type: String,
      default: '',
    },
    studentName: {
      type: String,
      default: '',
    },
    rollNumber: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'EXPIRED'],
      default: 'DISCONNECTED',
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastSyncStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'NEVER', 'STALE'],
      default: 'NEVER',
    },
    lastSyncError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CodeBrigadeSession', codeBrigadeSessionSchema);
