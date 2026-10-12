/**
 * Risk Engine — CampusFlow AI
 *
 * Detects academic risk signals for each subject using transparent rule-based logic.
 * Analyses attendance, marks trends, and upcoming exam proximity.
 *
 * Architecture note: The architecture is intentionally designed so that this
 * rule-based engine can be replaced with an ML prediction model later without
 * touching any route or controller.
 */

// Risk factor thresholds
const THRESHOLDS = {
  attendance: {
    critical: 5,   // >5% below threshold → critical attendance signal
    warning: 0,    // At threshold or just below → warning
  },
  marksDecline: {
    significant: 10,  // Drop of 10+ points across recent assessments
    moderate: 5,      // Drop of 5–9 points
  },
  examProximity: {
    urgent: 3,     // Exam within 3 days
    soon: 7,       // Exam within 7 days
  },
};

const RISK_SCORES = {
  ATTENDANCE_CRITICAL: 40,
  ATTENDANCE_WARNING: 20,
  MARKS_DECLINING_SIGNIFICANT: 30,
  MARKS_DECLINING_MODERATE: 15,
  EXAM_URGENT: 25,
  EXAM_SOON: 10,
  OVERDUE_TASKS: 20,
  PENDING_TASKS_HIGH: 15,
};

/**
 * Detect attendance risk for a subject.
 * @param {Object} subject - Subject document with attendance fields
 * @returns {{ score: number, signal: string, detail: string }}
 */
const analyseAttendance = (subject) => {
  const { attendedClasses, totalClasses, attendanceThreshold } = subject;
  if (totalClasses === 0) return { score: 0, signal: 'NO_DATA', detail: 'No class data recorded yet.' };

  const currentPct = Math.round((attendedClasses / totalClasses) * 100);
  const gap = attendanceThreshold - currentPct;

  if (gap > THRESHOLDS.attendance.critical) {
    return {
      score: RISK_SCORES.ATTENDANCE_CRITICAL,
      signal: 'CRITICAL',
      detail: `Attendance is ${currentPct}%, which is ${gap}% below the required ${attendanceThreshold}% threshold.`,
    };
  }
  if (gap > THRESHOLDS.attendance.warning) {
    return {
      score: RISK_SCORES.ATTENDANCE_WARNING,
      signal: 'WARNING',
      detail: `Attendance is ${currentPct}%, just below the ${attendanceThreshold}% threshold.`,
    };
  }
  return { score: 0, signal: 'SAFE', detail: `Attendance is ${currentPct}%, meeting the threshold.` };
};

/**
 * Detect performance trend from marks history.
 * @param {Array} marksHistory - Array of { score, date } objects
 * @returns {{ score: number, signal: string, detail: string, trend: string }}
 */
const analyseMarksTrend = (marksHistory) => {
  if (!marksHistory || marksHistory.length < 2) {
    return { score: 0, signal: 'INSUFFICIENT_DATA', detail: 'Not enough assessments to detect a trend.', trend: 'STABLE' };
  }

  // Use only the last 3 assessments for trend detection
  const recent = marksHistory.slice(-3).map((entry) => entry.score);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const decline = first - last;

  // Check if scores are monotonically declining
  let isConsistentlyDeclining = true;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] >= recent[i - 1]) {
      isConsistentlyDeclining = false;
      break;
    }
  }

  if (decline >= THRESHOLDS.marksDecline.significant && isConsistentlyDeclining) {
    return {
      score: RISK_SCORES.MARKS_DECLINING_SIGNIFICANT,
      signal: 'DECLINING',
      detail: `Recent scores are consistently declining: ${recent.join(' → ')}. A ${decline}-point drop detected.`,
      trend: 'DECLINING',
    };
  }
  if (decline >= THRESHOLDS.marksDecline.moderate) {
    return {
      score: RISK_SCORES.MARKS_DECLINING_MODERATE,
      signal: 'DECLINING',
      detail: `Performance appears to be declining. Recent scores: ${recent.join(' → ')}.`,
      trend: 'DECLINING',
    };
  }
  if (last > first) {
    return { score: 0, signal: 'IMPROVING', detail: `Performance is improving. Recent scores: ${recent.join(' → ')}.`, trend: 'IMPROVING' };
  }
  return { score: 0, signal: 'STABLE', detail: `Performance is relatively stable. Recent scores: ${recent.join(' → ')}.`, trend: 'STABLE' };
};

/**
 * Detect exam proximity risk.
 * @param {Array} upcomingExams - Exam documents for this subject
 * @returns {{ score: number, signal: string, detail: string }}
 */
const analyseExamProximity = (upcomingExams) => {
  if (!upcomingExams || upcomingExams.length === 0) {
    return { score: 0, signal: 'NONE', detail: 'No upcoming exams recorded.' };
  }

  const now = new Date();
  const soonestExam = upcomingExams.reduce((earliest, exam) => {
    return new Date(exam.date) < new Date(earliest.date) ? exam : earliest;
  });

  const daysUntil = Math.ceil((new Date(soonestExam.date) - now) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 0) {
    return { score: RISK_SCORES.EXAM_URGENT, signal: 'TODAY', detail: `${soonestExam.name} is today!` };
  }
  if (daysUntil <= THRESHOLDS.examProximity.urgent) {
    return {
      score: RISK_SCORES.EXAM_URGENT,
      signal: 'URGENT',
      detail: `${soonestExam.name} is in ${daysUntil} day(s). Immediate preparation required.`,
    };
  }
  if (daysUntil <= THRESHOLDS.examProximity.soon) {
    return {
      score: RISK_SCORES.EXAM_SOON,
      signal: 'SOON',
      detail: `${soonestExam.name} is in ${daysUntil} days. Begin preparation now.`,
    };
  }
  return { score: 0, signal: 'DISTANT', detail: `Next exam in ${daysUntil} days.` };
};

/**
 * Analyse pending and overdue task load for a subject.
 * @param {Array} tasks - Task documents for this subject
 * @returns {{ score: number, signal: string, detail: string }}
 */
const analyseTaskLoad = (tasks) => {
  if (!tasks || tasks.length === 0) return { score: 0, signal: 'NONE', detail: 'No tasks recorded.' };

  const now = new Date();
  const overdue = tasks.filter((t) => t.status !== 'Completed' && new Date(t.deadline) < now);
  const pending = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress');

  let score = 0;
  const details = [];

  if (overdue.length > 0) {
    score += RISK_SCORES.OVERDUE_TASKS;
    details.push(`${overdue.length} overdue task(s)`);
  }
  if (pending.length >= 3) {
    score += RISK_SCORES.PENDING_TASKS_HIGH;
    details.push(`${pending.length} pending tasks`);
  }

  return {
    score,
    signal: score > 0 ? 'RISK' : 'CLEAR',
    detail: details.length > 0 ? `Task load concerns: ${details.join(', ')}.` : 'Task load is manageable.',
  };
};

/**
 * Classify overall risk level from a total risk score.
 */
const classifyRisk = (totalScore) => {
  if (totalScore >= 60) return 'HIGH';
  if (totalScore >= 25) return 'MEDIUM';
  return 'LOW';
};

/**
 * Compute risk for a single subject.
 * @param {Object} subject - Subject document
 * @param {Array} exams - Exams for this subject
 * @param {Array} tasks - Tasks for this subject
 * @returns {Object} Full risk report for the subject
 */
const computeSubjectRisk = (subject, exams = [], tasks = []) => {
  const attendanceAnalysis = analyseAttendance(subject);
  const marksAnalysis = analyseMarksTrend(subject.marksHistory);
  const examAnalysis = analyseExamProximity(exams.filter((e) => e.status === 'Upcoming'));
  const taskAnalysis = analyseTaskLoad(tasks);

  const totalScore = attendanceAnalysis.score + marksAnalysis.score + examAnalysis.score + taskAnalysis.score;
  const riskLevel = classifyRisk(totalScore);

  // Build comprehensive explanation
  const factors = [];
  if (attendanceAnalysis.score > 0) factors.push(attendanceAnalysis.detail);
  if (marksAnalysis.score > 0) factors.push(marksAnalysis.detail);
  if (examAnalysis.score > 0) factors.push(examAnalysis.detail);
  if (taskAnalysis.score > 0) factors.push(taskAnalysis.detail);

  const explanation =
    factors.length > 0
      ? `Risk is ${riskLevel.toLowerCase()} because: ${factors.join(' ')}`
      : `${subject.name} appears to be in good standing with no significant risk signals detected.`;

  return {
    subjectId: subject._id,
    subjectName: subject.name,
    subjectCode: subject.code,
    riskLevel,
    riskScore: totalScore,
    explanation,
    factors: {
      attendance: attendanceAnalysis,
      marks: marksAnalysis,
      exam: examAnalysis,
      tasks: taskAnalysis,
    },
  };
};

/**
 * Compute risk for all subjects.
 * @param {Array} subjects - All subject documents
 * @param {Array} allExams - All exam documents
 * @param {Array} allTasks - All task documents
 * @returns {Array} Risk reports sorted by riskScore descending
 */
const computeAllRisks = (subjects, allExams, allTasks) => {
  const risks = subjects.map((subject) => {
    const subjectExams = allExams.filter(
      (e) => e.subject && e.subject.toString() === subject._id.toString()
    );
    const subjectTasks = allTasks.filter(
      (t) => t.subject && t.subject.toString() === subject._id.toString()
    );
    return computeSubjectRisk(subject, subjectExams, subjectTasks);
  });

  return risks.sort((a, b) => b.riskScore - a.riskScore);
};

module.exports = { computeSubjectRisk, computeAllRisks };
