const express = require('express');
const router  = express.Router();
const {
  getSubjects, getSubject, createSubject, updateSubject, addMarksEntry, deleteSubject,
} = require('../controllers/subjectController');
const { markAttendance, correctAttendance, getAttendanceHistory } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getSubjects).post(createSubject);
router.route('/:id').get(getSubject).put(updateSubject).delete(deleteSubject);
router.post('/:id/marks', addMarksEntry);

// Attendance routes
router.post('/:id/attendance',                   markAttendance);
router.put('/:id/attendance/:sessionId',         correctAttendance);
router.get('/:id/attendance',                    getAttendanceHistory);

module.exports = router;
