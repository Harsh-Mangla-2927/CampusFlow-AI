/**
 * Attendance Service — CampusFlow AI
 *
 * Implements business logic for:
 *  - Aggregated overall and subject-level attendance calculations
 *  - Attendly-style register extraction with slot and topic details
 *  - Interactive attendance calculator (consecutive required vs allowable misses)
 *  - Actionable, explainable insights
 *  - Sample university dataset generation for testing / demo mode
 *  - Provider status and security boundaries
 */

'use strict';

const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
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

  // Fetch all active subjects for this user
  const subjects = await Subject.find({ user: userId, isActive: true })
    .sort({ createdAt: 1 })
    .lean();

  // Find latest attendance session to provide accurate last sync / update timestamp
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
    dataSource: {
      provider: isSampleDataset ? 'SAMPLE_DATASET' : 'CAMPUSFLOW_LOCAL',
      providerLabel: isSampleDataset ? 'Sample University Dataset (Demo Mode)' : 'CampusFlow Local Academic Register',
      isSample: isSampleDataset,
      lastUpdated: latestSession ? latestSession.updatedAt : null,
      externalSyncAvailable: false,
      externalSyncNotice:
        'Chitkara Code Brigade / Chalkpad Pro does not provide a public developer API or authorized OAuth 2.0 endpoint. All records are isolated and stored securely in your private CampusFlow repository.',
    },
  };
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
    },
    sessions: sessions.map((s) => ({
      _id: s._id,
      date: s.date,
      status: s.status,
      topic: s.topic || '',
      period: s.period || '',
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
  seedSampleDataset,
  clearSampleDataset,
};
