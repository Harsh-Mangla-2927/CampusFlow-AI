/**
 * OTP Service — CampusFlow AI
 *
 * Cryptographically secure OTP generation, database-backed storage,
 * single-use enforcement, attempt limits, expiration, and SHA-256 hashing.
 */

'use strict';

const crypto = require('crypto');
const OtpVerification = require('../models/OtpVerification');

const OTP_EXPIRY_MS = (parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5) * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = (parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 60) * 1000; // 60 seconds
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5;

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
function generateSecureOtp() {
  const num = crypto.randomInt(100000, 1000000); // 100000 to 999999 inclusive
  return num.toString();
}

/**
 * Hash an OTP using SHA-256 before database storage or comparison.
 */
function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

/**
 * Mask an email for user-facing display (e.g. h***@chitkara.edu.in).
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  const maskedLocal = local.length > 0 ? `${local[0]}***` : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Create a new OTP verification record in the database.
 * Invalidates any prior active OTPs for the same email and purpose.
 * Enforces resend cooldown.
 *
 * @param {Object} options
 * @param {string} options.email
 * @param {string} [options.purpose='LOGIN'] - 'LOGIN' | 'SIGNUP'
 * @param {string} [options.userId]
 * @param {Object} [options.signupData]
 * @returns {Promise<{ otpRecord: Object, plainOtp: string }>}
 */
async function createOtpChallenge({ email, purpose = 'LOGIN', userId = null, signupData = null }) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  // Find recent active OTP to enforce resend cooldown
  const latestActive = await OtpVerification.findOne({
    email: normalizedEmail,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (latestActive && latestActive.resendAvailableAt > now) {
    const retryAfter = Math.ceil((latestActive.resendAvailableAt.getTime() - now.getTime()) / 1000);
    const error = new Error(`Please wait ${retryAfter} seconds before requesting a new code.`);
    error.status = 429;
    error.retryAfterSeconds = retryAfter;
    throw error;
  }

  // Invalidate previous active OTPs for this email + purpose
  await OtpVerification.updateMany(
    { email: normalizedEmail, purpose, consumedAt: null },
    { consumedAt: now }
  );

  const plainOtp = generateSecureOtp();
  const otpHash = hashOtp(plainOtp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
  const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_MS);

  const otpRecord = await OtpVerification.create({
    userId,
    email: normalizedEmail,
    purpose,
    otpHash,
    expiresAt,
    resendAvailableAt,
    maxAttempts: MAX_ATTEMPTS,
    attempts: 0,
    consumedAt: null,
    signupData,
  });

  return { otpRecord, plainOtp };
}

/**
 * Verify submitted OTP against database record.
 *
 * @param {Object} options
 * @param {string} options.otpId
 * @param {string} options.otp
 * @param {string} options.email
 * @param {string} options.purpose
 * @returns {Promise<{ valid: boolean, message?: string, status?: number, record?: Object }>}
 */
async function verifyOtpSubmission({ otpId, otp, email, purpose }) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const query = {};

  if (otpId) {
    query._id = otpId;
  } else {
    query.email = normalizedEmail;
    query.purpose = purpose;
  }

  const record = await OtpVerification.findOne(query).sort({ createdAt: -1 });

  if (!record) {
    return {
      valid: false,
      status: 400,
      message: 'Invalid verification code. Please request a new code.',
    };
  }

  if (record.consumedAt) {
    return {
      valid: false,
      status: 400,
      message: 'This verification code has already been used. Please request a new code.',
    };
  }

  const now = new Date();
  if (record.expiresAt < now) {
    return {
      valid: false,
      status: 400,
      message: 'Your verification code has expired. Request a new code.',
    };
  }

  if (record.attempts >= record.maxAttempts) {
    return {
      valid: false,
      status: 429,
      message: 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  const submittedHash = hashOtp(otp);
  if (submittedHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return {
      valid: false,
      status: 400,
      message: 'Invalid verification code. Please try again.',
      remainingAttempts: Math.max(0, record.maxAttempts - record.attempts),
    };
  }

  // Mark as consumed
  record.consumedAt = now;
  await record.save();

  return {
    valid: true,
    record,
  };
}

module.exports = {
  createOtpChallenge,
  verifyOtpSubmission,
  maskEmail,
  hashOtp,
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
};
