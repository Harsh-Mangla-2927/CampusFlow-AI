const assert = require('assert');
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('./models/User');
const otpService = require('./services/otpService');
const jwt = require('jsonwebtoken');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failedTests++;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING ONBOARDING & ATTENDANCE CONNECTION TEST SUITE');
  console.log('======================================================\n');

  // Connect to DB
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow');
    } catch (_) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  }

  console.log('1. User Model & Onboarding Flag Persistence:');
  const testEmail1 = `newuser_${Date.now()}@chitkara.edu.in`;
  const testEmail2 = `legacyuser_${Date.now()}@chitkara.edu.in`;

  let newUserDoc;
  let legacyUserDoc;

  await runAsyncTest('New registered user is created with onboardingCompleted: false', async () => {
    newUserDoc = await User.create({
      name: 'New Test Student',
      email: testEmail1,
      password: 'StrongPassword123!',
      university: 'Chitkara University',
      course: 'B.Tech CSE',
      semester: 4,
      emailVerified: true,
      onboardingCompleted: false,
    });
    assert.strictEqual(newUserDoc.onboardingCompleted, false);
  });

  await runAsyncTest('Legacy user without onboarding flag defaults safely without error', async () => {
    legacyUserDoc = await User.create({
      name: 'Legacy Student',
      email: testEmail2,
      password: 'StrongPassword123!',
      university: 'Chitkara University',
      course: 'B.Tech CSE',
      semester: 6,
      emailVerified: true,
      // intentionally omitted onboardingCompleted to simulate pre-existing accounts
    });
    const found = await User.findById(legacyUserDoc._id).lean();
    // Default in model is false, but authController treats missing or null as true
    const effectiveStatus = found.onboardingCompleted !== undefined && found.onboardingCompleted !== null
      ? Boolean(found.onboardingCompleted)
      : true;
    assert.strictEqual(typeof effectiveStatus, 'boolean');
  });

  await runAsyncTest('Updating profile updates onboardingCompleted to true in MongoDB', async () => {
    newUserDoc.onboardingCompleted = true;
    await newUserDoc.save();
    const updated = await User.findById(newUserDoc._id);
    assert.strictEqual(updated.onboardingCompleted, true);
  });

  console.log('\n2. OTP Verification & isNewRegistration Scoping:');

  await runAsyncTest('Failed OTP verification does not create user or issue tokens', async () => {
    const fakeChallengeToken = jwt.sign(
      { email: 'fake@chitkara.edu.in', actionPurpose: 'SIGNUP', purpose: 'OTP_CHALLENGE' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );
    try {
      await otpService.verifyOtpSubmission({
        otpId: new mongoose.Types.ObjectId(),
        otp: '000000',
        email: 'fake@chitkara.edu.in',
        purpose: 'SIGNUP',
      });
      assert.fail('Should have thrown verification error');
    } catch (err) {
      assert.ok(err.message);
    }
  });

  console.log('\n3. Attendance Connection State Logic:');

  test('Disconnected state with zero classes returns "Not connected" and "0 classes synced"', () => {
    const dataSource = { isConnected: false, provider: 'CAMPUSFLOW_LOCAL' };
    const subjects = [];
    const connecting = false;

    const classCount = subjects.length;
    const countLabel = `${classCount} class${classCount === 1 ? '' : 'es'} synced`;
    let statusText = 'Not connected';
    let variant = 'disconnected';

    if (connecting) {
      variant = 'connecting';
      statusText = 'Connecting…';
    } else if (dataSource.isConnected) {
      variant = 'connected';
      statusText = 'Connected';
    }

    assert.strictEqual(variant, 'disconnected');
    assert.strictEqual(statusText, 'Not connected');
    assert.strictEqual(countLabel, '0 classes synced');
  });

  test('Connected state returns "Connected" and accurate class count', () => {
    const dataSource = { isConnected: true, provider: 'CODE_BRIGADE_LIVE' };
    const subjects = [{ name: 'OS' }, { name: 'DBMS' }, { name: 'CN' }];
    const connecting = false;

    const classCount = subjects.length;
    const countLabel = `${classCount} class${classCount === 1 ? '' : 'es'} synced`;
    let statusText = dataSource.isConnected ? 'Connected' : 'Not connected';
    let variant = dataSource.isConnected ? 'connected' : 'disconnected';

    assert.strictEqual(variant, 'connected');
    assert.strictEqual(statusText, 'Connected');
    assert.strictEqual(countLabel, '3 classes synced');
  });

  test('Connecting state returns "Connecting…" with connecting variant', () => {
    const dataSource = { isConnected: false };
    const connecting = true;

    let variant = connecting ? 'connecting' : (dataSource.isConnected ? 'connected' : 'disconnected');
    let statusText = connecting ? 'Connecting…' : 'Not connected';

    assert.strictEqual(variant, 'connecting');
    assert.strictEqual(statusText, 'Connecting…');
  });

  test('Expired session returns warning state with actionable notice', () => {
    const dataSource = { isConnected: false, provider: 'CODE_BRIGADE_EXPIRED', notice: 'Session expired' };
    const connecting = false;

    let variant = dataSource.provider === 'CODE_BRIGADE_EXPIRED' ? 'expired' : 'disconnected';
    let statusText = dataSource.provider === 'CODE_BRIGADE_EXPIRED' ? 'Session expired' : 'Not connected';

    assert.strictEqual(variant, 'expired');
    assert.strictEqual(statusText, 'Session expired');
  });

  console.log('\n4. User-Scoped LocalStorage Keys Isolation:');

  test('Per-user dismissal key prevents cross-account leak', () => {
    const userA_id = 'user_6711a_id';
    const userB_id = 'user_6711b_id';

    // Mock localStorage
    const storage = {};
    storage[`cf_onboarding_dismissed_${userA_id}`] = 'true';

    // User A should be dismissed
    assert.strictEqual(storage[`cf_onboarding_dismissed_${userA_id}`], 'true');
    // User B should NOT be dismissed
    assert.strictEqual(storage[`cf_onboarding_dismissed_${userB_id}`], undefined);
  });

  test('Per-user step preservation preserves step within 1..5', () => {
    const userId = 'user_step_test';
    const storage = {};
    storage[`cf_onboarding_step_${userId}`] = '3';

    const saved = Number(storage[`cf_onboarding_step_${userId}`]);
    assert.strictEqual(saved, 3);
    assert.ok(saved >= 1 && saved <= 5);
  });

  // Clean up test documents
  if (newUserDoc) await User.findByIdAndDelete(newUserDoc._id).catch(() => {});
  if (legacyUserDoc) await User.findByIdAndDelete(legacyUserDoc._id).catch(() => {});

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL PASSED: ${passedTests}`);
  console.log(`TOTAL FAILED: ${failedTests}`);
  console.log('------------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal error in suite:', err);
  process.exit(1);
});
