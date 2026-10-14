/**
 * Academic Record Routes — CampusFlow AI
 *
 * REST API endpoints for unified academic records and examination report cards.
 * All routes are protected by JWT authentication.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getReportCard,
  syncReportCard,
  getAcademicRecords,
  getCirculars,
} = require('../controllers/academicRecordController');

// All academic record routes require authentication
router.use(protect);

// Unified academic records (attendance + report card)
router.get('/', getAcademicRecords);

// Report card / examination results
router.get('/report-card', getReportCard);
router.post('/report-card/sync', syncReportCard);

// University circulars & official notices
router.get('/circulars', getCirculars);

module.exports = router;
