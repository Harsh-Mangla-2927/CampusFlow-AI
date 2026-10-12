const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAnalytics,
  getPriorities,
  getRisks,
  getConflicts,
  getRecommendations,
} = require('../controllers/intelligenceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/priorities', getPriorities);
router.get('/risks', getRisks);
router.get('/conflicts', getConflicts);
router.get('/recommendations', getRecommendations);

module.exports = router;
