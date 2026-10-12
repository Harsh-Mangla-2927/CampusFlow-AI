const express = require('express');
const router = express.Router();
const { getStudyPlans, createStudyPlan, markDayComplete, deleteStudyPlan } = require('../controllers/studyPlanController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getStudyPlans).post(createStudyPlan);
router.route('/:id').delete(deleteStudyPlan);
router.put('/:id/schedule/:dayIndex', markDayComplete);

module.exports = router;
