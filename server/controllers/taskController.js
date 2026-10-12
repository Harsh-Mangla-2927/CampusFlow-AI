const Task = require('../models/Task');
const { calculateTaskPriority, calculatePriorities } = require('../services/priorityEngine');

// @desc    Get all tasks (with computed priorities)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { status, type, subject } = req.query;
    const filter = { user: req.user._id };

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (subject) filter.subject = subject;

    const tasks = await Task.find(filter)
      .populate('subject', 'name code color')
      .sort({ deadline: 1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id }).populate(
      'subject',
      'name code color'
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a task and compute its initial priority
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const { title, subject, description, type, status, deadline, estimatedHours, academicWeight, difficulty } = req.body;

    if (!title || !type || !deadline || !estimatedHours) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, deadline, and estimated hours are required.',
      });
    }

    // Create task first (without priority fields)
    const taskData = {
      user: req.user._id,
      title, subject, description, type,
      status: status || 'Pending',
      deadline: new Date(deadline),
      estimatedHours: parseFloat(estimatedHours),
      academicWeight: academicWeight || 'Medium',
      difficulty: difficulty || 'Medium',
    };

    // Compute priority before saving
    const priority = calculateTaskPriority(taskData);
    taskData.priorityScore = priority.priorityScore;
    taskData.priorityLevel = priority.priorityLevel;
    taskData.priorityExplanation = priority.priorityExplanation;

    const task = await Task.create(taskData);
    const populated = await task.populate('subject', 'name code color');

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: { ...populated.toObject(), priorityBreakdown: priority.breakdown },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a task (recomputes priority after update)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const allowedFields = [
      'title', 'subject', 'description', 'type', 'status',
      'deadline', 'estimatedHours', 'academicWeight', 'difficulty',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    if (req.body.status === 'Completed' && !task.completedAt) {
      task.completedAt = new Date();
    }

    // Recompute priority whenever task data changes
    const priority = calculateTaskPriority(task);
    task.priorityScore = priority.priorityScore;
    task.priorityLevel = priority.priorityLevel;
    task.priorityExplanation = priority.priorityExplanation;

    const updated = await task.save();
    res.status(200).json({ success: true, message: 'Task updated successfully.', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    await task.deleteOne();
    res.status(200).json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask };
