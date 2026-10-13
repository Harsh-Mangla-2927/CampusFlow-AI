/**
 * Test Attendance Suite — CampusFlow AI
 *
 * Verifies:
 *  1. Pure mathematical attendance functions (edge cases, 100% target, 0 classes)
 *  2. Consecutively required classes formula: ceil((target * conducted - attended) / (1 - target))
 *  3. Allowable missed classes formula: floor((attended - target * conducted) / target)
 *  4. Standing determination (Good Standing, Warning, Attendance Shortage)
 *  5. Insights and shortfall rankings
 *  6. API routes and authorization protection
 */

'use strict';

require('dotenv').config({ path: __dirname + '/.env' });
const assert = require('assert');
const {
  calculatePercentage,
  determineStanding,
  calculateClassesToAttend,
  calculateClassesCanMiss,
  generateInsights,
} = require('./utils/attendanceCalculations');

console.log('\n========================================');
console.log('🧪 RUNNING CAMPUSFLOW ATTENDANCE TEST SUITE');
console.log('========================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

// ── 1. Attendance Percentage ──────────────────────────────────────────
console.log('1. Attendance Percentage Calculation:');

runTest('Handles 0 conducted classes safely (returns 0%)', () => {
  assert.strictEqual(calculatePercentage(0, 0), 0);
  assert.strictEqual(calculatePercentage(5, 0), 0);
});

runTest('Calculates accurate rounded percentage (e.g. 15 / 20 = 75%)', () => {
  assert.strictEqual(calculatePercentage(15, 20), 75);
});

runTest('Calculates decimal percentage rounded to 1 decimal place (e.g. 17 / 22 = 77.3%)', () => {
  assert.strictEqual(calculatePercentage(17, 22), 77.3);
});

runTest('Never hardcodes attendance values', () => {
  assert.strictEqual(calculatePercentage(9, 10), 90);
  assert.strictEqual(calculatePercentage(3, 4), 75);
  assert.strictEqual(calculatePercentage(1, 2), 50);
});

// ── 2. Standing Determination ─────────────────────────────────────────
console.log('\n2. Standing Classification:');

runTest('Zero classes returns NO_DATA status', () => {
  const standing = determineStanding(0, 75, 0);
  assert.strictEqual(standing.status, 'NO_DATA');
  assert.strictEqual(standing.isShortage, false);
});

runTest('Percentage >= threshold + 5 returns GOOD_STANDING', () => {
  const standing = determineStanding(82, 75, 20);
  assert.strictEqual(standing.status, 'GOOD_STANDING');
  assert.strictEqual(standing.isShortage, false);
});

runTest('Percentage between threshold and threshold + 5 returns WARNING', () => {
  const standing = determineStanding(76, 75, 20);
  assert.strictEqual(standing.status, 'WARNING');
  assert.strictEqual(standing.isShortage, false);
});

runTest('Percentage below threshold returns SHORTAGE', () => {
  const standing = determineStanding(72, 75, 20);
  assert.strictEqual(standing.status, 'SHORTAGE');
  assert.strictEqual(standing.isShortage, true);
});

// ── 3. Consecutive Classes Required (Attendly Calculator) ─────────────
console.log('\n3. Classes Required Calculator (Formula Verification):');

// Formula: ceil((target * conducted - attended) / (1 - target))
// Example: conducted = 20, attended = 12 (60%), target = 75% (0.75)
// numerator = 0.75 * 20 - 12 = 15 - 12 = 3
// denominator = 1 - 0.75 = 0.25
// required = ceil(3 / 0.25) = 12
// Verification: attended 12 + 12 = 24, conducted 20 + 12 = 32. 24 / 32 = 75.0%
runTest('Calculates required consecutive classes for 75% target (20 conducted, 12 attended → 12 needed)', () => {
  const res = calculateClassesToAttend(12, 20, 75);
  assert.strictEqual(res.required, 12);
  assert.strictEqual(res.isMet, false);
  assert.strictEqual(res.impossible, false);
});

// Example: conducted = 20, attended = 15 (75%), target = 75%
// Target already met → required = 0
runTest('Target already met returns 0 required classes', () => {
  const res = calculateClassesToAttend(15, 20, 75);
  assert.strictEqual(res.required, 0);
  assert.strictEqual(res.isMet, true);
});

// Example: target = 80%, conducted = 10, attended = 6 (60%)
// numerator = 0.8 * 10 - 6 = 8 - 6 = 2
// denominator = 1 - 0.8 = 0.2
// required = ceil(2 / 0.2) = 10
// Verification: attended 16 / 20 = 80%
runTest('Calculates required classes for 80% target (10 conducted, 6 attended → 10 needed)', () => {
  const res = calculateClassesToAttend(6, 10, 80);
  assert.strictEqual(res.required, 10);
  assert.strictEqual(res.isMet, false);
});

// Example: target = 85%, conducted = 20, attended = 15 (75%)
// numerator = 0.85 * 20 - 15 = 17 - 15 = 2
// denominator = 1 - 0.85 = 0.15
// required = ceil(2 / 0.15) = ceil(13.333) = 14
// Verification: attended 15 + 14 = 29, conducted 20 + 14 = 34. 29 / 34 = 85.29% >= 85%
runTest('Calculates required classes for 85% target (20 conducted, 15 attended → 14 needed)', () => {
  const res = calculateClassesToAttend(15, 20, 85);
  assert.strictEqual(res.required, 14);
});

// Target = 100% edge case:
// If attended < conducted (even 1 class missed), 100% is mathematically impossible forever
runTest('Handles 100% target when classes have been missed (returns impossible: true, no division by zero)', () => {
  const res = calculateClassesToAttend(19, 20, 100);
  assert.strictEqual(res.impossible, true);
  assert.strictEqual(res.required, null);
  assert.ok(res.message.includes('impossible'));
});

runTest('Handles 100% target when 0 classes have been missed (returns isMet: true)', () => {
  const res = calculateClassesToAttend(20, 20, 100);
  assert.strictEqual(res.impossible, false);
  assert.strictEqual(res.required, 0);
  assert.strictEqual(res.isMet, true);
});

// ── 4. Allowable Misses Calculator ────────────────────────────────────
console.log('\n4. Allowable Classes to Miss (Bunk Calculator):');

// Formula: floor((attended - target * conducted) / target)
// Example: conducted = 20, attended = 18 (90%), target = 75% (0.75)
// numerator = 18 - (0.75 * 20) = 18 - 15 = 3
// denominator = 0.75
// canMiss = floor(3 / 0.75) = 4
// Verification: attended 18 / (20 + 4 = 24) = 18 / 24 = 75.0%
runTest('Calculates allowable classes to miss (20 conducted, 18 attended, 75% target → 4 can miss)', () => {
  const res = calculateClassesCanMiss(18, 20, 75);
  assert.strictEqual(res.canMiss, 4);
});

runTest('When current percentage is below target, canMiss returns 0', () => {
  const res = calculateClassesCanMiss(12, 20, 75);
  assert.strictEqual(res.canMiss, 0);
});

runTest('When target is 100%, canMiss is always 0', () => {
  const res = calculateClassesCanMiss(20, 20, 100);
  assert.strictEqual(res.canMiss, 0);
});

// ── 5. Insights & Shortfall Ranking ──────────────────────────────────
console.log('\n5. Transparent Rule-Based Insights:');

runTest('Ranks subjects by highest attendance shortfall accurately', () => {
  const mockSubjects = [
    { _id: '1', name: 'Math', code: 'M101', totalClasses: 20, attendedClasses: 18, missedClasses: 2, attendancePercentage: 90 },
    { _id: '2', name: 'Physics', code: 'P101', totalClasses: 20, attendedClasses: 13, missedClasses: 7, attendancePercentage: 65 },
    { _id: '3', name: 'Chemistry', code: 'C101', totalClasses: 20, attendedClasses: 14, missedClasses: 6, attendancePercentage: 70 },
  ];

  const insights = generateInsights(mockSubjects, 75);
  assert.strictEqual(insights.shortageCount, 2);
  assert.strictEqual(insights.safeCount, 1);
  assert.strictEqual(insights.highestShortfall.name, 'Physics');
  assert.strictEqual(insights.highestShortfall.gap, 10);
});

// ── 6. HTTP API Endpoint Verification ────────────────────────────────
const http = require('http');

function httpRequest(options, bodyData) {
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

async function runHttpTests() {
  console.log('\n6. HTTP Route Protection & Endpoint Tests:');

  try {
    // A. Unauthenticated access to /api/attendance/summary
    const unauthSummary = await httpRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/attendance/summary',
      method: 'GET',
    });
    if (unauthSummary.status === 401 && unauthSummary.data?.success === false) {
      console.log('  ✓ GET /api/attendance/summary rejects unauthenticated requests with 401');
      passedTests++;
    } else {
      console.error('  ✗ GET /api/attendance/summary failed auth rejection');
      failedTests++;
    }

    // B. Unauthenticated access to /api/attendance/source-status
    const unauthSource = await httpRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/attendance/source-status',
      method: 'GET',
    });
    if (unauthSource.status === 401 && unauthSource.data?.success === false) {
      console.log('  ✓ GET /api/attendance/source-status rejects unauthenticated requests with 401');
      passedTests++;
    } else {
      console.error('  ✗ GET /api/attendance/source-status failed auth rejection');
      failedTests++;
    }

    // C. Unauthenticated access to /api/attendance/calculator
    const unauthCalc = await httpRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/attendance/calculator',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { attended: 10, conducted: 12, target: 75 });
    if (unauthCalc.status === 401 && unauthCalc.data?.success === false) {
      console.log('  ✓ POST /api/attendance/calculator rejects unauthenticated requests with 401');
      passedTests++;
    } else {
      console.error('  ✗ POST /api/attendance/calculator failed auth rejection');
      failedTests++;
    }

    // D. Authenticate via User & JWT
    const mongoose = require('mongoose');
    const User = require('./models/User');
    const jwt = require('jsonwebtoken');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow');
    }

    const testUser = await User.findOne({ email: 'harsh@chitkara.edu.in' }) || await User.findOne();
    if (!testUser) {
      console.log('  ⚠ Skipping authenticated tests (no test user found in DB).');
      return;
    }

    const authToken = jwt.sign(
      { id: testUser._id, role: testUser.role || 'STUDENT' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // E. Authenticated GET /api/attendance/summary
    const authSummary = await httpRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/attendance/summary?threshold=75',
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (authSummary.status === 200 && authSummary.data?.success === true && authSummary.data?.data?.overall) {
      console.log('  ✓ Authenticated GET /api/attendance/summary returns 200 with overall and subjects data');
      passedTests++;
    } else {
      console.error('  ✗ Authenticated GET /api/attendance/summary failed:', authSummary);
      failedTests++;
    }

    // F. Authenticated POST /api/attendance/calculator
    const authCalc = await httpRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/attendance/calculator',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }, { attended: 12, conducted: 20, target: 75 });
    if (authCalc.status === 200 && authCalc.data?.data?.recovery?.required === 12) {
      console.log('  ✓ Authenticated POST /api/attendance/calculator returns accurate calculation (12 required)');
      passedTests++;
    } else {
      console.error('  ✗ Authenticated POST /api/attendance/calculator calculation mismatch:', authCalc);
      failedTests++;
    }

    // G. Authenticated GET /api/attendance/source-status
    const authSource = await httpRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/attendance/source-status',
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (authSource.status === 200 && authSource.data?.data?.securityNotice) {
      console.log('  ✓ Authenticated GET /api/attendance/source-status reports verified isolation status');
      passedTests++;
    } else {
      console.error('  ✗ Authenticated GET /api/attendance/source-status failed:', authSource);
      failedTests++;
    }

  } catch (err) {
    console.error('  ✗ HTTP tests threw unexpected error:', err.message);
    failedTests++;
  } finally {
    console.log('\n----------------------------------------');
    console.log(`TOTAL PASSED: ${passedTests}`);
    console.log(`TOTAL FAILED: ${failedTests}`);
    console.log('----------------------------------------\n');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runHttpTests();

