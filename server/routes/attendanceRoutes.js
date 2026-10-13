/**
 * Attendance Routes — CampusFlow AI
 *
 * Dedicated router for Attendly-style attendance system:
 *  - Dashboard & summary overview
 *  - Subject registers & session histories
 *  - Interactive attendance calculator
 *  - Session marking and correction
 *  - Sample university dataset management
 *  - Data source verification
 */

'use strict';

const express = require('express');
const router = express.Router();
const {
  getAttendanceSummary,
  getSubjectRegister,
  calculateAttendanceMetrics,
  getDataSourceStatus,
  handleSampleDataAction,
  markAttendance,
  correctAttendance,
  getAttendanceHistory,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// All attendance routes are protected and scoped to the authenticated student
router.use(protect);

// Dashboard summary & statistics
router.get('/summary', getAttendanceSummary);
router.get('/dashboard', getAttendanceSummary);

// Data source & sync status
router.get('/source-status', getDataSourceStatus);

// Attendance Calculator (target percentage simulator)
router.post('/calculator', calculateAttendanceMetrics);

// Sample dataset toggle (seed/clear) for evaluation
router.post('/sample-data', handleSampleDataAction);

// Quick mark attendance
router.post('/mark', markAttendance);

// Subject-specific register & history
router.get('/subjects/:id/register', getSubjectRegister);
router.get('/subjects/:id/history', getAttendanceHistory);

// Session correction
router.put('/sessions/:sessionId', correctAttendance);

module.exports = router;
