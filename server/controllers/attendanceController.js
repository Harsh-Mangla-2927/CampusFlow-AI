/**
 * Attendance Controller — CampusFlow AI
 *
 * Implements cumulative attendance tracking and Attendly-inspired dashboard APIs:
 *  - Aggregated overall metrics with configurable threshold
 *  - Subject-level cards with conducted/attended/missed metrics
 *  - Subject attendance register (sessions, periods, topics, status)
 *  - Mathematical attendance calculator (classes required & classes can miss)
 *  - Explainable, transparent academic insights
 *  - Data source status and sample dataset toggle for evaluation
 *  - Atomic session recording and correction
 */

'use strict';

const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
const attendanceService = require('../services/attendanceService');
const {
  calculateClassesToAttend,
  calculateClassesCanMiss,
  calculatePercentage,
  safeNumber,
} = require('../utils/attendanceCalculations');

const supportsTransactions = () => {
  const type = mongoose.connection.client?.topology?.description?.type;
  const setName = mongoose.connection.client?.topology?.description?.setName;
  return Boolean(setName) || type === 'ReplicaSetWithPrimary' || type === 'Sharded';
};

/**
 * Get comprehensive Attendly-style attendance summary for the authenticated student.
 * GET /api/attendance/summary?threshold=75
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : 75;

    const summary = await attendanceService.getDashboardSummary(userId, threshold);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed attendance register for a specific subject.
 * GET /api/attendance/subjects/:id/register
 */
const getSubjectRegister = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const subjectId = req.params.id;

    const registerData = await attendanceService.getSubjectRegister(userId, subjectId, req.query);

    res.status(200).json({
      success: true,
      data: registerData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate required classes and allowable missed classes for any attendance parameters.
 * POST /api/attendance/calculator
 * Body: { attended: number, conducted: number, target: number }
 */
const calculateAttendanceMetrics = async (req, res, next) => {
  try {
    const { attended, conducted, target = 75 } = req.body;

    const att = safeNumber(attended, 0);
    const cond = safeNumber(conducted, 0);
    const tgt = safeNumber(target, 75);

    if (cond < 0 || att < 0) {
      return res.status(400).json({
        success: false,
        message: 'Attended and conducted classes cannot be negative numbers.',
      });
    }

    if (att > cond) {
      return res.status(400).json({
        success: false,
        message: 'Attended classes cannot exceed total conducted classes.',
      });
    }

    const currentPercentage = calculatePercentage(att, cond);
    const recovery = calculateClassesToAttend(att, cond, tgt);
    const canMiss = calculateClassesCanMiss(att, cond, tgt);

    res.status(200).json({
      success: true,
      data: {
        attended: att,
        conducted: cond,
        currentPercentage,
        target: tgt,
        recovery,
        canMiss,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get verified data source status.
 * GET /api/attendance/source-status
 */
const getDataSourceStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sampleCount = await Subject.countDocuments({ user: userId, code: /^SMP-/ });

    res.status(200).json({
      success: true,
      data: {
        provider: sampleCount > 0 ? 'SAMPLE_DEMO' : 'CAMPUSFLOW_LOCAL',
        isSampleData: sampleCount > 0,
        providerTitle: sampleCount > 0
          ? 'Sample University Dataset (Active)'
          : 'CampusFlow Local Academic Register',
        securityNotice:
          'No external scraping or unauthorized Code Brigade / Chalkpad credentials are used. Student records are isolated and stored in the secure application database.',
        externalIntegration: {
          available: false,
          serviceName: 'Code Brigade / Chalkpad Pro',
          status: 'OFFICIAL_API_UNAVAILABLE',
          reason: 'University does not provide public developer APIs or OAuth 2.0 authorization endpoints.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle sample dataset for evaluation / testing.
 * POST /api/attendance/sample-data
 * Body: { action: 'seed' | 'clear' }
 */
const handleSampleDataAction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { action = 'seed' } = req.body;

    if (action === 'seed') {
      await attendanceService.seedSampleDataset(userId);
      const summary = await attendanceService.getDashboardSummary(userId);
      return res.status(200).json({
        success: true,
        message: 'Sample university attendance dataset loaded successfully.',
        data: summary,
      });
    } else if (action === 'clear') {
      const result = await attendanceService.clearSampleDataset(userId);
      const summary = await attendanceService.getDashboardSummary(userId);
      return res.status(200).json({
        success: true,
        message: `Cleared ${result.clearedCount} sample subjects.`,
        data: summary,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Supported actions are 'seed' and 'clear'.",
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Mark attendance for a subject on a given date.
 * POST /api/subjects/:id/attendance or POST /api/attendance/mark
 * Body: { subjectId?: string, status: 'PRESENT' | 'ABSENT', date?: string, topic?: string, period?: string }
 */
const markAttendance = async (req, res, next) => {
  const hasTx = supportsTransactions();
  let session = null;
  if (hasTx) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const subjectId = req.params.id || req.body.subjectId;
    const userId    = req.user._id;
    const { status, date, topic, period } = req.body;

    if (!subjectId) {
      if (hasTx && session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required.',
      });
    }

    // Validate input
    if (!status || !['PRESENT', 'ABSENT'].includes(status)) {
      if (hasTx && session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Status must be 'PRESENT' or 'ABSENT'.",
        errors: { status: "Status must be 'PRESENT' or 'ABSENT'." },
      });
    }

    // Resolve subject
    const subjectQuery = Subject.findOne({ _id: subjectId, user: userId });
    const subject = hasTx ? await subjectQuery.session(session) : await subjectQuery;
    if (!subject) {
      if (hasTx && session) await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // Normalise date to midnight local
    const sessionDate = AttendanceSession.normalizeDate(date || new Date());

    // Check duplicate
    const existingQuery = AttendanceSession.findOne({
      user: userId,
      subject: subjectId,
      date: sessionDate,
    });
    const existing = hasTx ? await existingQuery.session(session) : await existingQuery;

    if (existing) {
      if (hasTx && session) await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: `Attendance already recorded for this subject on ${sessionDate.toDateString()}. Use the register to update it.`,
        existing: { status: existing.status, date: existing.date },
      });
    }

    // Create session record
    let attendanceSession;
    if (hasTx) {
      const created = await AttendanceSession.create(
        [{ user: userId, subject: subjectId, date: sessionDate, status, topic: topic || '', period: period || '' }],
        { session }
      );
      attendanceSession = created[0];
    } else {
      attendanceSession = await AttendanceSession.create({
        user: userId,
        subject: subjectId,
        date: sessionDate,
        status,
        topic: topic || '',
        period: period || '',
      });
    }

    // Update subject running totals
    subject.totalClasses += 1;
    if (status === 'PRESENT') subject.attendedClasses += 1;

    if (hasTx) {
      await subject.save({ session });
      await session.commitTransaction();
    } else {
      await subject.save();
    }

    res.status(201).json({
      success: true,
      message: `Attendance marked as ${status}.`,
      data: {
        session: attendanceSession,
        subject: {
          _id:              subject._id,
          name:             subject.name,
          code:             subject.code,
          totalClasses:     subject.totalClasses,
          attendedClasses:  subject.attendedClasses,
          attendancePercentage: subject.attendancePercentage,
          attendanceStatus:     subject.attendanceStatus,
        },
      },
    });
  } catch (error) {
    if (hasTx && session) {
      try { await session.abortTransaction(); } catch {}
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already recorded for this subject on the selected date.',
      });
    }
    next(error);
  } finally {
    if (session) {
      try { session.endSession(); } catch {}
    }
  }
};

/**
 * Correct an existing attendance session.
 * PUT /api/subjects/:id/attendance/:sessionId or PUT /api/attendance/sessions/:sessionId
 * Body: { status: 'PRESENT' | 'ABSENT', topic?: string, period?: string }
 */
const correctAttendance = async (req, res, next) => {
  const hasTx = supportsTransactions();
  let dbSession = null;
  if (hasTx) {
    dbSession = await mongoose.startSession();
    dbSession.startTransaction();
  }

  try {
    const { id: subjectId, sessionId } = req.params;
    const userId = req.user._id;
    const { status, topic, period } = req.body;

    if (!status || !['PRESENT', 'ABSENT'].includes(status)) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(400).json({ success: false, message: "Status must be 'PRESENT' or 'ABSENT'." });
    }

    const query = { _id: sessionId, user: userId };
    if (subjectId) query.subject = subjectId;

    const existingQuery = AttendanceSession.findOne(query);
    const existing = hasTx ? await existingQuery.session(dbSession) : await existingQuery;

    if (!existing) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    const resolvedSubjectId = existing.subject;
    const subjectQuery = Subject.findOne({ _id: resolvedSubjectId, user: userId });
    const subject = hasTx ? await subjectQuery.session(dbSession) : await subjectQuery;
    if (!subject) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const wasPresent = existing.status === 'PRESENT';
    const nowPresent = status === 'PRESENT';

    if (wasPresent && !nowPresent) {
      subject.attendedClasses = Math.max(0, subject.attendedClasses - 1);
    }
    if (!wasPresent && nowPresent) {
      subject.attendedClasses += 1;
    }

    if (topic !== undefined) existing.topic = topic;
    if (period !== undefined) existing.period = period;

    if (existing.status !== status) {
      existing.correctedFrom = existing.status;
      existing.correctedAt   = new Date();
      existing.status        = status;
    }

    if (hasTx) {
      await existing.save({ session: dbSession });
      await subject.save({ session: dbSession });
      await dbSession.commitTransaction();
    } else {
      await existing.save();
      await subject.save();
    }

    res.status(200).json({
      success: true,
      message: 'Attendance corrected successfully.',
      data: {
        session: existing,
        subject: {
          _id: subject._id,
          name: subject.name,
          code: subject.code,
          totalClasses: subject.totalClasses,
          attendedClasses: subject.attendedClasses,
          attendancePercentage: subject.attendancePercentage,
          attendanceStatus: subject.attendanceStatus,
        },
      },
    });
  } catch (error) {
    if (hasTx && dbSession) {
      try { await dbSession.abortTransaction(); } catch {}
    }
    next(error);
  } finally {
    if (dbSession) {
      try { dbSession.endSession(); } catch {}
    }
  }
};

/**
 * Get attendance history for a subject.
 * GET /api/subjects/:id/attendance?limit=30&page=1
 */
const getAttendanceHistory = async (req, res, next) => {
  try {
    const { id: subjectId } = req.params;
    const userId   = req.user._id;
    const limit    = Math.min(parseInt(req.query.limit, 10)  || 30, 100);
    const page     = Math.max(parseInt(req.query.page, 10)   || 1, 1);
    const skip     = (page - 1) * limit;

    const subject = await Subject.findOne({ _id: subjectId, user: userId });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const [sessions, total] = await Promise.all([
      AttendanceSession.find({ user: userId, subject: subjectId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendanceSession.countDocuments({ user: userId, subject: subjectId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        subject: {
          _id: subject._id,
          name: subject.name,
          code: subject.code,
          totalClasses: subject.totalClasses,
          attendedClasses: subject.attendedClasses,
          attendancePercentage: subject.attendancePercentage,
          attendanceStatus: subject.attendanceStatus,
          attendanceThreshold: subject.attendanceThreshold,
        },
        sessions,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendanceSummary,
  getSubjectRegister,
  calculateAttendanceMetrics,
  getDataSourceStatus,
  handleSampleDataAction,
  markAttendance,
  correctAttendance,
  getAttendanceHistory,
};
