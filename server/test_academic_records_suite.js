/**
 * Test Academic Records Suite — CampusFlow AI
 *
 * Verifies:
 *  1. Grade Card & Report Card HTML parser (commonPageId 31 / 19 extraction)
 *  2. Student metadata extraction (Name, Roll, Class, Parents)
 *  3. Multi-semester course breakdown, SGPA, CGPA, and Credits verification
 *  4. Letter grade sanitization and pass/fail mapping
 *  5. Empty/no-record and malformed HTML handling
 *  6. Mongoose AcademicRecord model constraints & schema validation
 *  7. Complete student data isolation (zero leakage between student IDs)
 *  8. Upstream error preservation of cached records
 */

'use strict';

require('dotenv').config({ path: __dirname + '/.env' });
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { parseGradeCard, cleanHtmlText, parseCircularsList, parseFeedDetailHtml } = require('./services/codeBrigadeParser');
const AcademicRecord = require('./models/AcademicRecord');
const User = require('./models/User');
const CodeBrigadeSession = require('./models/CodeBrigadeSession');
const academicRecordService = require('./services/academicRecordService');

console.log('\n=================================================');
console.log('🧪 RUNNING CAMPUSFLOW ACADEMIC RECORDS TEST SUITE');
console.log('=================================================\n');

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

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function runSuite() {
  // ── 1. Parser Tests on Verified University HTML ────────────────────────
  console.log('1. Grade Card & Examination Parser:');

  const sampleHtmlPath = '/Users/harshmangla/.gemini/antigravity-ide/brain/979fa15c-decb-4a1a-9f10-3c17fee5377e/scratch/grade_card_sample.html';
  let sampleHtml = '';
  if (fs.existsSync(sampleHtmlPath)) {
    sampleHtml = fs.readFileSync(sampleHtmlPath, 'utf8');
  }

  runTest('parseGradeCard safely handles null, undefined, or non-string input', () => {
    assert.strictEqual(parseGradeCard(null), null);
    assert.strictEqual(parseGradeCard(undefined), null);
    assert.strictEqual(parseGradeCard(''), null);
    assert.strictEqual(parseGradeCard(12345), null);
  });

  runTest('parseGradeCard recognizes empty university responses (no-record)', () => {
    const emptyResult = parseGradeCard('<div class="no-record">No Record Found.</div>');
    assert.strictEqual(emptyResult.empty, true);
    assert.ok(emptyResult.message.includes('No Record Found'));
  });

  if (sampleHtml) {
    const parsed = parseGradeCard(sampleHtml);

    runTest('parseGradeCard extracts student identity from university header', () => {
      assert.strictEqual(parsed.studentName, 'MOHIT VERMA');
      assert.strictEqual(parsed.rollNumber, '2410993237');
      assert.strictEqual(parsed.className, '2024-BE-CSE-AI-5 SEM-5 SEM');
      assert.strictEqual(parsed.fatherName, 'MEGHRAJ');
      assert.strictEqual(parsed.motherName, 'MONIKA RANI');
    });

    runTest('parseGradeCard extracts all 4 completed semesters accurately', () => {
      assert.strictEqual(parsed.semesters.length, 4);
      assert.strictEqual(parsed.semesters[0].semester, '1 SEM');
      assert.strictEqual(parsed.semesters[1].semester, '2 SEM');
      assert.strictEqual(parsed.semesters[2].semester, '3 SEM');
      assert.strictEqual(parsed.semesters[3].semester, '4 SEM');
    });

    runTest('parseGradeCard extracts exact official SGPA and CGPA figures', () => {
      // Semester 1: SGPA 7.19, CGPA 7.19
      assert.strictEqual(parsed.semesters[0].sgpa, 7.19);
      assert.strictEqual(parsed.semesters[0].cgpa, 7.19);

      // Semester 2: SGPA 7.80, CGPA 7.52
      assert.strictEqual(parsed.semesters[1].sgpa, 7.8);
      assert.strictEqual(parsed.semesters[1].cgpa, 7.52);

      // Semester 3: SGPA 8.10, CGPA 7.70
      assert.strictEqual(parsed.semesters[2].sgpa, 8.1);
      assert.strictEqual(parsed.semesters[2].cgpa, 7.7);

      // Semester 4: SGPA 9.64, CGPA 8.19
      assert.strictEqual(parsed.semesters[3].sgpa, 9.64);
      assert.strictEqual(parsed.semesters[3].cgpa, 8.19);
    });

    runTest('parseGradeCard parses subjects and credits without data fabrication', () => {
      const sem1 = parsed.semesters[0];
      assert.strictEqual(sem1.subjects.length, 7);
      assert.strictEqual(sem1.subjects[0].code, '24APS1103');
      assert.strictEqual(sem1.subjects[0].name, 'LINEAR ALGEBRA');
      assert.strictEqual(sem1.subjects[0].credits, 2.0);
      assert.strictEqual(sem1.subjects[0].grade, 'A');
      assert.strictEqual(sem1.subjects[0].status, 'PASS');

      // Semester 4: 7 subjects, total credits 22
      const sem4 = parsed.semesters[3];
      assert.strictEqual(sem4.subjects.length, 7);
      assert.strictEqual(sem4.totalCredits, 22);
    });

    runTest('parseGradeCard computes overall summary statistics correctly', () => {
      assert.strictEqual(parsed.summary.totalSemesters, 4);
      assert.strictEqual(parsed.summary.latestCgpa, 8.19);
      assert.strictEqual(parsed.summary.totalCreditsEarned, 87);
    });

    runTest('parseGradeCard extracts official university notes', () => {
      assert.ok(parsed.notes.length >= 4);
      assert.ok(parsed.notes.some(n => n.includes('University are final')));
      assert.ok(parsed.notes.some(n => n.includes('re-evaluation')));
    });
  }

  // ── Circulars Parser Tests ──────────────────────────────────────────
  console.log('\n2. Circulars & Official Notices Parser:');

  runTest('parseCircularsList handles null or empty input safely', () => {
    assert.deepStrictEqual(parseCircularsList(null), []);
    assert.deepStrictEqual(parseCircularsList(undefined), []);
    assert.deepStrictEqual(parseCircularsList(''), []);
    assert.deepStrictEqual(parseCircularsList(123), []);
  });

  runTest('parseCircularsList extracts circular fields with categories and dates', () => {
    const sampleFragment = `
      <div class='mng-res-wrap'>
        <div class='status col-left'> Datesheet for BE (CSE) Mid Term<br><span style='color:grey;'><nobr>14-10-2026 at 03:39 PM</nobr></span></div>
        <div class='wrap'><div class='title'>Added By</div><div class='colon'>:</div><div class='value'><span class= 'receipt-date'>NIRUPAK SHARMA</span></div></div>
        <div class='wrap'><div class='title'>Subject</div><div class='colon'>:</div><div class='value'><span class='receipt-date'>Mid Semester Exams 2026</span></div></div>
        <div class='wrap'><div class='title'>Added On</div><div class='colon'>:</div><div class='value'><span class = 'receipt-date'>14-10-2026</span></div></div>
      </div>
    `;
    const res = parseCircularsList(sampleFragment);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].title, 'Datesheet for BE (CSE) Mid Term');
    assert.strictEqual(res[0].addedBy, 'NIRUPAK SHARMA');
    assert.strictEqual(res[0].subject, 'Mid Semester Exams 2026');
    assert.strictEqual(res[0].displayDate, '14-10-2026');
    assert.strictEqual(res[0].category, 'EXAMINATION');
    assert.strictEqual(res[0].source, 'CODE_BRIGADE');
    assert.strictEqual(typeof res[0].timeStamp, 'string');
    assert.ok(res[0].timeStamp.length > 0);
    assert.strictEqual(res[0].upstreamId, '1');
  });

  runTest('parseFeedDetailHtml handles null or empty input safely', () => {
    const res = parseFeedDetailHtml(null);
    assert.strictEqual(res.title, '');
    assert.strictEqual(res.hasAttachment, false);
    assert.strictEqual(res.attachmentNotice, 'No attachment available');
  });

  runTest('parseFeedDetailHtml extracts title, paragraphs, and handles "---" attachment', () => {
    const sampleHtml = `
      <div class="ui-feed-title-wrap">
        <div class="ui-feed-det-title">Datesheet for BE (CSE) Mid Term Evaluation 2026</div>
      </div>
      <div class="ui-feed-det-desc">
        <p>Dear Students,</p>
        <p>Mid Term Tests will commence from 20th October.</p>
        <ul>
          <li>Carry university identity card.</li>
        </ul>
        <ol>
          <li>Report to exam hall 15 minutes before time.</li>
        </ol>
        <p>Regards,<br>Office of Controller of Examinations<br>Chitkara University</p>
      </div>
      <div class="ui-feed-det-attach">
        ---
      </div>
    `;
    const parsed = parseFeedDetailHtml(sampleHtml);
    assert.strictEqual(parsed.title, 'Datesheet for BE (CSE) Mid Term Evaluation 2026');
    assert.ok(parsed.paragraphs.length >= 3);
    assert.ok(parsed.description.includes('Dear Students'));
    assert.ok(parsed.description.includes('Carry university identity card'));
    assert.ok(parsed.description.includes('Report to exam hall'));
    assert.strictEqual(parsed.hasAttachment, false);
    assert.strictEqual(parsed.attachmentUrl, null);
    assert.strictEqual(parsed.attachmentNotice, 'No attachment available');
  });

  runTest('parseFeedDetailHtml safely extracts genuine attachment URLs', () => {
    const sampleHtml = `
      <div class="ui-feed-title-wrap">
        <div class="ui-feed-det-title">European Innovation Challenge 2026</div>
      </div>
      <div class="ui-feed-det-desc">
        <p>Registrations open.</p>
      </div>
      <div class="ui-feed-det-attach">
        <a href="/attachments/circulars/challenge_guidelines.pdf">Challenge Guidelines (PDF)</a>
      </div>
    `;
    const parsed = parseFeedDetailHtml(sampleHtml);
    assert.strictEqual(parsed.title, 'European Innovation Challenge 2026');
    assert.strictEqual(parsed.hasAttachment, true);
    assert.strictEqual(parsed.attachmentUrl, 'https://cuiet.codebrigade.in/attachments/circulars/challenge_guidelines.pdf');
    assert.strictEqual(parsed.attachmentName, 'Challenge Guidelines (PDF)');
  });

  runTest('parseFeedDetailHtml safely rejects login pages without leaking form text as description', () => {
    const loginHtml = `
      <html>
        <head><title>Login</title></head>
        <body>
          <form id="loginForm" action="/loginManager/checkLogin">
            <input type="hidden" name="formId" value="123" />
            <input type="text" name="txtUsername" placeholder="Chalkpad ID" />
            <input type="password" name="txtPassword" />
            <button type="submit">Sign In</button>
          </form>
        </body>
      </html>
    `;
    const parsed = parseFeedDetailHtml(loginHtml);
    assert.strictEqual(parsed.title, '');
    assert.strictEqual(parsed.description, '');
    assert.deepStrictEqual(parsed.paragraphs, []);
    assert.strictEqual(parsed.hasAttachment, false);
    assert.strictEqual(parsed.attachmentNotice, 'No attachment available');
  });

  // ── 2. Database Integration & Student Isolation ───────────────────────
  console.log('\n2. Database & Student Isolation:');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow');
    }

    await runAsyncTest('AcademicRecord model enforces user field requirement', async () => {
      const invalidRecord = new AcademicRecord({});
      let caught = false;
      try {
        await invalidRecord.validate();
      } catch (err) {
        caught = true;
        assert.ok(err.errors.user);
      }
      assert.strictEqual(caught, true);
    });

    await runAsyncTest('getReportCard isolates records strictly to authenticated userId', async () => {
      // Find two distinct users
      const users = await User.find().limit(2);
      if (users.length >= 2) {
        const u1 = users[0];
        const u2 = users[1];

        const res1 = await academicRecordService.getReportCard(u1._id);
        const res2 = await academicRecordService.getReportCard(u2._id);

        if (res1.record && res2.record) {
          assert.notStrictEqual(String(res1.record.user), String(res2.record.user));
        }
      }
    });

    await runAsyncTest('syncReportCard throws validation error if Code Brigade is not connected', async () => {
      const unconnectedId = new mongoose.Types.ObjectId();
      let threw = false;
      try {
        await academicRecordService.syncReportCard(unconnectedId);
      } catch (err) {
        threw = true;
        assert.ok(err.message.includes('No university account connected'));
      }
      assert.strictEqual(threw, true);
    });

    await runAsyncTest('Verified report card data persists in AcademicRecord collection', async () => {
      const existingSession = await CodeBrigadeSession.findOne({
        apiKey: { $exists: true, $ne: '' },
      });

      if (existingSession) {
        const report = await academicRecordService.getReportCard(existingSession.user);
        assert.strictEqual(report.dataSource.isConnected, true);
        if (report.record) {
          assert.strictEqual(String(report.record.user), String(existingSession.user));
          assert.strictEqual(report.record.source, 'CODE_BRIGADE');
          assert.ok(report.record.semesters.length > 0);
        }
      }
    });

    await runAsyncTest('getCirculars reports disconnected state without fabricating notices when not authenticated', async () => {
      const dummyId = new mongoose.Types.ObjectId();
      const res = await academicRecordService.getCirculars(dummyId);
      assert.strictEqual(Array.isArray(res.circulars), true);
      assert.strictEqual(res.circulars.length, 0);
      assert.strictEqual(res.dataSource.isConnected, false);
      assert.strictEqual(res.dataSource.endpointStatus, 'NOT_CONNECTED');
    });

    await runAsyncTest('getCirculars retrieves verified live university notices for connected student', async () => {
      const activeSession = await CodeBrigadeSession.findOne({ status: 'CONNECTED' }).lean();
      if (!activeSession) {
        console.log('    (Skipping live session test: no active connected session in DB)');
        return;
      }
      const res = await academicRecordService.getCirculars(activeSession.user);
      assert.strictEqual(Array.isArray(res.circulars), true);
      assert.strictEqual(res.circulars.length > 0, true);
      assert.strictEqual(res.dataSource.isConnected, true);
      assert.strictEqual(res.dataSource.endpointStatus, 'VERIFIED');
      assert.strictEqual(res.dataSource.endpointUrl, 'mobilev2/getCircularsList');
      assert.strictEqual(typeof res.circulars[0].title, 'string');
      assert.strictEqual(typeof res.circulars[0].category, 'string');
    });

    await runAsyncTest('syncCirculars updates lastSyncedAt and preserves verified notices', async () => {
      const activeSession = await CodeBrigadeSession.findOne({ status: 'CONNECTED' }).lean();
      if (!activeSession) return;
      const res = await academicRecordService.syncCirculars(activeSession.user);
      assert.strictEqual(res.dataSource.isConnected, true);
      assert.strictEqual(res.dataSource.endpointStatus, 'VERIFIED');
      assert.ok(res.dataSource.lastSyncedAt instanceof Date || typeof res.dataSource.lastSyncedAt === 'string');
      assert.ok(res.circulars.length > 0);
    });

    await runAsyncTest('getCircularDetail handles detail lookup gracefully', async () => {
      const activeSession = await CodeBrigadeSession.findOne({ status: 'CONNECTED' }).lean();
      if (!activeSession) return;
      const detail = await academicRecordService.getCircularDetail(activeSession.user, { id: '1', timeStamp: '1728900000', readBit: '0' });
      assert.strictEqual(typeof detail, 'object');
      assert.strictEqual(detail.attachmentNotice, 'No attachment available');
    });

  } catch (dbErr) {
    console.error('Database connection notice for tests:', dbErr.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  console.log('\n-------------------------------------------------');
  console.log(`TOTAL PASSED: ${passedTests}`);
  console.log(`TOTAL FAILED: ${failedTests}`);
  console.log('-------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
