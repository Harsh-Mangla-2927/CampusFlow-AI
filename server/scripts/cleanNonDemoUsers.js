/**
 * Clean Non-Demo Users Script — CampusFlow AI
 *
 * Removes all registered accounts, associated subjects, tasks, exams,
 * study plans, and OTP verification records, preserving only the demo accounts:
 * - harsh@chitkara.edu.in
 * - harsh@campusflow.ai
 *
 * Usage: node scripts/cleanNonDemoUsers.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Subject = require('../models/Subject');
const Task = require('../models/Task');
const Exam = require('../models/Exam');
const StudyPlan = require('../models/StudyPlan');
const OtpVerification = require('../models/OtpVerification');
const connectDB = require('../config/db');

const DEMO_EMAILS = [
  'harsh@chitkara.edu.in',
  'harsh@campusflow.ai',
];

async function cleanNonDemoUsers() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find all non-demo users
    const nonDemoUsers = await User.find({ email: { $nin: DEMO_EMAILS } });
    console.log(`🔍 Found ${nonDemoUsers.length} non-demo user(s) to remove.`);

    for (const u of nonDemoUsers) {
      console.log(`\n🗑️ Removing user: ${u.name} (${u.email}) [ID: ${u._id}]...`);
      const s = await Subject.deleteMany({ user: u._id });
      const t = await Task.deleteMany({ user: u._id });
      const e = await Exam.deleteMany({ user: u._id });
      const p = await StudyPlan.deleteMany({ user: u._id });
      const o = await OtpVerification.deleteMany({
        $or: [{ userId: u._id }, { email: u.email }],
      });
      await User.deleteOne({ _id: u._id });

      console.log(`   Deleted: ${s.deletedCount} subjects, ${t.deletedCount} tasks, ${e.deletedCount} exams, ${p.deletedCount} study plans, ${o.deletedCount} OTP records.`);
    }

    // Also clean any unconsumed/expired OTP records for non-demo emails
    const orphanedOtps = await OtpVerification.deleteMany({ email: { $nin: DEMO_EMAILS } });
    if (orphanedOtps.deletedCount > 0) {
      console.log(`🧹 Cleaned ${orphanedOtps.deletedCount} orphaned pending OTP record(s).`);
    }

    // Display remaining active users
    const remaining = await User.find({}, 'name email university');
    console.log('\n✅ Operation complete. Current active users in database:');
    remaining.forEach(u => console.log(`   - ${u.name} (${u.email}) [${u.university}]`));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleaning non-demo users:', err);
    process.exit(1);
  }
}

cleanNonDemoUsers();
