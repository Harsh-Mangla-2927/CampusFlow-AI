/**
 * Automated End-to-End API and Flow Verification Suite
 * Tests all CampusFlow AI backend services and endpoints.
 */

const http = require('http');
require('dotenv').config({ path: __dirname + '/.env' });

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 RUNNING CAMPUSFLOW AI AUTOMATED END-TO-END SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Health check
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/health',
      method: 'GET',
    });
    assert(res.status === 200 && res.data.success === true, 'GET /api/health returns 200 OK');
  } catch (err) {
    assert(false, `GET /api/health connection failed: ${err.message}`);
  }

  // 2. Invalid Login
  let loginToken = null;
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'harsh@chitkara.edu.in', password: 'wrong_password_999' });

    assert(res.status === 401 && res.data.success === false && res.data.message === 'Invalid email or password.', 'POST /api/auth/login with wrong credentials cleanly returns 401 with message');
  } catch (err) {
    assert(false, `Invalid login test failed: ${err.message}`);
  }

  // 3. Valid Login
  let studentUser = null;
  try {
    // Connect to Mongo directly to create test challenge for e2e suite verification
    const mongoose = require('mongoose');
    const User = require('./models/User');
    const otpService = require('./services/otpService');
    const jwt = require('jsonwebtoken');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow');
    }

    const testUser = await User.findOne({ email: 'harsh@chitkara.edu.in' });
    const OtpVerification = require('./models/OtpVerification');
    await OtpVerification.deleteMany({ email: testUser.email });

    const { otpRecord, plainOtp } = await otpService.createOtpChallenge({
      email: testUser.email,
      purpose: 'LOGIN',
      userId: testUser._id,
    });

    const testChallengeToken = jwt.sign(
      { purpose: 'OTP_CHALLENGE', actionPurpose: 'LOGIN', email: testUser.email, otpId: otpRecord._id, userId: testUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Test verifying with WRONG OTP first
    const wrongRes = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { challengeToken: testChallengeToken, otp: '000000' });

    assert(wrongRes.status === 400 && wrongRes.data.success === false, 'POST /api/auth/verify-otp rejects incorrect OTP code with 400');

    // Test verifying with CORRECT OTP
    const validRes = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { challengeToken: testChallengeToken, otp: plainOtp });

    assert(validRes.status === 200 && validRes.data.success === true && Boolean(validRes.data.data.token), 'POST /api/auth/verify-otp with valid code issues authentication token');
    loginToken = validRes.data?.data?.token;
    studentUser = validRes.data?.data?.user;
    assert(studentUser?.email === 'harsh@chitkara.edu.in', 'Authenticated user matches student profile');
  } catch (err) {
    assert(false, `OTP verification flow failed: ${err.message}`);
  }

  if (!loginToken) {
    console.error('Fatal: Cannot continue tests without login token.');
    process.exit(1);
  }

  const authHeaders = {
    'Authorization': `Bearer ${loginToken}`,
    'Content-Type': 'application/json',
  };

  // 4. GET /api/auth/me
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/me',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && res.data.success === true, 'GET /api/auth/me authenticates user profile');
  } catch (err) {
    assert(false, `GET /api/auth/me failed: ${err.message}`);
  }

  // 5. GET /api/dashboard
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/dashboard',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && res.data.success === true, 'GET /api/dashboard returns 200 with aggregated intelligence');
    assert(typeof res.data.data.academicHealth === 'number', 'Academic Health score computed');
    assert(Array.isArray(res.data.data.todaysFocus) && res.data.data.todaysFocus.length > 0, 'Priority engine queue populated with scored tasks');
    assert(Array.isArray(res.data.data.academicAlerts), 'Academic risk engine evaluated');
  } catch (err) {
    assert(false, `GET /api/dashboard failed: ${err.message}`);
  }

  // 6. GET /api/subjects
  let firstSubjectId = null;
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/subjects',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && Array.isArray(res.data.data) && res.data.data.length >= 5, 'GET /api/subjects returns enrolled university courses (5 subjects)');
    firstSubjectId = res.data.data[0]?._id;
  } catch (err) {
    assert(false, `GET /api/subjects failed: ${err.message}`);
  }

  // 7. GET /api/tasks
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/tasks',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && Array.isArray(res.data.data) && res.data.data.length > 0, 'GET /api/tasks returns student assignments and obligations');
  } catch (err) {
    assert(false, `GET /api/tasks failed: ${err.message}`);
  }

  // 8. GET /api/exams
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/exams',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && Array.isArray(res.data.data) && res.data.data.length > 0, 'GET /api/exams returns scheduled exams and internal assessments');
  } catch (err) {
    assert(false, `GET /api/exams failed: ${err.message}`);
  }

  // 9. GET /api/study-plans
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/study-plans',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && Array.isArray(res.data.data), 'GET /api/study-plans returns generated daily study schedules');
  } catch (err) {
    assert(false, `GET /api/study-plans failed: ${err.message}`);
  }

  // 10. GET /api/analytics
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/analytics',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && res.data.success === true && typeof res.data.data.academicHealth === 'number', 'GET /api/analytics computes full academic analytics');
  } catch (err) {
    assert(false, `GET /api/analytics failed: ${err.message}`);
  }

  // 11. GET /api/recommendations
  try {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/recommendations',
      method: 'GET',
      headers: authHeaders,
    });
    assert(res.status === 200 && Array.isArray(res.data.data) && res.data.data.length > 0, 'GET /api/recommendations generates explainable actionable items');
  } catch (err) {
    assert(false, `GET /api/recommendations failed: ${err.message}`);
  }

  // 12. Attendance mark and history
  if (firstSubjectId) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request({
        hostname: 'localhost',
        port: 8000,
        path: `/api/subjects/${firstSubjectId}/attendance`,
        method: 'POST',
        headers: authHeaders,
      }, { status: 'PRESENT', date: today, topic: 'Verification Session' });

      // Either 200 / 201 success or 409 already recorded today
      assert(res.status === 200 || res.status === 201 || res.status === 409, 'POST /api/subjects/:id/attendance handles session recording');

      const historyRes = await request({
        hostname: 'localhost',
        port: 8000,
        path: `/api/subjects/${firstSubjectId}/attendance`,
        method: 'GET',
        headers: authHeaders,
      });
      assert(historyRes.status === 200 && Array.isArray(historyRes.data.data?.sessions), 'GET /api/subjects/:id/attendance returns attendance history logs');
    } catch (err) {
      assert(false, `Attendance testing failed: ${err.message}`);
    }
  }

  // 13. Vite Proxy Verification
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5173,
      path: '/api/health',
      method: 'GET',
    });
    assert(res.status === 200 && res.data.success === true, 'Vite dev proxy (port 5173 -> 8000) routes API correctly');
  } catch (err) {
    assert(false, `Vite proxy test failed: ${err.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
