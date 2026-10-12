const express = require('express');
const router  = express.Router();
const {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',        register);
router.post('/login',           login);
router.post('/verify-otp',      verifyOtp);
router.post('/resend-otp',      resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

router.get('/me',               protect, getMe);
router.put('/profile',          protect, updateProfile);
router.put('/password',         protect, changePassword);

module.exports = router;
