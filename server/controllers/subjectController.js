const Subject = require('../models/Subject');

// @desc    Get all subjects for logged-in user
// @route   GET /api/subjects
// @access  Private
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ user: req.user._id, isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
const getSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a subject
// @route   POST /api/subjects
// @access  Private
const createSubject = async (req, res, next) => {
  try {
    const { name, code, teacher, credits, attendanceThreshold, targetMarks, color } = req.body;

    if (!name || !code || !credits) {
      return res.status(400).json({
        success: false,
        message: 'Subject name, code, and credits are required.',
      });
    }

    const subject = await Subject.create({
      user: req.user._id,
      name,
      code,
      teacher,
      credits,
      attendanceThreshold: attendanceThreshold || 75,
      targetMarks: targetMarks || 75,
      color: color || '#6366f1',
    });

    res.status(201).json({ success: true, message: 'Subject created successfully.', data: subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a subject
// @route   PUT /api/subjects/:id
// @access  Private
const updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const allowedFields = [
      'name', 'code', 'teacher', 'credits', 'totalClasses', 'attendedClasses',
      'attendanceThreshold', 'currentMarks', 'targetMarks', 'color', 'marksHistory',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        subject[field] = req.body[field];
      }
    });

    const updated = await subject.save();
    res.status(200).json({ success: true, message: 'Subject updated successfully.', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a marks entry to history
// @route   POST /api/subjects/:id/marks
// @access  Private
const addMarksEntry = async (req, res, next) => {
  try {
    const { score, assessmentName } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({ success: false, message: 'Score is required.' });
    }

    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    subject.marksHistory.push({ score, assessmentName: assessmentName || 'Assessment', date: new Date() });
    subject.currentMarks = score; // Update current marks to the latest score
    await subject.save();

    res.status(200).json({ success: true, message: 'Marks entry added.', data: subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a subject (soft delete)
// @route   DELETE /api/subjects/:id
// @access  Private
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    subject.isActive = false;
    await subject.save();

    res.status(200).json({ success: true, message: 'Subject removed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSubjects, getSubject, createSubject, updateSubject, addMarksEntry, deleteSubject };
