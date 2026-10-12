/**
 * Automated Verification Test Suite for OTP & Authentication Flow
 * CampusFlow AI
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });

const User = require('./models/User');
const OtpVerification = require('./models/OtpVerification');
const otpService = require('./services/otpService');
const emailService = require('./services/emailService');

const BASE_URL = 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting CampusFlow AI OTP & Authentication Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Health Endpoint
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert(res.status === 200 && data.success, 'Health check responds with success');
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. Test Invalid Credentials
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'harsh@chitkara.edu.in',
        password: 'wrongpassword999',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.message === 'Invalid email or password.',
      'Invalid password returns 401 "Invalid email or password."'
    );
    assert(!data.data?.token, 'No token issued for invalid password');
  } catch (err) {
    assert(false, `Login test error: ${err.message}`);
  }

  // 3. Test Email Service Configuration Check
  const isConfigured = emailService.isEmailConfigured();
  console.log(`\n  ℹ️ Current SMTP configured status: ${isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED (Safe mode)'}`);

  if (!isConfigured) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'harsh@chitkara.edu.in',
          password: 'demo1234',
        }),
      });
      const data = await res.json();
      assert(
        res.status === 503 && data.message.includes('Email delivery service is not configured'),
        'Unconfigured SMTP returns 503 with helpful setup instructions (No fake delivery!)'
      );
    } catch (err) {
      assert(false, `Unconfigured SMTP test error: ${err.message}`);
    }
  }

  // 4. Test OTP Model & Security Unit Functions
  console.log('\n  🔐 Testing OTP Cryptography, Hashing, and Storage:');
  const testEmail = 'otp_test_student@chitkara.edu.in';
  
  // Connect to DB directly for low-level verification
  const conn = await mongoose.connect(process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow');

  // Clean old test records
  await OtpVerification.deleteMany({ email: testEmail });

  const challenge1 = await otpService.createOtpChallenge({
    email: testEmail,
    purpose: 'LOGIN',
  });

  assert(challenge1.plainOtp.length === 6, 'Generated OTP is exactly 6 digits');
  assert(/^\d{6}$/.test(challenge1.plainOtp), 'Generated OTP is purely numeric');
  assert(challenge1.otpRecord.otpHash !== challenge1.plainOtp, 'Stored record does NOT contain plaintext OTP');
  assert(challenge1.otpRecord.otpHash === otpService.hashOtp(challenge1.plainOtp), 'Stored hash matches SHA-256 of OTP');

  // Test cooldown on rapid consecutive request
  try {
    await otpService.createOtpChallenge({ email: testEmail, purpose: 'LOGIN' });
    assert(false, 'Should block rapid re-request under 60 seconds');
  } catch (cooldownErr) {
    assert(cooldownErr.status === 429, 'Blocks rapid re-request with 429 cooldown');
  }

  // 5. Test Verification Attempt Limit & Single-Use
  console.log('\n  🛡️ Testing OTP Verification Logic:');

  // Test incorrect OTP
  const wrongAttempt = await otpService.verifyOtpSubmission({
    otpId: challenge1.otpRecord._id,
    otp: '000000',
    email: testEmail,
    purpose: 'LOGIN',
  });
  assert(!wrongAttempt.valid && wrongAttempt.status === 400, 'Wrong OTP is rejected');

  // Test correct OTP
  const correctAttempt = await otpService.verifyOtpSubmission({
    otpId: challenge1.otpRecord._id,
    otp: challenge1.plainOtp,
    email: testEmail,
    purpose: 'LOGIN',
  });
  assert(correctAttempt.valid === true, 'Correct OTP is accepted');
  assert(correctAttempt.record.consumedAt !== null, 'OTP is marked consumed');

  // Test OTP Reuse (Replay Attack Prevention)
  const reuseAttempt = await otpService.verifyOtpSubmission({
    otpId: challenge1.otpRecord._id,
    otp: challenge1.plainOtp,
    email: testEmail,
    purpose: 'LOGIN',
  });
  assert(!reuseAttempt.valid && reuseAttempt.message.includes('already been used'), 'Replay attack prevented: Consumed OTP cannot be reused');

  // 6. Test Challenge Token Cannot Access Protected Endpoints
  console.log('\n  🚫 Testing Challenge Token Rejection on Protected Endpoints:');
  const dummyChallengeToken = jwt.sign(
    { purpose: 'OTP_CHALLENGE', email: testEmail, otpId: challenge1.otpRecord._id },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  try {
    const res = await fetch(`${BASE_URL}/subjects`, {
      headers: { Authorization: `Bearer ${dummyChallengeToken}` },
    });
    assert(res.status === 401, 'Protected endpoints strictly return 401 when presented with challenge token');
  } catch (err) {
    assert(false, `Protected route test error: ${err.message}`);
  }

  // 7. Test Email Masking Helper
  assert(otpService.maskEmail('harsh@chitkara.edu.in') === 'h***@chitkara.edu.in', 'Email masking masks username properly: harsh@chitkara.edu.in -> h***@chitkara.edu.in');
  assert(otpService.maskEmail('student@campusflow.ai') === 's***@campusflow.ai', 'Email masking works for campusflow.ai');

  // Cleanup test OTPs
  await OtpVerification.deleteMany({ email: testEmail });
  await mongoose.disconnect();

  console.log(`\n====================================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`====================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
