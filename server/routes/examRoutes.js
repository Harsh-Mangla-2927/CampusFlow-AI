const express = require('express');
const router = express.Router();
const { getExams, getExam, createExam, updateExam, deleteExam } = require('../controllers/examController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getExams).post(createExam);
router.route('/:id').get(getExam).put(updateExam).delete(deleteExam);

module.exports = router;
