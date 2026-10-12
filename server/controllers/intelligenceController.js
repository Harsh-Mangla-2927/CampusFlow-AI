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

    res.status(200).json({
      success: true,
      data: {
        user: { name: req.user.name, university: req.user.university, course: req.user.course, semester: req.user.semester },
        academicHealth,
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
          overdueTask: tasks.filter((t) => t.status !== 'Completed' && new Date(t.deadline) < now).length,
          upcomingExams: upcomingExams.length,
          highRiskSubjects: risks.filter((r) => r.riskLevel === 'HIGH').length,
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
