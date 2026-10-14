/**
 * Attendance Service — CampusFlow AI
 *
 * Implements business logic for:
 *  - Aggregated overall and subject-level attendance calculations
 *  - Real Code Brigade / Chalkpad Pro live synchronization & data parsing
 *  - Attendance register extraction with lecture numbers and period slots
 *  - Interactive attendance calculator
 *  - Explainable, transparent academic insights
 *  - Sample university dataset generation for demo / evaluation mode
 *  - Resilient synchronization with stale-record preservation on upstream outages
 */

'use strict';

const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
const CodeBrigadeSession = require('../models/CodeBrigadeSession');
const codeBrigadeConnector = require('./codeBrigadeConnector');
const {
  calculatePercentage,
  determineStanding,
  calculateClassesToAttend,
  calculateClassesCanMiss,
  generateInsights,
  safeNumber,
} = require('../utils/attendanceCalculations');

/**
 * Get the full attendance dashboard summary for an authenticated student.
 *
 * @param {string|ObjectId} userId
 * @param {number} [targetThreshold=75]
 * @returns {Promise<Object>}
 */
async function getDashboardSummary(userId, targetThreshold = 75) {
  const threshold = Math.min(100, Math.max(1, safeNumber(targetThreshold, 75)));

  // 1. Check Code Brigade connection status
  const cbSession = await CodeBrigadeSession.findOne({ user: userId }).lean();

  // 2. Fetch all active subjects for this user
  const subjects = await Subject.find({ user: userId, isActive: true })
    .sort({ createdAt: 1 })
    .lean();

  // 3. Find latest attendance session to provide accurate activity timestamp
  const latestSession = await AttendanceSession.findOne({ user: userId })
    .sort({ updatedAt: -1 })
    .select('updatedAt date')
    .lean();

  let totalConducted = 0;
  let totalAttended = 0;
  let isSampleDataset = false;

  const subjectMetrics = subjects.map((subj) => {
    const conducted = safeNumber(subj.totalClasses, 0);
    const attended = safeNumber(subj.attendedClasses, 0);
    const missed = Math.max(0, conducted - attended);
    const pct = calculatePercentage(attended, conducted);
    const subjThreshold = safeNumber(subj.attendanceThreshold, threshold);
    const standing = determineStanding(pct, subjThreshold, conducted);
    const recovery = calculateClassesToAttend(attended, conducted, subjThreshold);
    const canMiss = calculateClassesCanMiss(attended, conducted, subjThreshold);

    totalConducted += conducted;
    totalAttended += attended;

    if (subj.code && subj.code.startsWith('SMP-')) {
      isSampleDataset = true;
    }

    return {
      _id: subj._id,
      name: subj.name,
      code: subj.code || '',
      teacher: subj.teacher || '',
      credits: subj.credits || 3,
      color: subj.color || '#FF3D00',
      totalClasses: conducted,
      attendedClasses: attended,
      missedClasses: missed,
      attendancePercentage: pct,
      attendanceThreshold: subjThreshold,
      status: standing.status,
      standingLabel: standing.label,
      badgeClass: standing.badgeClass,
      colorHex: standing.color,
      classesNeededForThreshold: recovery.required ?? 0,
      classesCanMiss: canMiss.canMiss ?? 0,
      recoveryMessage: recovery.message,
      canMissMessage: canMiss.message,
      isTargetMet: recovery.isMet,
      isTargetImpossible: recovery.impossible,
      source: subj.source || 'LOCAL',
      fromDate: subj.fromDate || '',
      toDate: subj.toDate || '',
      dutyLeave: subj.dutyLeave || 0,
      medicalLeave: subj.medicalLeave || 0,
    };
  });

  const overallMissed = Math.max(0, totalConducted - totalAttended);
  const overallPercentage = calculatePercentage(totalAttended, totalConducted);
  const overallStanding = determineStanding(overallPercentage, threshold, totalConducted);

  // Overall calculator for user's configured threshold
  const overallRecovery = calculateClassesToAttend(totalAttended, totalConducted, threshold);
  const overallCanMiss = calculateClassesCanMiss(totalAttended, totalConducted, threshold);

  // Generate transparent rule-based insights
  const insights = generateInsights(subjectMetrics, threshold);

  // Determine honest, verified Data Source descriptor
  let dataSource = {
    provider: 'NOT_CONNECTED',
    providerLabel: 'Connection Required (0 Classes)',
    isConnected: false,
    isLive: false,
    isStale: false,
    isSample: false,
    lastSyncedAt: null,
    studentName: '',
    rollNumber: '',
    notice: 'Connect your Code Brigade account or load the demo dataset to view attendance.',
  };

  if (cbSession && cbSession.status === 'CONNECTED' && totalConducted > 0) {
    const isRecentlySynced = cbSession.lastSyncedAt && (Date.now() - new Date(cbSession.lastSyncedAt).getTime() < 2 * 60 * 60 * 1000);
    const isStale = cbSession.lastSyncStatus === 'STALE' || !isRecentlySynced;

    dataSource = {
      provider: isStale ? 'CODE_BRIGADE_STALE' : 'CODE_BRIGADE_LIVE',
      providerLabel: isStale ? 'University Data (Stale — Cached Records)' : 'Live University Data (Code Brigade)',
      isConnected: true,
      isLive: !isStale,
      isStale: isStale,
      isSample: false,
      lastSyncedAt: cbSession.lastSyncedAt,
      studentName: cbSession.studentName,
      rollNumber: cbSession.rollNumber,
      className: cbSession.className || '',
      notice: isStale
        ? (cbSession.lastSyncError ? `Upstream refresh notice: ${cbSession.lastSyncError}. Retaining verified records.` : 'Displaying cached university attendance records.')
        : `Connected to Chitkara University portal as ${cbSession.studentName || cbSession.username}. Real-time synchronization active.`,
    };
  } else if (cbSession && cbSession.status === 'CONNECTED' && totalConducted === 0) {
    const syncFailed = cbSession.lastSyncStatus === 'FAILED' || cbSession.lastSyncStatus === 'STALE' || cbSession.lastSyncStatus === 'NEVER';
    dataSource = {
      provider: syncFailed ? 'CODE_BRIGADE_SYNC_PENDING' : 'CODE_BRIGADE_EMPTY',
      providerLabel: syncFailed ? 'University Connected (Sync Pending)' : 'University Connected (0 Records Found)',
      isConnected: true,
      isLive: false,
      isStale: false,
      isSample: false,
      lastSyncedAt: cbSession.lastSyncedAt,
      studentName: cbSession.studentName,
      rollNumber: cbSession.rollNumber,
      className: cbSession.className || '',
      notice: cbSession.lastSyncError
        ? `Connected as ${cbSession.studentName}. University sync notice: ${cbSession.lastSyncError}`
        : `Connected as ${cbSession.studentName}. No attendance records found on university register for the current semester.`,
    };
  } else if (cbSession && cbSession.status === 'EXPIRED') {
    dataSource = {
      provider: 'CODE_BRIGADE_EXPIRED',
      providerLabel: 'University Session Expired',
      isConnected: false,
      isLive: false,
      isStale: true,
      isSample: false,
      lastSyncedAt: cbSession.lastSyncedAt,
      studentName: cbSession.studentName,
      rollNumber: cbSession.rollNumber,
      className: cbSession.className || '',
      notice: 'Your university login session has expired. Please re-authenticate to synchronize live records.',
    };
  } else if (isSampleDataset) {
    dataSource = {
      provider: 'SAMPLE_DATASET',
      providerLabel: 'Sample University Dataset (Demo Mode)',
      isConnected: false,
      isLive: false,
      isStale: false,
      isSample: true,
      lastSyncedAt: null,
      studentName: 'Demo Student',
      rollNumber: 'DEMO-CS-2026',
      notice: 'Currently displaying verified 5-subject engineering sample dataset for Attendly evaluation.',
    };
  } else if (totalConducted > 0) {
    dataSource = {
      provider: 'CAMPUSFLOW_LOCAL',
      providerLabel: 'CampusFlow Local Academic Register',
      isConnected: false,
      isLive: false,
      isStale: false,
      isSample: false,
      lastSyncedAt: latestSession ? latestSession.updatedAt : null,
      studentName: '',
      rollNumber: '',
      notice: 'Tracking local subject attendance. Connect Code Brigade to import official university records.',
    };
  }

  return {
    overall: {
      attendancePercentage: overallPercentage,
      totalClasses: totalConducted,
      attendedClasses: totalAttended,
      missedClasses: overallMissed,
      attendanceThreshold: threshold,
      status: overallStanding.status,
      standingLabel: overallStanding.label,
      badgeClass: overallStanding.badgeClass,
      color: overallStanding.color,
      classesNeededForThreshold: overallRecovery.required ?? 0,
      classesCanMiss: overallCanMiss.canMiss ?? 0,
      recoveryMessage: overallRecovery.message,
      canMissMessage: overallCanMiss.message,
      isTargetMet: overallRecovery.isMet,
      isTargetImpossible: overallRecovery.impossible,
    },
    subjects: subjectMetrics,
    insights,
    dataSource,
  };
}

/**
 * Connect student's Code Brigade / Chalkpad Pro credentials and trigger initial sync.
 *
 * @param {string|ObjectId} userId
 * @param {Object} credentials { username, password, schoolCode }
 * @returns {Promise<Object>}
 */
async function connectCodeBrigade(userId, credentials) {
  const { username, password, schoolCode = '800002' } = credentials;

  if (!username || !password) {
    const error = new Error('University username and password are required.');
    error.statusCode = 400;
    throw error;
  }

  // Authenticate with upstream university portal
  const authResult = await codeBrigadeConnector.login(username, password, schoolCode);

  if (authResult.requiresOTP) {
    return {
      success: false,
      requiresOTP: true,
      authUserId: authResult.authUserId,
      otpHint: authResult.otpHint,
      deviceUUID: authResult.deviceUUID,
      message: 'OTP verification required by university portal.',
    };
  }

  if (!authResult.success) {
    const error = new Error(authResult.error || 'Failed to authenticate with university portal.');
    error.statusCode = 401;
    throw error;
  }

  const { userData, deviceUUID, securityToken, classId = '', className = '', cookies = '' } = authResult;

  // Save session securely in MongoDB bound to this student's userId
  let sessionDoc = await CodeBrigadeSession.findOne({ user: userId });
  if (!sessionDoc) {
    sessionDoc = new CodeBrigadeSession({ user: userId });
  }

  sessionDoc.username = username.trim();
  sessionDoc.schoolCode = schoolCode;
  sessionDoc.apiKey = userData.apiKey;
  sessionDoc.securityToken = securityToken;
  sessionDoc.deviceUUID = deviceUUID;
  sessionDoc.userId = userData.userId;
  sessionDoc.sessionId = userData.sessionId;
  sessionDoc.roleId = userData.roleId;
  sessionDoc.studentId = userData.studentId;
  sessionDoc.studentName = userData.name;
  sessionDoc.rollNumber = userData.rollNumber;
  sessionDoc.classId = classId || userData.classId || '';
  sessionDoc.className = className || userData.className || '';
  if (cookies) {
    sessionDoc.cookies = cookies;
  }
  sessionDoc.status = 'CONNECTED';
  sessionDoc.lastSyncStatus = 'SUCCESS';
  sessionDoc.lastSyncError = '';

  await sessionDoc.save();

  // Run initial synchronization to fetch official subjects and attendance
  let syncResult = null;
  let syncError = null;
  try {
    syncResult = await syncCodeBrigade(userId);
  } catch (syncErr) {
    syncError = syncErr;
    console.warn('[Attendance Service] Initial sync warning:', syncErr.message);
  }

  return {
    success: true,
    authSuccess: true,
    syncSuccess: !syncError && (syncResult?.syncedSubjects > 0),
    syncedSubjects: syncResult?.syncedSubjects || 0,
    syncedSessions: syncResult?.syncedSessions || 0,
    syncMessage: syncError
      ? `Connected, but initial sync encountered: ${syncError.message}`
      : `Synchronized ${syncResult?.syncedSubjects || 0} university courses.`,
    message: syncError
      ? `Connected as ${userData.name || username}. Attendance sync notice: ${syncError.message}`
      : `Connected successfully as ${userData.name || username}.`,
    userData: {
      name: userData.name,
      rollNumber: userData.rollNumber,
      username: username.trim(),
      classId: sessionDoc.classId,
      className: sessionDoc.className,
    },
  };
}

/**
 * Verify OTP challenged by Code Brigade and complete connection.
 *
 * @param {string|ObjectId} userId
 * @param {Object} otpPayload { authUserId, otpText, deviceUUID }
 * @returns {Promise<Object>}
 */
async function verifyCodeBrigadeOtp(userId, otpPayload) {
  const { authUserId, otpText, deviceUUID } = otpPayload;

  if (!authUserId || !otpText) {
    const error = new Error('Auth User ID and OTP code are required.');
    error.statusCode = 400;
    throw error;
  }

  let sessionDoc = await CodeBrigadeSession.findOne({ user: userId });
  const schoolCode = sessionDoc?.schoolCode || '800002';

  const verifyResult = await codeBrigadeConnector.verifyOtp(authUserId, otpText, deviceUUID, schoolCode);
  if (!verifyResult.success) {
    const error = new Error(verifyResult.error || 'Invalid OTP code.');
    error.statusCode = 400;
    throw error;
  }

  const { userData, securityToken, classId = '', className = '' } = verifyResult;

  if (!sessionDoc) {
    sessionDoc = new CodeBrigadeSession({ user: userId });
  }

  sessionDoc.apiKey = userData.apiKey;
  sessionDoc.securityToken = securityToken || '';
  sessionDoc.deviceUUID = deviceUUID;
  sessionDoc.userId = userData.userId;
  sessionDoc.sessionId = userData.sessionId;
  sessionDoc.roleId = userData.roleId;
  sessionDoc.studentId = userData.studentId;
  sessionDoc.studentName = userData.name;
  sessionDoc.rollNumber = userData.rollNumber;
  sessionDoc.classId = classId || userData.classId || '';
  sessionDoc.className = className || userData.className || '';
  sessionDoc.status = 'CONNECTED';
  sessionDoc.lastSyncStatus = 'SUCCESS';
  sessionDoc.lastSyncError = '';

  await sessionDoc.save();

  // Run synchronization after successful OTP verification
  let syncResult = null;
  let syncError = null;
  try {
    syncResult = await syncCodeBrigade(userId);
  } catch (syncErr) {
    syncError = syncErr;
    console.warn('[Attendance Service] Post-OTP sync issue:', syncErr.message);
  }

  return {
    success: true,
    authSuccess: true,
    syncSuccess: !syncError && (syncResult?.syncedSubjects > 0),
    syncedSubjects: syncResult?.syncedSubjects || 0,
    syncedSessions: syncResult?.syncedSessions || 0,
    syncMessage: syncError
      ? syncError.message
      : `Synchronized ${syncResult?.syncedSubjects || 0} university courses.`,
    message: syncError
      ? `OTP verified for ${userData.name}. Attendance sync pending: ${syncError.message}`
      : `Connected as ${userData.name}. ${syncResult?.syncedSubjects || 0} courses synchronized.`,
    userData: {
      name: userData.name,
      rollNumber: userData.rollNumber,
      classId: sessionDoc.classId,
      className: sessionDoc.className,
    },
  };
}

/**
 * Synchronize live attendance from Code Brigade into CampusFlow AI database.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<Object>}
 */
async function syncCodeBrigade(userId) {
  const session = await CodeBrigadeSession.findOne({ user: userId });
  if (!session || session.status === 'DISCONNECTED') {
    const error = new Error('No university account connected. Please connect Code Brigade first.');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Fetch live university data via connector
    const result = await codeBrigadeConnector.fetchAttendance(session);
    const { subjects: parsedSubjects, registers: parsedRegisters } = result;

    if (parsedSubjects.length === 0 && parsedRegisters.length === 0) {
      console.warn('Notice: Code Brigade returned empty attendance payload.');
    }

    // 1. Synchronize Subjects
    const subjectMap = new Map(); // courseCode -> SubjectDoc

    for (const rawSubj of parsedSubjects) {
      let subjDoc = await Subject.findOne({
        user: userId,
        code: rawSubj.code,
      });

      if (!subjDoc) {
        // Try matching by name
        subjDoc = await Subject.findOne({
          user: userId,
          name: new RegExp(`^${rawSubj.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'),
        });
      }

      if (subjDoc) {
        // Update existing subject with official counts
        subjDoc.totalClasses = rawSubj.totalClasses;
        subjDoc.attendedClasses = rawSubj.attendedClasses;
        if (rawSubj.teacher && !subjDoc.teacher) subjDoc.teacher = rawSubj.teacher;
        subjDoc.source = 'CODE_BRIGADE';
        if (rawSubj.fromDate) subjDoc.fromDate = rawSubj.fromDate;
        if (rawSubj.toDate) subjDoc.toDate = rawSubj.toDate;
        if (rawSubj.dutyLeave !== undefined) subjDoc.dutyLeave = rawSubj.dutyLeave;
        if (rawSubj.medicalLeave !== undefined) subjDoc.medicalLeave = rawSubj.medicalLeave;
        await subjDoc.save();
      } else {
        // Create new subject document
        subjDoc = await Subject.create({
          user: userId,
          name: rawSubj.name,
          code: rawSubj.code,
          teacher: rawSubj.teacher || '',
          credits: 4,
          totalClasses: rawSubj.totalClasses,
          attendedClasses: rawSubj.attendedClasses,
          attendanceThreshold: 75,
          color: '#FF3D00',
          source: 'CODE_BRIGADE',
          fromDate: rawSubj.fromDate || '',
          toDate: rawSubj.toDate || '',
          dutyLeave: rawSubj.dutyLeave || 0,
          medicalLeave: rawSubj.medicalLeave || 0,
          isActive: true,
        });
      }

      subjectMap.set(rawSubj.code, subjDoc);
    }

    // 2. Synchronize Register Sessions
    let syncedSessionsCount = 0;

    for (const reg of parsedRegisters) {
      let subjDoc = subjectMap.get(reg.courseCode);
      if (!subjDoc) {
        subjDoc = await Subject.findOne({ user: userId, code: reg.courseCode });
      }

      if (subjDoc && Array.isArray(reg.entries)) {
        for (const entry of reg.entries) {
          const normDate = AttendanceSession.normalizeDate(entry.date);

          // Check if session record already exists
          const existingSession = await AttendanceSession.findOne({
            user: userId,
            subject: subjDoc._id,
            date: normDate,
          });

          if (existingSession) {
            existingSession.status = entry.status;
            existingSession.period = entry.period || '';
            existingSession.topic = `Lecture ${entry.lectureNum}`;
            existingSession.source = 'CODE_BRIGADE';
            await existingSession.save();
          } else {
            await AttendanceSession.create({
              user: userId,
              subject: subjDoc._id,
              date: normDate,
              status: entry.status,
              period: entry.period || '',
              topic: `Lecture ${entry.lectureNum}`,
              source: 'CODE_BRIGADE',
            });
          }
          syncedSessionsCount++;
        }
      }
    }

    // Update session timestamp & status
    session.lastSyncedAt = new Date();
    session.lastSyncStatus = 'SUCCESS';
    session.lastSyncError = '';
    session.status = 'CONNECTED';
    await session.save();

    return {
      success: true,
      syncedSubjects: parsedSubjects.length,
      syncedSessions: syncedSessionsCount,
      timestamp: session.lastSyncedAt,
    };
  } catch (err) {
    if (err.code === 'SESSION_EXPIRED') {
      session.status = 'EXPIRED';
      session.lastSyncStatus = 'FAILED';
      session.lastSyncError = 'University session expired.';
    } else {
      // Mark as STALE to preserve records while informing user of upstream outage
      session.lastSyncStatus = 'STALE';
      session.lastSyncError = err.message;
    }
    await session.save();

    // Preserve existing database records! Never wipe valid data because of an upstream failure.
    throw err;
  }
}

/**
 * Disconnect Code Brigade session for student.
 *
 * @param {string|ObjectId} userId
 */
async function disconnectCodeBrigade(userId) {
  const session = await CodeBrigadeSession.findOne({ user: userId });
  if (session) {
    session.status = 'DISCONNECTED';
    session.apiKey = '';
    session.securityToken = '';
    session.lastSyncStatus = 'NEVER';
    await session.save();
  }
  return { success: true, message: 'Code Brigade account unlinked.' };
}

/**
 * Get subject register with paginated or complete session records.
 *
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} subjectId
 * @param {Object} queryParams
 * @returns {Promise<Object>}
 */
async function getSubjectRegister(userId, subjectId, queryParams = {}) {
  const limit = Math.min(safeNumber(queryParams.limit, 100), 200);
  const page = Math.max(1, safeNumber(queryParams.page, 1));
  const skip = (page - 1) * limit;

  const subject = await Subject.findOne({ _id: subjectId, user: userId }).lean();
  if (!subject) {
    const error = new Error('Subject not found or access unauthorized.');
    error.statusCode = 404;
    throw error;
  }

  const [sessions, total] = await Promise.all([
    AttendanceSession.find({ user: userId, subject: subjectId })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AttendanceSession.countDocuments({ user: userId, subject: subjectId }),
  ]);

  const conducted = safeNumber(subject.totalClasses, 0);
  const attended = safeNumber(subject.attendedClasses, 0);
  const missed = Math.max(0, conducted - attended);
  const percentage = calculatePercentage(attended, conducted);
  const threshold = safeNumber(subject.attendanceThreshold, 75);
  const standing = determineStanding(percentage, threshold, conducted);
  const recovery = calculateClassesToAttend(attended, conducted, threshold);
  const canMiss = calculateClassesCanMiss(attended, conducted, threshold);
  const isCodeBrigade = subject.source === 'CODE_BRIGADE';
  const hasDetailedSessions = total > 0;
  const isPartial = total > 0 && total < conducted;
  const isSummaryOnly = isCodeBrigade && total === 0;

  let sessionStatusMessage = '';
  if (isSummaryOnly) {
    sessionStatusMessage = `Official university semester aggregate totals (${attended}/${conducted} attended, ${percentage}%). Individual lecture timestamps are not published by Code Brigade's mobile API.`;
  } else if (isPartial) {
    sessionStatusMessage = `Partial session log: ${total} of ${conducted} conducted classes recorded individually.`;
  } else if (total > 0) {
    sessionStatusMessage = `All ${total} class sessions recorded.`;
  }

  return {
    subject: {
      _id: subject._id,
      name: subject.name,
      code: subject.code,
      teacher: subject.teacher,
      credits: subject.credits,
      totalClasses: conducted,
      attendedClasses: attended,
      missedClasses: missed,
      attendancePercentage: percentage,
      attendanceThreshold: threshold,
      status: standing.status,
      standingLabel: standing.label,
      classesNeededForThreshold: recovery.required ?? 0,
      classesCanMiss: canMiss.canMiss ?? 0,
      source: subject.source || 'LOCAL',
      fromDate: subject.fromDate || '',
      toDate: subject.toDate || '',
      dutyLeave: subject.dutyLeave || 0,
      medicalLeave: subject.medicalLeave || 0,
    },
    meta: {
      totalStoredSessions: total,
      totalConductedClasses: conducted,
      totalAttendedClasses: attended,
      hasDetailedSessions,
      isSummaryOnly,
      isPartial,
      statusMessage: sessionStatusMessage,
    },
    sessions: sessions.map((s) => ({
      _id: s._id,
      date: s.date,
      status: s.status,
      topic: s.topic || '',
      period: s.period || '',
      source: s.source || 'MANUAL',
      correctedAt: s.correctedAt,
      correctedFrom: s.correctedFrom,
      createdAt: s.createdAt,
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Seed a realistic sample dataset for evaluation and demo purposes.
 * Creates 5 realistic subjects with ~15-25 attendance sessions each.
 *
 * @param {string|ObjectId} userId
 */
async function seedSampleDataset(userId) {
  // First, check if sample subjects already exist and remove them cleanly
  const existingSample = await Subject.find({ user: userId, code: /^SMP-/ });
  if (existingSample.length > 0) {
    const sampleIds = existingSample.map((s) => s._id);
    await AttendanceSession.deleteMany({ user: userId, subject: { $in: sampleIds } });
    await Subject.deleteMany({ _id: { $in: sampleIds } });
  }

  const sampleSubjectsConfig = [
    {
      name: 'Design & Analysis of Algorithms',
      code: 'SMP-CS301',
      teacher: 'Dr. Rajesh Sharma',
      credits: 4,
      color: '#FF3D00',
      totalClasses: 28,
      attendedClasses: 24, // ~85.7% (Safe)
      sessions: [
        { topic: 'Divide and Conquer Master Theorem', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 1 },
        { topic: 'Strassen Matrix Multiplication', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 2 },
        { topic: 'Greedy Heuristics & Fractional Knapsack', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 5 },
        { topic: 'Dynamic Programming — Bellman-Ford', period: 'Lecture 3 (11:15 - 12:15 PM)', status: 'ABSENT', daysAgo: 7 },
        { topic: 'Longest Common Subsequence (LCS)', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 9 },
        { topic: 'Floyd-Warshall All-Pairs Shortest Path', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 12 },
        { topic: 'Disjoint Set Forests & Kruskal Algorithm', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 14 },
        { topic: 'Prim Minimum Spanning Tree Analysis', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'ABSENT', daysAgo: 16 },
      ],
    },
    {
      name: 'Database Management Systems',
      code: 'SMP-CS302',
      teacher: 'Prof. Ananya Gupta',
      credits: 4,
      color: '#10B981',
      totalClasses: 25,
      attendedClasses: 19, // 76.0% (Warning boundary)
      sessions: [
        { topic: 'ACID Properties and Write-Ahead Logging', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 1 },
        { topic: 'Strict Two-Phase Locking (2PL)', period: 'Lecture 3 (11:15 - 12:15 PM)', status: 'ABSENT', daysAgo: 3 },
        { topic: 'B+ Tree Indexing & Node Splitting', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 6 },
        { topic: 'Relational Calculus & Query Execution Plan', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'ABSENT', daysAgo: 8 },
        { topic: 'Normalization: 3NF vs BCNF Decomposition', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 11 },
        { topic: 'Multivalued Dependencies & 4NF', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 15 },
      ],
    },
    {
      name: 'Computer Networks',
      code: 'SMP-CS303',
      teacher: 'Dr. Vikram Malhotra',
      credits: 3,
      color: '#3B82F6',
      totalClasses: 22,
      attendedClasses: 15, // 68.2% (Shortage / Critical)
      sessions: [
        { topic: 'TCP Congestion Control & AIMD', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'ABSENT', daysAgo: 2 },
        { topic: 'Slow Start, Fast Retransmit & Recovery', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'ABSENT', daysAgo: 4 },
        { topic: 'Border Gateway Protocol (BGP) Routing', period: 'Lecture 3 (11:15 - 12:15 PM)', status: 'PRESENT', daysAgo: 7 },
        { topic: 'Distance Vector vs Link State Routing', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'ABSENT', daysAgo: 10 },
        { topic: 'Subnet Masking & Classless Inter-Domain Routing', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 13 },
      ],
    },
    {
      name: 'Operating Systems Internals',
      code: 'SMP-CS304',
      teacher: 'Prof. Neha Verma',
      credits: 4,
      color: '#F59E0B',
      totalClasses: 30,
      attendedClasses: 27, // 90.0% (Good Standing)
      sessions: [
        { topic: 'Virtual Memory & Multi-Level Page Tables', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 1 },
        { topic: 'Inverted Page Tables & Translation Lookaside Buffer', period: 'Lecture 3 (11:15 - 12:15 PM)', status: 'PRESENT', daysAgo: 3 },
        { topic: 'Page Replacement Algorithms (LRU, Clock)', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 6 },
        { topic: 'Process Scheduling: Completely Fair Scheduler', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'ABSENT', daysAgo: 9 },
        { topic: 'Semaphores & Dining Philosophers Solution', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 14 },
      ],
    },
    {
      name: 'Full Stack Web Architecture',
      code: 'SMP-CS305',
      teacher: 'Dr. Siddharth Rao',
      credits: 3,
      color: '#8B5CF6',
      totalClasses: 20,
      attendedClasses: 18, // 90.0% (Good Standing)
      sessions: [
        { topic: 'State Management & Concurrent React 18', period: 'Lecture 3 (11:15 - 12:15 PM)', status: 'PRESENT', daysAgo: 1 },
        { topic: 'JWT Token Security & CSRF Mitigation', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'PRESENT', daysAgo: 4 },
        { topic: 'RESTful API Architecture & Rate Limiting', period: 'Lecture 2 (10:00 - 11:00 AM)', status: 'PRESENT', daysAgo: 8 },
        { topic: 'MongoDB Indexing Strategies & Profiling', period: 'Lecture 1 (09:00 - 10:00 AM)', status: 'ABSENT', daysAgo: 11 },
      ],
    },
  ];

  const now = new Date();
  const createdSubjects = [];

  for (const cfg of sampleSubjectsConfig) {
    const subject = await Subject.create({
      user: userId,
      name: cfg.name,
      code: cfg.code,
      teacher: cfg.teacher,
      credits: cfg.credits,
      color: cfg.color,
      totalClasses: cfg.totalClasses,
      attendedClasses: cfg.attendedClasses,
      attendanceThreshold: 75,
      source: 'SAMPLE',
      isActive: true,
    });

    createdSubjects.push(subject);

    // Create session records for this subject
    const sessionDocs = cfg.sessions.map((sess) => {
      const d = new Date(now.getTime() - sess.daysAgo * 24 * 60 * 60 * 1000);
      d.setHours(9, 0, 0, 0);
      return {
        user: userId,
        subject: subject._id,
        date: d,
        status: sess.status,
        topic: sess.topic,
        period: sess.period,
        source: 'SAMPLE',
      };
    });

    if (sessionDocs.length > 0) {
      await AttendanceSession.insertMany(sessionDocs);
    }
  }

  return createdSubjects;
}

/**
 * Remove sample dataset and keep only user's active personal subjects.
 *
 * @param {string|ObjectId} userId
 */
async function clearSampleDataset(userId) {
  const sampleSubjects = await Subject.find({ user: userId, code: /^SMP-/ });
  if (sampleSubjects.length > 0) {
    const sampleIds = sampleSubjects.map((s) => s._id);
    await AttendanceSession.deleteMany({ user: userId, subject: { $in: sampleIds } });
    await Subject.deleteMany({ _id: { $in: sampleIds } });
  }
  return { clearedCount: sampleSubjects.length };
}

module.exports = {
  getDashboardSummary,
  getSubjectRegister,
  connectCodeBrigade,
  verifyCodeBrigadeOtp,
  syncCodeBrigade,
  disconnectCodeBrigade,
  seedSampleDataset,
  clearSampleDataset,
};
