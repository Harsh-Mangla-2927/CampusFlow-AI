/**
 * Automated Verification Test Suite for Forgot Password & Password Reset Flow
 * CampusFlow AI
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({ path: __dirname + '/.env' });

const User = require('./models/User');
const OtpVerification = require('./models/OtpVerification');
const otpService = require('./services/otpService');
const connectDB = require('./config/db');

const BASE_URL = 'http://localhost:8000/api';

async function runResetTests() {
  console.log('🧪 Starting CampusFlow AI Forgot Password & Password Reset Verification Suite...\n');

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

  // Connect to MongoDB using project's resilient connectDB helper
  await connectDB();
  console.log('  📦 Connected to MongoDB for cryptographic audit\n');

  const testEmail = 'harsh@chitkara.edu.in';
  const initialPassword = 'demo1234';
  const newPassword = 'NewSecretPassword@2026';

  try {
    // 1. Validation: Missing Email
    console.log('--- 1. Testing Forgot Password Input Validation ---');
    const res1 = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const d1 = await res1.json();
    assert(
      res1.status === 400 && (d1.message.includes('required') || d1.message.includes('university email')),
      'Missing email returns 400 with helpful validation message'
    );

    // 2. Validation: Unauthorized Domain (e.g. gmail.com)
    const res2 = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'intruder@gmail.com' }),
    });
    const d2 = await res2.json();
    assert(
      res2.status === 400 && (d2.message.includes('approved university') || d2.message.includes('educational email')),
      'Non-university domain rejected with 400'
    );

    // 3. User Enumeration Protection: Non-existent university email
    console.log('\n--- 2. Testing Account Enumeration Defense ---');
    const res3 = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent999@chitkara.edu.in' }),
    });
    const d3 = await res3.json();
    assert(
      res3.status === 200 && d3.message.includes('If an account exists'),
      'Non-existent university email returns identical 200 success response without disclosing registration state'
    );

    // 4. Request Password Reset for Existing Account
    console.log('\n--- 3. Testing Password Reset Request & Token Generation ---');
    const res4 = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const d4 = await res4.json();
    assert(
      res4.status === 200 && d4.message.includes('If an account exists'),
      'Valid university email returns 200 confirmation message'
    );

    // Inspect MongoDB for Cryptographic Token Storage
    const userInDb = await User.findOne({ email: testEmail }).select('+passwordResetToken +passwordResetExpires');
    assert(!!userInDb.passwordResetToken, 'User record in MongoDB has passwordResetToken populated');
    assert(
      typeof userInDb.passwordResetToken === 'string' && userInDb.passwordResetToken.length === 64,
      'Token is stored as 64-character SHA-256 hash (never plaintext)'
    );
    assert(!!userInDb.passwordResetExpires, 'User record has passwordResetExpires timestamp');

    const minutesUntilExpiry = (userInDb.passwordResetExpires.getTime() - Date.now()) / (60 * 1000);
    assert(
      minutesUntilExpiry > 13 && minutesUntilExpiry <= 15,
      `Token expiration window is configured for 15 minutes (currently ${minutesUntilExpiry.toFixed(2)} min remaining)`
    );

    // We generate a deterministic known plaintext token for our controlled functional tests
    console.log('\n--- 4. Testing Reset Password Token Security & Validation ---');
    const rawTestToken = crypto.randomBytes(32).toString('hex');
    const hashedTestToken = crypto.createHash('sha256').update(rawTestToken).digest('hex');

    // Inject this test token on the user
    userInDb.passwordResetToken = hashedTestToken;
    userInDb.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await userInDb.save();

    // 5. Reset with missing token
    const res5 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword, confirmPassword: newPassword }),
    });
    const d5 = await res5.json();
    assert(
      res5.status === 400 && (d5.message.includes('token') || d5.message.includes('required')),
      'Missing reset token returns 400'
    );

    // 6. Reset with mismatched confirmation password
    const res6 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawTestToken, password: newPassword, confirmPassword: 'DifferentPassword123' }),
    });
    const d6 = await res6.json();
    assert(res6.status === 400 && d6.message.includes('Passwords do not match'), 'Mismatched passwords rejected with 400');

    // 7. Reset with weak password (< 8 chars)
    const res7 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawTestToken, password: '123', confirmPassword: '123' }),
    });
    const d7 = await res7.json();
    assert(
      res7.status === 400 && (d7.message.includes('at least') || d7.message.includes('characters')),
      'Password shorter than policy rejected with 400'
    );

    // 8. Reset with invalid / tampered token
    const res8 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'fake_tampered_token_abc123', password: newPassword, confirmPassword: newPassword }),
    });
    const d8 = await res8.json();
    assert(res8.status === 400 && d8.message.includes('invalid or has expired'), 'Invalid/tampered token rejected with 400');

    // 9. Reset with expired token
    userInDb.passwordResetExpires = new Date(Date.now() - 5000); // 5 seconds in the past
    await userInDb.save();

    const res9 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawTestToken, password: newPassword, confirmPassword: newPassword }),
    });
    const d9 = await res9.json();
    assert(res9.status === 400 && d9.message.includes('invalid or has expired'), 'Expired reset token rejected with 400');

    // 10. Successful Password Reset Execution
    console.log('\n--- 5. Testing Successful Password Reset Execution ---');
    // Refresh token with fresh valid expiration
    userInDb.passwordResetToken = hashedTestToken;
    userInDb.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await userInDb.save();

    const res10 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawTestToken, password: newPassword, confirmPassword: newPassword }),
    });
    const d10 = await res10.json();
    assert(res10.status === 200 && d10.success, 'Valid reset token updates password successfully');
    assert(!d10.token && !d10.data?.token, 'Reset response does NOT auto-login or issue session tokens');

    // 11. Verify token invalidation in DB and single-use enforcement
    const userAfterReset = await User.findOne({ email: testEmail }).select('+passwordResetToken +passwordResetExpires');
    assert(!userAfterReset.passwordResetToken && !userAfterReset.passwordResetExpires, 'Reset token and expiration cleared from MongoDB after use');

    // Attempting to reuse the exact same token must fail
    const res11 = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawTestToken, password: 'AnotherPassword999!', confirmPassword: 'AnotherPassword999!' }),
    });
    const d11 = await res11.json();
    assert(res11.status === 400 && d11.message.includes('invalid or has expired'), 'Single-use enforcement: Reusing consumed reset token is rejected with 400');

    // 12. Verify Old Password Login Fails
    console.log('\n--- 6. Verifying Password Change Invalidation ---');
    const res12 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    });
    assert(res12.status === 401, 'Login with old password fails with 401 Unauthorized');

    // 13. Verify Login with New Password & Email OTP Preservation
    console.log('\n--- 7. Verifying Login with New Password & Preservation of Email OTP Flow ---');
    // Clear cooldown for test email
    await OtpVerification.deleteMany({ email: testEmail });

    const res13 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword }),
    });
    const d13 = await res13.json();
    assert(res13.status === 200 && d13.requireOtp === true, 'Login with new password succeeds and mandates Email OTP verification (requireOtp: true)');
    assert(!!d13.challengeToken, 'Temporary OTP challenge token returned for step 2');
    assert(!d13.data?.token, 'User is NOT authenticated before OTP is verified');

    // Retrieve the OTP record created by login and inject a deterministic hash for testing verification
    const testOtpCode = '654321';
    const latestOtp = await OtpVerification.findOne({ email: testEmail }).sort({ createdAt: -1 });
    assert(!!latestOtp, 'Login OTP verification record created in MongoDB');

    latestOtp.otpHash = otpService.hashOtp(testOtpCode);
    await latestOtp.save();

    const res14 = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeToken: d13.challengeToken,
        otp: testOtpCode,
      }),
    });
    const d14 = await res14.json();
    assert(res14.status === 200 && !!d14.data?.token, 'Email OTP verification succeeds and issues final authenticated JWT');

    // Test access to protected route with the new JWT
    const res15 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${d14.data.token}` },
    });
    const d15 = await res15.json();
    assert(res15.status === 200 && d15.success, 'Protected dashboard accessible with authenticated session');

    // 14. Reset password back to original demo1234 for consistency
    console.log('\n--- 8. Clean Up & Restore Demo Password ---');
    const restoreUser = await User.findOne({ email: testEmail });
    restoreUser.password = initialPassword;
    await restoreUser.save();
    console.log('  🔒 Restored original demo password (demo1234) for harsh@chitkara.edu.in');

    const resVerify = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    });
    const dVerify = await resVerify.json();
    assert(resVerify.status === 200 && dVerify.requireOtp === true, 'Restored password validated and ready for demo login');

  } catch (err) {
    console.error('💥 Unexpected error during test run:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n========================================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================\n`);
    if (failed > 0) process.exit(1);
  }
}

runResetTests();
