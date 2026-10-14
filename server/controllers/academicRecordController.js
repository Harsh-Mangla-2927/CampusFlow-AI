/**
 * Academic Record Controller — CampusFlow AI
 *
 * Handles HTTP requests for:
 *  - Retrieving official university examination report cards & grade sheets
 *  - Live synchronization of examination records with Code Brigade
 *
 * Security:
 *  - All actions strictly require authenticated JWT student identity.
 *  - Enforces complete student data isolation.
 */

'use strict';

const academicRecordService = require('../services/academicRecordService');
const attendanceService = require('../services/attendanceService');

/**
 * Get Report Card / Grade Card for authenticated student.
 * GET /api/records/report-card  or  GET /api/attendance/report-card
 */
const getReportCard = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const data = await academicRecordService.getReportCard(userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger live synchronization of Report Card with Code Brigade.
 * POST /api/records/report-card/sync  or  POST /api/attendance/report-card/sync
 */
const syncReportCard = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const record = await academicRecordService.syncReportCard(userId);
    const data = await academicRecordService.getReportCard(userId);

    return res.status(200).json({
      success: true,
      message: 'Official university examination report card synchronized successfully.',
      data: {
        record,
        dataSource: data.dataSource,
      },
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

/**
 * Get Unified Academic Records Summary (Attendance + Report Card).
 * GET /api/records
 */
const getAcademicRecords = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const targetThreshold = req.query.threshold ? Number(req.query.threshold) : 75;

    const [attendanceSummary, reportCardData] = await Promise.all([
      attendanceService.getDashboardSummary(userId, targetThreshold),
      academicRecordService.getReportCard(userId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        attendance: attendanceSummary,
        reportCard: reportCardData,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get university circulars and notices.
 * GET /api/records/circulars
 */
const getCirculars = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const data = await academicRecordService.getCirculars(userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReportCard,
  syncReportCard,
  getAcademicRecords,
  getCirculars,
};
