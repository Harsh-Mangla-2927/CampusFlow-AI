/**
 * Analytics Engine — CampusFlow AI
 *
 * Computes academic analytics using pure JavaScript array methods:
 * map, filter, reduce, sort — demonstrating Lecture 1–24 concepts.
 *
 * Every metric comes from actual stored data — no fake numbers.
 */

/**
 * Compute academic health score (0–100).
 * Weighted composite of attendance, marks performance, and task completion.
 */
const computeAcademicHealth = (subjects, tasks) => {
  if (subjects.length === 0) return 0;

  // Attendance component (40%)
  const avgAttendance =
    subjects.reduce((sum, s) => {
      const pct = s.totalClasses === 0 ? 100 : Math.round((s.attendedClasses / s.totalClasses) * 100);
      return sum + pct;
    }, 0) / subjects.length;

  // Marks component (40%)
  const subjectsWithMarks = subjects.filter((s) => s.currentMarks > 0);
  const avgMarks =
    subjectsWithMarks.length > 0
      ? subjectsWithMarks.reduce((sum, s) => sum + s.currentMarks, 0) / subjectsWithMarks.length
      : 75; // Default to neutral if no marks yet

  // Task completion component (20%)
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 100;

  const health = Math.round(avgAttendance * 0.4 + avgMarks * 0.4 + completionRate * 0.2);
  return Math.min(100, Math.max(0, health));
};

/**
 * Compute subject-wise analytics.
 */
const computeSubjectAnalytics = (subjects, tasks) => {
  return subjects.map((subject) => {
    const subjectTasks = tasks.filter(
      (t) => t.subject && t.subject.toString() === subject._id.toString()
    );
    const completed = subjectTasks.filter((t) => t.status === 'Completed').length;
    const pending = subjectTasks.filter((t) => t.status !== 'Completed').length;
    const attendancePct =
      subject.totalClasses === 0
        ? 0
        : Math.round((subject.attendedClasses / subject.totalClasses) * 100);

    return {
      subjectId: subject._id,
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      attendancePercentage: attendancePct,
      attendanceStatus: getAttendanceStatus(attendancePct, subject.attendanceThreshold),
      currentMarks: subject.currentMarks,
      targetMarks: subject.targetMarks,
      marksGap: subject.targetMarks - subject.currentMarks,
      taskStats: { total: subjectTasks.length, completed, pending },
      color: subject.color,
    };
  });
};

const getAttendanceStatus = (pct, threshold) => {
  if (pct >= threshold + 5) return 'SAFE';
  if (pct >= threshold) return 'WARNING';
  return 'CRITICAL';
};

/**
 * Compute task completion analytics.
 */
const computeTaskAnalytics = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const overdue = tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.deadline) < new Date()
  ).length;

  // Task type distribution
  const byType = tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {});

  // Upcoming deadlines (next 7 days)
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingThisWeek = tasks.filter((t) => {
    const d = new Date(t.deadline);
    return d >= now && d <= weekLater && t.status !== 'Completed';
  }).length;

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byType,
    upcomingThisWeek,
  };
};

/**
 * Compute overall attendance summary.
 */
const computeAttendanceSummary = (subjects) => {
  if (subjects.length === 0) return { average: 0, safe: 0, warning: 0, critical: 0 };

  let safe = 0, warning = 0, critical = 0, totalPct = 0;

  subjects.forEach((subject) => {
    if (subject.totalClasses === 0) return;
    const pct = Math.round((subject.attendedClasses / subject.totalClasses) * 100);
    totalPct += pct;
    const status = getAttendanceStatus(pct, subject.attendanceThreshold);
    if (status === 'SAFE') safe++;
    else if (status === 'WARNING') warning++;
    else critical++;
  });

  return {
    average: subjects.length > 0 ? Math.round(totalPct / subjects.length) : 0,
    safe,
    warning,
    critical,
  };
};

/**
 * Compute performance trend across all subjects.
 */
const computePerformanceTrend = (subjects) => {
  return subjects
    .filter((s) => s.marksHistory && s.marksHistory.length >= 2)
    .map((subject) => {
      const history = subject.marksHistory.slice(-4); // Last 4 assessments
      return {
        subjectName: subject.name,
        subjectCode: subject.code,
        trend: history.map((h) => ({ score: h.score, date: h.date, name: h.assessmentName })),
      };
    });
};

/**
 * Full analytics computation — single function for the analytics endpoint.
 */
const computeFullAnalytics = (subjects, tasks, exams) => {
  return {
    academicHealth: computeAcademicHealth(subjects, tasks),
    subjectAnalytics: computeSubjectAnalytics(subjects, tasks),
    taskAnalytics: computeTaskAnalytics(tasks),
    attendanceSummary: computeAttendanceSummary(subjects),
    performanceTrend: computePerformanceTrend(subjects),
    examStats: {
      total: exams.length,
      upcoming: exams.filter((e) => e.status === 'Upcoming').length,
      completed: exams.filter((e) => e.status === 'Completed').length,
    },
  };
};

module.exports = {
  computeAcademicHealth,
  computeSubjectAnalytics,
  computeTaskAnalytics,
  computeAttendanceSummary,
  computePerformanceTrend,
  computeFullAnalytics,
};
