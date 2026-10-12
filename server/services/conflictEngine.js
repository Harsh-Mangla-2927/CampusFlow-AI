/**
 * Conflict Engine — CampusFlow AI
 *
 * Detects workload conflicts: multiple major academic obligations within a short time window.
 * Provides actionable recommendations when overload is detected.
 */

const CONFLICT_WINDOW_HOURS = 48; // Detect conflicts within this window
const MAJOR_TASK_THRESHOLD_HOURS = 3; // Tasks requiring 3+ hours are considered "major"

/**
 * Find tasks and exams that fall within a given number of hours from now.
 * @param {Array} tasks - Active task documents
 * @param {Array} exams - Upcoming exam documents
 * @param {number} windowHours - Detection window in hours
 * @returns {{ tasks: Array, exams: Array }}
 */
const getItemsInWindow = (tasks, exams, windowHours = CONFLICT_WINDOW_HOURS) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const tasksInWindow = tasks.filter((task) => {
    const deadline = new Date(task.deadline);
    return deadline >= now && deadline <= windowEnd && task.status !== 'Completed';
  });

  const examsInWindow = exams.filter((exam) => {
    const examDate = new Date(exam.date);
    return examDate >= now && examDate <= windowEnd && exam.status === 'Upcoming';
  });

  return { tasksInWindow, examsInWindow };
};

/**
 * Compute total estimated effort for a list of tasks.
 */
const computeTotalEffort = (tasks) =>
  tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

/**
 * Identify the most effort-intensive task — recommended to start first.
 */
const getMostDemandingTask = (tasks) => {
  if (tasks.length === 0) return null;
  return tasks.reduce((heaviest, task) =>
    task.estimatedHours > heaviest.estimatedHours ? task : heaviest
  );
};

/**
 * Detect deadline conflicts across tasks and exams.
 * @param {Array} tasks - All active tasks
 * @param {Array} exams - All upcoming exams
 * @returns {Object} Conflict report with severity, explanation, and recommendations
 */
const detectConflicts = (tasks, exams) => {
  const { tasksInWindow, examsInWindow } = getItemsInWindow(tasks, exams, CONFLICT_WINDOW_HOURS);

  const totalObligations = tasksInWindow.length + examsInWindow.length;
  const majorTasks = tasksInWindow.filter((t) => t.estimatedHours >= MAJOR_TASK_THRESHOLD_HOURS);
  const totalEffortHours = computeTotalEffort(tasksInWindow);

  const hasConflict = totalObligations >= 3 || (totalObligations >= 2 && examsInWindow.length >= 1);
  const severity = totalObligations >= 5 ? 'SEVERE' : totalObligations >= 3 ? 'HIGH' : 'MODERATE';

  if (!hasConflict) {
    return {
      hasConflict: false,
      severity: 'NONE',
      totalObligations,
      explanation: 'No significant workload conflicts detected in the next 48 hours.',
      recommendations: [],
      tasksInWindow,
      examsInWindow,
    };
  }

  // Build conflict explanation
  const parts = [];
  if (tasksInWindow.length > 0) parts.push(`${tasksInWindow.length} task deadline(s)`);
  if (examsInWindow.length > 0) parts.push(`${examsInWindow.length} exam(s)`);

  const explanation = `DEADLINE OVERLOAD DETECTED: You have ${parts.join(' and ')} within the next 48 hours, totalling approximately ${totalEffortHours.toFixed(1)} hours of required work.`;

  // Generate recommendations
  const recommendations = [];
  const mostDemanding = getMostDemandingTask(tasksInWindow);

  if (mostDemanding) {
    recommendations.push(
      `Start "${mostDemanding.title}" immediately — it requires the most effort (~${mostDemanding.estimatedHours} hours).`
    );
  }

  if (examsInWindow.length > 0) {
    const examNames = examsInWindow.map((e) => e.name).join(', ');
    recommendations.push(`Prioritise exam preparation for: ${examNames}.`);
  }

  if (totalEffortHours > 12) {
    recommendations.push('Consider delegating or reducing scope on lower-weight tasks if possible.');
  }

  recommendations.push('Break your work into focused 2-hour blocks to maintain productivity without burnout.');

  return {
    hasConflict: true,
    severity,
    totalObligations,
    totalEffortHours: parseFloat(totalEffortHours.toFixed(1)),
    explanation,
    recommendations,
    tasksInWindow,
    examsInWindow,
  };
};

/**
 * Detect conflicts for a specific time window (e.g., 24 hours).
 */
const detectConflictsIn24Hours = (tasks, exams) => {
  const { tasksInWindow, examsInWindow } = getItemsInWindow(tasks, exams, 24);
  return {
    window: '24 hours',
    tasks: tasksInWindow,
    exams: examsInWindow,
    total: tasksInWindow.length + examsInWindow.length,
  };
};

module.exports = { detectConflicts, detectConflictsIn24Hours };
