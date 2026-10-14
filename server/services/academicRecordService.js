/**
 * Academic Record Service — CampusFlow AI
 *
 * Implements retrieval, parsing, synchronization, and persistence of
 * verified Chitkara University examination grade cards & report cards.
 *
 * Security & Isolation:
 *  - All queries are scoped strictly by authenticated userId.
 *  - Reuses the existing legitimate server-side CodeBrigadeSession.
 *  - Distinguishes official imported university data from manual inputs.
 */

'use strict';

const AcademicRecord = require('../models/AcademicRecord');
const CodeBrigadeSession = require('../models/CodeBrigadeSession');
const codeBrigadeConnector = require('./codeBrigadeConnector');

/**
 * Get the academic report card / examination records for the authenticated student.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<Object>}
 */
async function getReportCard(userId) {
  // 1. Check Code Brigade connection status
  const cbSession = await CodeBrigadeSession.findOne({ user: userId }).lean();
  const isConnected = !!(
    cbSession &&
    cbSession.status !== 'DISCONNECTED' &&
    cbSession.apiKey &&
    cbSession.sessionId
  );

  // 2. Fetch stored academic record
  let record = await AcademicRecord.findOne({ user: userId }).lean();

  // If no record exists yet, but the student is connected to Code Brigade,
  // attempt an initial live sync transparently
  if (!record && isConnected) {
    try {
      record = await syncReportCard(userId);
    } catch (syncErr) {
      console.warn('[AcademicRecord Service] Auto-sync initial load notice:', syncErr.message);
    }
  }

  return {
    record: record || null,
    dataSource: {
      provider: 'CODE_BRIGADE',
      providerName: 'Chitkara University / Code Brigade',
      isConnected,
      studentName: cbSession?.studentName || record?.studentName || '',
      rollNumber: cbSession?.rollNumber || record?.rollNumber || '',
      className: cbSession?.className || record?.className || '',
      lastSyncedAt: record?.lastSyncedAt || cbSession?.lastSyncedAt || null,
      syncStatus: record?.syncStatus || (isConnected ? 'NOT_SYNCED' : 'NOT_CONNECTED'),
      syncMessage: record?.syncMessage || '',
    },
  };
}

/**
 * Synchronize live university report card / grade card from Code Brigade.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<Object>}
 */
async function syncReportCard(userId) {
  const session = await CodeBrigadeSession.findOne({ user: userId });
  if (!session || session.status === 'DISCONNECTED') {
    const error = new Error('No university account connected. Please connect Code Brigade first.');
    error.statusCode = 400;
    throw error;
  }

  try {
    const parsed = await codeBrigadeConnector.fetchReportCard(session);

    let record = await AcademicRecord.findOne({ user: userId });
    if (!record) {
      record = new AcademicRecord({ user: userId });
    }

    if (parsed.empty) {
      record.syncStatus = 'EMPTY';
      record.syncMessage = parsed.message || 'No official examination report card declared yet.';
      record.lastSyncedAt = new Date();
      record.source = 'CODE_BRIGADE';
      await record.save();
      return record.toObject();
    }

    record.studentName = parsed.studentName || session.studentName || record.studentName || '';
    record.rollNumber = parsed.rollNumber || session.rollNumber || record.rollNumber || '';
    record.className = parsed.className || session.className || record.className || '';
    record.fatherName = parsed.fatherName || record.fatherName || '';
    record.motherName = parsed.motherName || record.motherName || '';
    record.semesters = parsed.semesters || [];
    record.summary = parsed.summary || {
      totalSemesters: (parsed.semesters || []).length,
      latestCgpa: parsed.semesters?.length ? parsed.semesters[parsed.semesters.length - 1].cgpa : null,
      latestSgpa: parsed.semesters?.length ? parsed.semesters[parsed.semesters.length - 1].sgpa : null,
      totalCreditsEarned: 0,
    };
    record.officialNotes = parsed.notes || [];
    record.source = 'CODE_BRIGADE';
    record.title = parsed.title || 'Grade Card';
    record.syncStatus = 'SYNCED';
    record.syncMessage = 'Official university grade card synchronized successfully.';
    record.lastSyncedAt = new Date();

    await record.save();

    // Also update session student info if missing
    if (parsed.studentName && !session.studentName) session.studentName = parsed.studentName;
    if (parsed.rollNumber && !session.rollNumber) session.rollNumber = parsed.rollNumber;
    if (parsed.className && !session.className) session.className = parsed.className;
    await session.save();

    return record.toObject();
  } catch (err) {
    console.error('[AcademicRecord Service] Report card sync error:', err.message);

    // If session expired
    if (err.code === 'SESSION_EXPIRED') {
      session.status = 'DISCONNECTED';
      session.lastSyncError = 'University session expired. Please re-authenticate.';
      await session.save();
    }

    // Preserve existing record on upstream error
    const existing = await AcademicRecord.findOne({ user: userId });
    if (existing) {
      existing.syncStatus = 'FAILED';
      existing.syncMessage = `Synchronization failed: ${err.message}. Retaining cached official records.`;
      await existing.save();
      return existing.toObject();
    }

    throw err;
  }
}

module.exports = {
  getReportCard,
  syncReportCard,
};
