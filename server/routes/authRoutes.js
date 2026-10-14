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

router.post('/register',        register);
router.post('/login',           login);
router.post('/verify-otp',      verifyOtp);
router.post('/resend-otp',      resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

router.get('/me',               protect, getMe);
router.put('/profile',          protect, updateProfile);
router.put('/password',         protect, changePassword);
router.post('/profile/photo',   protect, uploadPhotoMiddleware, uploadProfilePhoto);
router.delete('/profile/photo', protect, deleteProfilePhoto);

module.exports = router;
