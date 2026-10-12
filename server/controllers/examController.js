const Exam = require('../models/Exam');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
const getExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ user: req.user._id })
      .populate('subject', 'name code color')
      .sort({ date: 1 });

    res.status(200).json({ success: true, count: exams.length, data: exams });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
const getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.user._id }).populate(
      'subject',
      'name code color'
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an exam
// @route   POST /api/exams
// @access  Private
const createExam = async (req, res, next) => {
  try {
    const { subject, name, date, syllabus, difficulty, targetScore, totalMarks, duration, notes } = req.body;

    if (!subject || !name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Subject, exam name, and date are required.',
      });
    }

    const exam = await Exam.create({
      user: req.user._id,
      subject,
      name,
      date: new Date(date),
      syllabus: Array.isArray(syllabus) ? syllabus : (syllabus ? [syllabus] : []),
      difficulty: difficulty || 'Medium',
      targetScore: targetScore || 75,
      totalMarks: totalMarks || 100,
      duration: duration || 180,
      notes: notes || '',
    });

    const populated = await exam.populate('subject', 'name code color');
    res.status(201).json({ success: true, message: 'Exam created successfully.', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private
const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.user._id });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const allowedFields = ['subject', 'name', 'date', 'syllabus', 'difficulty', 'targetScore', 'totalMarks', 'duration', 'notes', 'status', 'actualScore'];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        exam[field] = req.body[field];
      }
    });

    const updated = await exam.save();
    res.status(200).json({ success: true, message: 'Exam updated successfully.', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private
const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.user._id });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    await exam.deleteOne();
    res.status(200).json({ success: true, message: 'Exam deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getExams, getExam, createExam, updateExam, deleteExam };
