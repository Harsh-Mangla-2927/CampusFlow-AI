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
  uploadProfilePhoto,
  deleteProfilePhoto,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPhotoMiddleware } = require('../middleware/uploadMiddleware');
const { authLimiter, otpLimiter, passwordResetLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/register',        authLimiter, register);
router.post('/login',           authLimiter, login);
router.post('/verify-otp',      otpLimiter, verifyOtp);
router.post('/resend-otp',      otpLimiter, resendOtp);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password',  passwordResetLimiter, resetPassword);

router.get('/me',               protect, getMe);
router.put('/profile',          protect, updateProfile);
router.put('/password',         protect, changePassword);
router.post('/profile/photo',   protect, uploadPhotoMiddleware, uploadProfilePhoto);
router.delete('/profile/photo', protect, deleteProfilePhoto);

module.exports = router;
