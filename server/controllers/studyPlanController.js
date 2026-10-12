const StudyPlan = require('../models/StudyPlan');
const { generateSchedule, estimateTotalHours } = require('../services/studyPlanner');

// @desc    Get all study plans
// @route   GET /api/study-plans
// @access  Private
const getStudyPlans = async (req, res, next) => {
  try {
    const plans = await StudyPlan.find({ user: req.user._id, isActive: true })
      .populate('subject', 'name code color')
      .sort({ examDate: 1 });

    res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate and save a study plan
// @route   POST /api/study-plans
// @access  Private
const createStudyPlan = async (req, res, next) => {
  try {
    const { subject, exam, title, examDate, availableHoursPerDay, topics, difficulty } = req.body;

    if (!subject || !title || !examDate || !availableHoursPerDay) {
      return res.status(400).json({
        success: false,
        message: 'Subject, title, exam date, and available hours per day are required.',
      });
    }

    // Generate the schedule using the study planner service
    const schedule = generateSchedule({
      examDate: new Date(examDate),
      availableHoursPerDay: parseFloat(availableHoursPerDay),
      topics: Array.isArray(topics) ? topics : [],
      difficulty: difficulty || 'Medium',
    });

    const totalHours = estimateTotalHours(schedule);

    const plan = await StudyPlan.create({
      user: req.user._id,
      subject,
      exam: exam || null,
      title,
      examDate: new Date(examDate),
      availableHoursPerDay: parseFloat(availableHoursPerDay),
      topics: Array.isArray(topics) ? topics : [],
      difficulty: difficulty || 'Medium',
      schedule,
    });

    const populated = await plan.populate('subject', 'name code color');

    res.status(201).json({
      success: true,
      message: 'Study plan generated successfully.',
      data: { ...populated.toObject(), totalHours },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a schedule day as completed
// @route   PUT /api/study-plans/:id/schedule/:dayIndex
// @access  Private
const markDayComplete = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found.' });
    }

    const dayIndex = parseInt(req.params.dayIndex);
    if (dayIndex < 0 || dayIndex >= plan.schedule.length) {
      return res.status(400).json({ success: false, message: 'Invalid day index.' });
    }

    plan.schedule[dayIndex].completed = !plan.schedule[dayIndex].completed;
    await plan.save();

    res.status(200).json({ success: true, message: 'Day status updated.', data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a study plan
// @route   DELETE /api/study-plans/:id
// @access  Private
const deleteStudyPlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found.' });
    }

    plan.isActive = false;
    await plan.save();

    res.status(200).json({ success: true, message: 'Study plan removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStudyPlans, createStudyPlan, markDayComplete, deleteStudyPlan };
