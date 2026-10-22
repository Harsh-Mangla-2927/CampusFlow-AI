const Subject = require('../models/Subject');
const Task = require('../models/Task');
const Exam = require('../models/Exam');
const { calculatePriorities } = require('../services/priorityEngine');
const { computeAllRisks } = require('../services/riskEngine');
const { detectConflicts } = require('../services/conflictEngine');
const { generateRecommendations } = require('../services/recommendationEngine');
const { computeFullAnalytics, computeAcademicHealth } = require('../services/analyticsEngine');

// @desc    Get dashboard data (aggregated view)
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch all data in parallel
    const [subjects, tasks, exams] = await Promise.all([
      Subject.find({ user: userId, isActive: true }),
      Task.find({ user: userId }).populate('subject', 'name code color'),
      Exam.find({ user: userId }).populate('subject', 'name code color'),
    ]);

    // Run all intelligence engines
    const prioritizedTasks = calculatePriorities(tasks);
    const risks = computeAllRisks(subjects, exams, tasks);
    const conflicts = detectConflicts(tasks, exams);
    const academicHealth = computeAcademicHealth(subjects, tasks);
    const recommendations = generateRecommendations({
      tasks: prioritizedTasks,
      subjects,
      exams,
      risks,
      conflicts,
    });

    // Build today's focus (top 5 prioritized non-completed tasks)
    const todaysFocus = prioritizedTasks.slice(0, 5);

    // Upcoming deadlines (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = prioritizedTasks
      .filter((t) => new Date(t.deadline) >= now && new Date(t.deadline) <= nextWeek)
      .slice(0, 5);

    // Upcoming exams (next 14 days)
    const nextTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingExams = exams
      .filter((e) => new Date(e.date) >= now && new Date(e.date) <= nextTwoWeeks && e.status === 'Upcoming')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    // Academic alerts — subjects with HIGH or MEDIUM risk
    const academicAlerts = risks.filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'MEDIUM');

    // Calculate genuine overall attendance across all active subjects
    let totalConductedClasses = 0;
    let totalAttendedClasses = 0;

    const subjectsSummary = subjects.map((subj) => {
      const conducted = subj.totalClasses || 0;
      const attended = subj.attendedClasses || 0;
      const threshold = subj.attendanceThreshold || 75;
      totalConductedClasses += conducted;
      totalAttendedClasses += attended;

      const currentPct = conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0;
      const targetRatio = threshold / 100;

      let recoveryText = 'Attendance on track';
      let classesNeeded = 0;
      let safeMisses = 0;

      if (conducted === 0) {
        recoveryText = 'No class records logged yet';
      } else if (currentPct < threshold) {
        if (targetRatio >= 1) {
          recoveryText = '100% target cannot be reached once a class is missed';
          classesNeeded = -1;
        } else {
          classesNeeded = Math.ceil((targetRatio * conducted - attended) / (1 - targetRatio));
          recoveryText = `Attend next ${classesNeeded} consecutive class${classesNeeded === 1 ? '' : 'es'} to reach ${threshold}%`;
        }
      } else {
        safeMisses = targetRatio > 0 ? Math.floor((attended - targetRatio * conducted) / targetRatio) : 0;
        recoveryText = safeMisses > 0
          ? `Buffer: can miss ${safeMisses} class${safeMisses === 1 ? '' : 'es'} while maintaining ${threshold}%`
          : `At threshold target (${threshold}%)`;
      }

      return {
        _id: subj._id,
        name: subj.name,
        code: subj.code,
        teacher: subj.teacher,
        credits: subj.credits,
        totalClasses: conducted,
        attendedClasses: attended,
        attendanceThreshold: threshold,
        currentMarks: subj.currentMarks || 0,
        targetMarks: subj.targetMarks || 75,
        color: subj.color,
        attendancePct: currentPct,
        recoveryGuidance: recoveryText,
        classesNeeded,
        safeMisses,
      };
    });

    const overallAttendance = totalConductedClasses > 0
      ? Math.round((totalAttendedClasses / totalConductedClasses) * 1000) / 10
      : null;

    // Prioritized single Next Action Determination
    let nextAction = null;
    const pendingNonCompleted = prioritizedTasks.filter(t => t.status !== 'Completed');

    if (upcomingExams.length > 0 && Math.ceil((new Date(upcomingExams[0].date) - now) / (1000 * 60 * 60 * 24)) <= 3) {
      const topExam = upcomingExams[0];
      const daysLeft = Math.ceil((new Date(topExam.date) - now) / (1000 * 60 * 60 * 24));
      nextAction = {
        type: 'EXAM',
        urgency: 'CRITICAL',
        title: `Prepare for ${topExam.title}`,
        subtitle: `${topExam.subject?.name || 'Upcoming Assessment'} · ${daysLeft <= 0 ? 'Today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`,
        buttonLabel: 'Launch Study Plan',
        targetPage: 'planner',
      };
    } else if (pendingNonCompleted.length > 0) {
      const topTask = pendingNonCompleted[0];
      const isOverdue = new Date(topTask.deadline) < now;
      nextAction = {
        type: 'TASK',
        urgency: isOverdue ? 'CRITICAL' : topTask.priorityLevel === 'HIGH' ? 'HIGH' : 'NORMAL',
        title: `Focus on: ${topTask.title}`,
        subtitle: `${topTask.subject?.name ? `${topTask.subject.name} · ` : ''}${isOverdue ? 'Overdue' : 'Priority Rank #1'}`,
        buttonLabel: 'View Task Backlog',
        targetPage: 'tasks',
      };
    } else if (academicAlerts.length > 0) {
      const topAlert = academicAlerts[0];
      nextAction = {
        type: 'ATTENDANCE',
        urgency: 'HIGH',
        title: `Recover Attendance: ${topAlert.subjectName || 'Course'}`,
        subtitle: topAlert.attendance?.gap ? `${topAlert.attendance.gap}% below threshold` : 'Attendance shortage warning',
        buttonLabel: 'Open Attendance Register',
        targetPage: 'records',
      };
    } else {
      nextAction = {
        type: 'PLAN',
        urgency: 'NORMAL',
        title: 'All Current Priorities Clear',
        subtitle: 'Maintain your academic momentum by planning upcoming study sessions.',
        buttonLabel: 'Open Study Planner',
        targetPage: 'planner',
      };
    }

    // Concise daily briefing based on actual numbers
    const overdueCount = tasks.filter((t) => t.status !== 'Completed' && new Date(t.deadline) < now).length;
    const dueThisWeekCount = upcomingDeadlines.length;
    let briefingText = '';

    if (subjects.length === 0) {
      briefingText = 'Welcome to CampusFlow AI. Set up your academic profile and enrolled courses to initialize academic health tracking.';
    } else {
      const parts = [];
      if (overdueCount > 0) {
        parts.push(`${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} requiring immediate attention`);
      }
      if (dueThisWeekCount > 0) {
        parts.push(`${dueThisWeekCount} assignment${dueThisWeekCount === 1 ? '' : 's'} due within the next 7 days`);
      }
      if (upcomingExams.length > 0) {
        parts.push(`${upcomingExams.length} upcoming examination${upcomingExams.length === 1 ? '' : 's'} scheduled`);
      }
      if (parts.length === 0) {
        briefingText = `All coursework is up to date across your ${subjects.length} enrolled subject${subjects.length === 1 ? '' : 's'}. Academic health is at ${academicHealth}%.`;
      } else {
        briefingText = `You have ${parts.join(', ')}. Overall attendance across ${subjects.length} active subject${subjects.length === 1 ? '' : 's'} is ${overallAttendance !== null ? `${overallAttendance}%` : 'pending class records'}.`;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          university: req.user.university,
          course: req.user.course,
          semester: req.user.semester,
          section: req.user.section,
        },
        academicHealth,
        overallAttendance,
        briefing: briefingText,
        nextAction,
        subjectsSummary,
        todaysFocus,
        upcomingDeadlines,
        upcomingExams,
        academicAlerts,
        conflicts,
        recommendations: recommendations.slice(0, 6),
        summary: {
          totalSubjects: subjects.length,
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t) => t.status === 'Completed').length,
          pendingTasks: tasks.filter((t) => t.status !== 'Completed').length,
          overdueTask: overdueCount,
          upcomingExams: upcomingExams.length,
          highRiskSubjects: risks.filter((r) => r.riskLevel === 'HIGH').length,
          totalConductedClasses,
          totalAttendedClasses,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [subjects, tasks, exams] = await Promise.all([
      Subject.find({ user: userId, isActive: true }),
      Task.find({ user: userId }),
      Exam.find({ user: userId }),
    ]);

    const analytics = computeFullAnalytics(subjects, tasks, exams);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get priority analysis for all tasks
// @route   GET /api/priorities
// @access  Private
const getPriorities = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id, status: { $ne: 'Completed' } })
      .populate('subject', 'name code color');

    const prioritized = calculatePriorities(tasks);
    res.status(200).json({ success: true, count: prioritized.length, data: prioritized });
  } catch (error) {
    next(error);
  }
};

// @desc    Get risk analysis for all subjects
// @route   GET /api/risks
// @access  Private
const getRisks = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [subjects, exams, tasks] = await Promise.all([
      Subject.find({ user: userId, isActive: true }),
      Exam.find({ user: userId }),
      Task.find({ user: userId }),
    ]);

    const risks = computeAllRisks(subjects, exams, tasks);
    res.status(200).json({ success: true, data: risks });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conflict analysis
// @route   GET /api/conflicts
// @access  Private
const getConflicts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [tasks, exams] = await Promise.all([
      Task.find({ user: userId, status: { $ne: 'Completed' } }).populate('subject', 'name code'),
      Exam.find({ user: userId, status: 'Upcoming' }).populate('subject', 'name code'),
    ]);

    const conflicts = detectConflicts(tasks, exams);
    res.status(200).json({ success: true, data: conflicts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get personalized recommendations
// @route   GET /api/recommendations
// @access  Private
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [subjects, tasks, exams] = await Promise.all([
      Subject.find({ user: userId, isActive: true }),
      Task.find({ user: userId }).populate('subject', 'name code'),
      Exam.find({ user: userId }),
    ]);

    const prioritizedTasks = calculatePriorities(tasks);
    const risks = computeAllRisks(subjects, exams, tasks);
    const conflicts = detectConflicts(tasks, exams);

    const recommendations = generateRecommendations({
      tasks: prioritizedTasks,
      subjects,
      exams,
      risks,
      conflicts,
    });

    res.status(200).json({ success: true, count: recommendations.length, data: recommendations });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getAnalytics, getPriorities, getRisks, getConflicts, getRecommendations };
