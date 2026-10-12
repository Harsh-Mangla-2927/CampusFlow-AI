/**
 * Recommendation Engine — CampusFlow AI
 *
 * Generates personalized, context-aware study recommendations based on
 * the student's actual academic data. Every recommendation is derived
 * from real signals — not generic tips.
 */

/**
 * Generate recommendations from aggregated student data.
 *
 * @param {Object} data
 * @param {Array} data.tasks - All active tasks with priority scores
 * @param {Array} data.subjects - All subjects with attendance and marks
 * @param {Array} data.exams - All upcoming exams
 * @param {Array} data.risks - Risk reports from riskEngine
 * @param {Object} data.conflicts - Conflict report from conflictEngine
 * @returns {Array} Array of recommendation objects
 */
const generateRecommendations = ({ tasks, subjects, exams, risks, conflicts }) => {
  const recommendations = [];
  const now = new Date();

  // --- Recommendation 1: Highest priority task ---
  const activeTasks = tasks.filter((t) => t.status !== 'Completed');
  if (activeTasks.length > 0) {
    const topTask = activeTasks.reduce((top, t) =>
      (t.priorityScore || 0) > (top.priorityScore || 0) ? t : top
    );
    const daysLeft = Math.ceil((new Date(topTask.deadline) - now) / (1000 * 60 * 60 * 24));
    recommendations.push({
      type: 'TASK_FOCUS',
      priority: 'HIGH',
      title: `Focus on "${topTask.title}" today`,
      detail: `This is your highest-priority task, due in ${daysLeft} day(s) with ~${topTask.estimatedHours}h of work remaining.`,
      icon: '🎯',
    });
  }

  // --- Recommendation 2: Attendance warnings ---
  subjects.forEach((subject) => {
    if (subject.totalClasses === 0) return;
    const pct = Math.round((subject.attendedClasses / subject.totalClasses) * 100);
    const gap = subject.attendanceThreshold - pct;

    if (gap > 5) {
      recommendations.push({
        type: 'ATTENDANCE_CRITICAL',
        priority: 'HIGH',
        title: `Attendance crisis in ${subject.name}`,
        detail: `Your attendance is ${pct}%, which is ${gap}% below the ${subject.attendanceThreshold}% threshold. Attend every class from now on.`,
        icon: '🚨',
      });
    } else if (gap > 0) {
      recommendations.push({
        type: 'ATTENDANCE_WARNING',
        priority: 'MEDIUM',
        title: `${subject.name} attendance approaching threshold`,
        detail: `Attendance is at ${pct}%, just below the ${subject.attendanceThreshold}% requirement. Avoid missing any upcoming classes.`,
        icon: '⚠️',
      });
    }
  });

  // --- Recommendation 3: Declining marks ---
  risks.forEach((risk) => {
    if (risk.factors.marks.trend === 'DECLINING') {
      recommendations.push({
        type: 'MARKS_DECLINING',
        priority: 'MEDIUM',
        title: `Performance declining in ${risk.subjectName}`,
        detail: risk.factors.marks.detail + ' Consider scheduling a focused revision session.',
        icon: '📉',
      });
    }
  });

  // --- Recommendation 4: Upcoming exams within 7 days ---
  const soonExams = exams.filter((e) => {
    const daysUntil = Math.ceil((new Date(e.date) - now) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0 && e.status === 'Upcoming';
  });

  soonExams.forEach((exam) => {
    const daysUntil = Math.ceil((new Date(exam.date) - now) / (1000 * 60 * 60 * 24));
    recommendations.push({
      type: 'EXAM_APPROACHING',
      priority: daysUntil <= 3 ? 'HIGH' : 'MEDIUM',
      title: `Prepare for ${exam.name}`,
      detail: `${exam.name} is in ${daysUntil} day(s). ${daysUntil <= 3 ? 'Begin intensive preparation immediately.' : 'Start structured revision now.'}`,
      icon: '📝',
    });
  });

  // --- Recommendation 5: Deadline conflict ---
  if (conflicts && conflicts.hasConflict) {
    recommendations.push({
      type: 'CONFLICT_DETECTED',
      priority: 'HIGH',
      title: 'Deadline overload detected',
      detail: conflicts.explanation,
      icon: '⚡',
    });
    // Add the first conflict recommendation as a follow-up
    if (conflicts.recommendations && conflicts.recommendations.length > 0) {
      recommendations.push({
        type: 'CONFLICT_ACTION',
        priority: 'HIGH',
        title: 'Recommended action',
        detail: conflicts.recommendations[0],
        icon: '✅',
      });
    }
  }

  // --- Recommendation 6: Overdue tasks ---
  const overdueTasks = activeTasks.filter((t) => new Date(t.deadline) < now);
  if (overdueTasks.length > 0) {
    recommendations.push({
      type: 'OVERDUE',
      priority: 'HIGH',
      title: `${overdueTasks.length} overdue task(s) need immediate attention`,
      detail: `You have ${overdueTasks.length} task(s) past their deadline: ${overdueTasks.map((t) => `"${t.title}"`).join(', ')}.`,
      icon: '🔴',
    });
  }

  // --- Recommendation 7: Positive reinforcement if everything is good ---
  const highRisks = risks.filter((r) => r.riskLevel === 'HIGH');
  if (highRisks.length === 0 && overdueTasks.length === 0 && soonExams.length === 0) {
    recommendations.push({
      type: 'POSITIVE',
      priority: 'LOW',
      title: 'Academic health looks good',
      detail: 'No critical risks detected. Keep maintaining your current pace and attendance.',
      icon: '✅',
    });
  }

  // Sort: HIGH first, MEDIUM next, LOW last
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

module.exports = { generateRecommendations };
