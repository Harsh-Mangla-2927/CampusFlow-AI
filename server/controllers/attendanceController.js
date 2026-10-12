/**
 * Attendance Controller — CampusFlow AI
 *
 * Implements cumulative attendance tracking:
 *   attendancePercentage = (attendedClasses / totalClasses) * 100
 *
 * Each call to MARK creates an AttendanceSession.
 * The Subject model's totalClasses / attendedClasses are updated atomically.
 * Duplicate sessions (same user + subject + date) are rejected.
 */

const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');

const supportsTransactions = () => {
  const type = mongoose.connection.client?.topology?.description?.type;
  const setName = mongoose.connection.client?.topology?.description?.setName;
  return Boolean(setName) || type === 'ReplicaSetWithPrimary' || type === 'Sharded';
};

/**
 * Mark attendance for a subject on a given date.
 * POST /api/subjects/:id/attendance
 * Body: { status: 'PRESENT' | 'ABSENT', date?: string, topic?: string }
 */
const markAttendance = async (req, res, next) => {
  const hasTx = supportsTransactions();
  let session = null;
  if (hasTx) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const subjectId = req.params.id;
    const userId    = req.user._id;
    const { status, date, topic } = req.body;

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
        message: `Attendance already recorded for this subject on ${sessionDate.toDateString()}. Use the correct endpoint to update it.`,
        existing: { status: existing.status, date: existing.date },
      });
    }

    // Create session record
    let attendanceSession;
    if (hasTx) {
      const created = await AttendanceSession.create(
        [{ user: userId, subject: subjectId, date: sessionDate, status, topic: topic || '' }],
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
    // Duplicate key error from MongoDB unique index
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
 * PUT /api/subjects/:id/attendance/:sessionId
 * Body: { status: 'PRESENT' | 'ABSENT' }
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
    const { status } = req.body;

    if (!status || !['PRESENT', 'ABSENT'].includes(status)) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(400).json({ success: false, message: "Status must be 'PRESENT' or 'ABSENT'." });
    }

    const existingQuery = AttendanceSession.findOne({
      _id: sessionId, user: userId, subject: subjectId,
    });
    const existing = hasTx ? await existingQuery.session(dbSession) : await existingQuery;

    if (!existing) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    if (existing.status === status) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(200).json({ success: true, message: 'Attendance status unchanged.', data: { session: existing } });
    }

    // Update subject totals to reflect the correction
    const subjectQuery = Subject.findOne({ _id: subjectId, user: userId });
    const subject = hasTx ? await subjectQuery.session(dbSession) : await subjectQuery;
    if (!subject) {
      if (hasTx && dbSession) await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const wasPresent = existing.status === 'PRESENT';
    const nowPresent = status === 'PRESENT';

    if (wasPresent && !nowPresent) subject.attendedClasses = Math.max(0, subject.attendedClasses - 1);
    if (!wasPresent && nowPresent) subject.attendedClasses += 1;

    // Store audit info
    existing.correctedFrom = existing.status;
    existing.correctedAt   = new Date();
    existing.status        = status;

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
          _id: subject._id, name: subject.name, code: subject.code,
          totalClasses:     subject.totalClasses,
          attendedClasses:  subject.attendedClasses,
          attendancePercentage: subject.attendancePercentage,
          attendanceStatus:     subject.attendanceStatus,
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
    const limit    = Math.min(parseInt(req.query.limit)  || 30, 100);
    const page     = Math.max(parseInt(req.query.page)   || 1, 1);
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
          _id: subject._id, name: subject.name, code: subject.code,
          totalClasses:     subject.totalClasses,
          attendedClasses:  subject.attendedClasses,
          attendancePercentage: subject.attendancePercentage,
          attendanceStatus:     subject.attendanceStatus,
          attendanceThreshold:  subject.attendanceThreshold,
        },
        sessions,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { markAttendance, correctAttendance, getAttendanceHistory };
