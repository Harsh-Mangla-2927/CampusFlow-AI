const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const emailService = require('../services/emailService');
const otpService = require('../services/otpService');
const { validateEducationalEmail, validatePasswordStrength, sanitizeString } = require('../services/validationService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const generateChallengeToken = (payload) =>
  jwt.sign(
    { ...payload, purpose: 'OTP_CHALLENGE' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

// ── REGISTER ────────────────────────────────────────────────
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, university, course, semester } = req.body;

    // Required fields
    const errors = {};
    if (!sanitizeString(name))       errors.name       = 'Full name is required.';
    if (!sanitizeString(email))      errors.email      = 'Email address is required.';
    if (!sanitizeString(password))   errors.password   = 'Password is required.';
    if (!sanitizeString(university)) errors.university = 'University name is required.';
    if (!sanitizeString(course))     errors.course     = 'Course name is required.';
    if (!semester)                   errors.semester   = 'Semester is required.';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
    }

    // Password confirmation
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false, message: 'Passwords do not match.',
        errors: { confirmPassword: 'Passwords do not match.' },
      });
    }

    // Educational email validation
    const emailCheck = validateEducationalEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false, message: emailCheck.message,
        errors: { email: emailCheck.message },
      });
    }

    // Password strength
    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      return res.status(400).json({
        success: false, message: passCheck.message,
        errors: { password: passCheck.message },
      });
    }

    // Duplicate check
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false, message: 'An account with this email already exists.',
        errors: { email: 'This email is already registered.' },
      });
    }

    // Verify SMTP service availability
    if (!emailService.isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email delivery service is not configured. Please configure SMTP_USER and SMTP_PASS in server/.env.',
      });
    }

    const signupData = {
      name: sanitizeString(name),
      email: email.toLowerCase().trim(),
      password,
      university: sanitizeString(university),
      course: sanitizeString(course),
      semester: Number(semester),
    };

    const { otpRecord, plainOtp } = await otpService.createOtpChallenge({
      email: signupData.email,
      purpose: 'SIGNUP',
      signupData,
    });

    await emailService.sendOtpEmail(signupData.email, plainOtp, signupData.name);

    const challengeToken = generateChallengeToken({
      email: signupData.email,
      actionPurpose: 'SIGNUP',
      otpId: otpRecord._id,
      signupData,
    });

    res.status(200).json({
      success: true,
      requireOtp: true,
      message: "We've sent a verification code to your email address.",
      challengeToken,
      maskedEmail: otpService.maskEmail(signupData.email),
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    next(error);
  }
};

// ── LOGIN ────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  const maskedEmail = req.body?.email ? otpService.maskEmail(String(req.body.email).trim().toLowerCase()) : 'unknown';
  try {
    const { email, password } = req.body;
    const errors = {};

    console.log(`[Auth Diagnostic] Sign-in request received for user: ${maskedEmail}`);

    if (!sanitizeString(email))    errors.email    = 'Email is required.';
    if (!sanitizeString(password)) errors.password = 'Password is required.';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Email and password are required.', errors });
    }

    // Check database connection state before query
    const dbState = mongoose.connection.readyState;
    console.log(`[Auth Diagnostic] Database connection state: ${dbState} (1=connected, 0=disconnected)`);
    if (dbState !== 1) {
      console.warn(`[Auth Diagnostic] Database is not in connected state (${dbState})`);
      return res.status(503).json({
        success: false,
        message: 'Database service is temporarily unavailable. Please try again shortly.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    console.log(`[Auth Diagnostic] Database query completed for ${maskedEmail} (record found: ${Boolean(user)})`);

    if (!user || !(await user.matchPassword(password))) {
      console.log(`[Auth Diagnostic] Authentication failed: invalid credentials for ${maskedEmail}`);
      return res.status(401).json({
        success: false, message: 'Invalid email or password.',
        errors: { general: 'Invalid email or password.' },
      });
    }

    console.log(`[Auth Diagnostic] Password verified successfully for ${maskedEmail}`);

    // Verify SMTP service availability
    if (!emailService.isEmailConfigured()) {
      console.warn('[Auth Diagnostic] SMTP service is not configured');
      return res.status(503).json({
        success: false,
        message: 'Email delivery service is not configured. Please configure SMTP_USER and SMTP_PASS in server/.env.',
      });
    }

    // Credentials valid: Create OTP challenge
    console.log(`[Auth Diagnostic] Generating OTP challenge for ${maskedEmail}`);
    const { otpRecord, plainOtp } = await otpService.createOtpChallenge({
      email: user.email,
      purpose: 'LOGIN',
      userId: user._id,
    });

    // Dispatch real OTP email
    console.log(`[Auth Diagnostic] Dispatching OTP email via SMTP to ${maskedEmail}`);
    await emailService.sendOtpEmail(user.email, plainOtp, user.name);
    console.log(`[Auth Diagnostic] OTP email successfully dispatched to ${maskedEmail}`);

    // Issue challenge token (temporary, limited to OTP verification, rejected by protect middleware)
    const challengeToken = generateChallengeToken({
      email: user.email,
      actionPurpose: 'LOGIN',
      otpId: otpRecord._id,
      userId: user._id,
    });

    res.status(200).json({
      success: true,
      requireOtp: true,
      message: "We've sent a verification code to your email address.",
      challengeToken,
      maskedEmail: otpService.maskEmail(user.email),
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    console.error(`[Auth Diagnostic] Sign-in failed at stage: ${error.name || 'Error'} - ${error.message?.split('\n')[0]}`);
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    next(error);
  }
};

// ── VERIFY OTP ───────────────────────────────────────────────
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { challengeToken, otp } = req.body;

    if (!challengeToken || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Verification challenge token and 6-digit OTP are required.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Your verification session has expired. Please sign in again.',
      });
    }

    if (decoded.purpose !== 'OTP_CHALLENGE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification session.',
      });
    }

    const verification = await otpService.verifyOtpSubmission({
      otpId: decoded.otpId,
      otp: String(otp).trim(),
      email: decoded.email,
      purpose: decoded.actionPurpose,
    });

    if (!verification.valid) {
      return res.status(verification.status || 400).json({
        success: false,
        message: verification.message,
        remainingAttempts: verification.remainingAttempts,
      });
    }

    // Process valid verification by purpose
    if (decoded.actionPurpose === 'LOGIN') {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      user.emailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      await user.save();

      const token = generateToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. Welcome back!',
        data: {
          token,
          user: {
            _id: user._id, id: user._id,
            name: user.name, email: user.email,
            university: user.university, course: user.course, semester: user.semester,
            section: user.section || '', rollNumber: user.rollNumber || '',
            profilePicture: user.profilePicture || null,
            onboardingCompleted: Boolean(user.onboardingCompleted),
          },
        },
      });
    }

    if (decoded.actionPurpose === 'SIGNUP') {
      const signupData = verification.record.signupData;
      if (!signupData) {
        return res.status(400).json({ success: false, message: 'Signup registration data not found.' });
      }

      const existingUser = await User.findOne({ email: signupData.email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      const newUser = await User.create({
        name: signupData.name,
        email: signupData.email.toLowerCase().trim(),
        password: signupData.password,
        university: signupData.university,
        course: signupData.course,
        semester: signupData.semester,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      // Send welcome email asynchronously
      emailService.sendWelcomeEmail(newUser.email, newUser.name).catch(() => {});

      const token = generateToken(newUser._id);
      return res.status(201).json({
        success: true,
        message: 'Account created and email verified successfully!',
        data: {
          token,
          user: {
            _id: newUser._id, id: newUser._id,
            name: newUser.name, email: newUser.email,
            university: newUser.university, course: newUser.course, semester: newUser.semester,
            section: newUser.section || '', rollNumber: newUser.rollNumber || '',
            profilePicture: newUser.profilePicture || null,
            onboardingCompleted: false,
          },
        },
      });
    }

    return res.status(400).json({ success: false, message: 'Unrecognized verification purpose.' });
  } catch (error) {
    next(error);
  }
};

// ── RESEND OTP ───────────────────────────────────────────────
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res, next) => {
  try {
    const { challengeToken } = req.body;

    if (!challengeToken) {
      return res.status(400).json({
        success: false,
        message: 'Challenge token is required to resend verification code.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Verification session has expired. Please sign in again.',
      });
    }

    if (decoded.purpose !== 'OTP_CHALLENGE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification session.',
      });
    }

    if (!emailService.isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email delivery service is not configured. Please configure SMTP_USER and SMTP_PASS in server/.env.',
      });
    }

    let recipientName = 'Student';
    if (decoded.userId) {
      const user = await User.findById(decoded.userId);
      if (user) recipientName = user.name;
    } else if (decoded.signupData && decoded.signupData.name) {
      recipientName = decoded.signupData.name;
    }

    const { otpRecord, plainOtp } = await otpService.createOtpChallenge({
      email: decoded.email,
      purpose: decoded.actionPurpose,
      userId: decoded.userId || null,
      signupData: decoded.signupData || null,
    });

    await emailService.sendOtpEmail(decoded.email, plainOtp, recipientName);

    const newChallengeToken = generateChallengeToken({
      email: decoded.email,
      actionPurpose: decoded.actionPurpose,
      otpId: otpRecord._id,
      userId: decoded.userId || null,
      signupData: decoded.signupData || null,
    });

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      challengeToken: newChallengeToken,
      maskedEmail: otpService.maskEmail(decoded.email),
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    next(error);
  }
};

// ── GET ME ────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// ── UPDATE PROFILE ─────────────────────────────────────────
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, university, course, semester, section, rollNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const errors = {};
    if (name !== undefined) {
      const n = sanitizeString(name);
      if (n.length < 2) errors.name = 'Name must be at least 2 characters.';
      else user.name = n;
    }
    if (university !== undefined) user.university = sanitizeString(university);
    if (course     !== undefined) user.course     = sanitizeString(course);
    if (semester   !== undefined) {
      const s = Number(semester);
      if (isNaN(s) || s < 1 || s > 8) errors.semester = 'Semester must be 1–8.';
      else user.semester = s;
    }
    if (section    !== undefined) user.section    = sanitizeString(section);
    if (rollNumber !== undefined) user.rollNumber = sanitizeString(rollNumber);

    if (req.body.onboardingCompleted !== undefined) {
      user.onboardingCompleted = Boolean(req.body.onboardingCompleted);
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
    }

    const updated = await user.save();
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          _id: updated._id, id: updated._id,
          name: updated.name, email: updated.email,
          university: updated.university, course: updated.course,
          semester: updated.semester, section: updated.section, rollNumber: updated.rollNumber,
          profilePicture: updated.profilePicture || null,
          onboardingCompleted: Boolean(updated.onboardingCompleted),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── CHANGE PASSWORD ────────────────────────────────────────
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({
        success: false, message: 'Current password is incorrect.',
        errors: { currentPassword: 'Current password is incorrect.' },
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false, message: 'New passwords do not match.',
        errors: { confirmPassword: 'New passwords do not match.' },
      });
    }
    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.valid) {
      return res.status(400).json({
        success: false, message: passCheck.message,
        errors: { newPassword: passCheck.message },
      });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── FORGOT PASSWORD ─────────────────────────────────────────
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !sanitizeString(email)) {
      return res.status(400).json({
        success: false,
        message: 'University email address is required.',
        errors: { email: 'University email address is required.' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check educational domain policy
    const emailCheck = validateEducationalEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message,
        errors: { email: emailCheck.message },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Generic safe response to prevent user enumeration
    const genericSuccessMsg = 'If an account exists for that email address, password reset instructions will be sent if the account is eligible.';

    if (!user) {
      // Intentionally return generic success without revealing email doesn't exist
      return res.status(200).json({
        success: true,
        message: genericSuccessMsg,
      });
    }

    // Verify SMTP service availability
    if (!emailService.isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email delivery service is not configured. Please configure SMTP_USER and SMTP_PASS in server/.env.',
      });
    }

    // Generate cryptographically secure 32-byte reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token with 15-minute expiration
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save({ validateBeforeSave: false });

    // Construct reset link using configured CLIENT_URL or request origin
    let clientBaseUrl = process.env.CLIENT_URL;
    if (!clientBaseUrl || clientBaseUrl.includes('localhost') || clientBaseUrl.includes('127.0.0.1')) {
      const incomingOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
      if (incomingOrigin && /^https?:\/\//i.test(incomingOrigin)) {
        clientBaseUrl = incomingOrigin;
      }
    }
    const clientUrl = (clientBaseUrl || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Dispatch email
    await emailService.sendPasswordResetEmail(user.email, resetUrl, user.name);

    return res.status(200).json({
      success: true,
      message: genericSuccessMsg,
    });
  } catch (error) {
    next(error);
  }
};

// ── RESET PASSWORD ──────────────────────────────────────────
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    const errors = {};

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required or link is malformed.',
        errors: { token: 'Password reset token is missing.' },
      });
    }

    if (!password) {
      errors.password = 'New password is required.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.', errors });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
        errors: { confirmPassword: 'Passwords do not match.' },
      });
    }

    // Password strength check
    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      return res.status(400).json({
        success: false,
        message: passCheck.message,
        errors: { password: passCheck.message },
      });
    }

    // Hash submitted token to compare with DB
    const hashedToken = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    // Find user with active, unexpired reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired. Please request a new link.',
      });
    }

    // Update password and clear reset token fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// ── UPLOAD PROFILE PHOTO ───────────────────────────────────
// @route   POST /api/auth/profile/photo
// @access  Private
const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided. Please choose a JPEG, PNG, or WebP photo.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Clean up previous custom avatar file if present
    if (user.profilePicture && user.profilePicture.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore cleanup error */ }
      }
    }

    const photoUrl = `/uploads/avatars/${req.file.filename}`;
    user.profilePicture = photoUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully.',
      data: {
        profilePicture: photoUrl,
        user: {
          _id: user._id, id: user._id,
          name: user.name, email: user.email,
          university: user.university, course: user.course,
          semester: user.semester, section: user.section || '', rollNumber: user.rollNumber || '',
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE PROFILE PHOTO ───────────────────────────────────
// @route   DELETE /api/auth/profile/photo
// @access  Private
const deleteProfilePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.profilePicture && user.profilePicture.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore cleanup error */ }
      }
    }

    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo removed.',
      data: {
        profilePicture: null,
        user: {
          _id: user._id, id: user._id,
          name: user.name, email: user.email,
          university: user.university, course: user.course,
          semester: user.semester, section: user.section || '', rollNumber: user.rollNumber || '',
          profilePicture: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
