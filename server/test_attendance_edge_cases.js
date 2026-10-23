/**
 * Attendance Calculations Mathematical Edge Cases Suite — CampusFlow AI
 * Run via: node test_attendance_edge_cases.js
 */

'use strict';

const assert = require('assert');
const {
  calculatePercentage,
  determineStanding,
  calculateClassesToAttend,
  calculateClassesCanMiss,
  generateInsights,
  safeNumber,
} = require('./utils/attendanceCalculations');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

console.log('\n--- Running Attendance Mathematical Edge Cases Suite ---');

it('safeNumber: handles non-numeric and finite checks correctly', () => {
  assert.strictEqual(safeNumber(42), 42);
  assert.strictEqual(safeNumber('42'), 42);
  assert.strictEqual(safeNumber(null, 10), 10);
  assert.strictEqual(safeNumber(undefined, 5), 5);
  assert.strictEqual(safeNumber(NaN, 0), 0);
  assert.strictEqual(safeNumber(Infinity, 0), 0);
});

it('calculatePercentage: handles zero conducted classes gracefully', () => {
  assert.strictEqual(calculatePercentage(0, 0), 0);
  assert.strictEqual(calculatePercentage(5, 0), 0);
});

it('calculatePercentage: handles negative numbers safely by clamping to 0', () => {
  assert.strictEqual(calculatePercentage(-5, 10), 0);
  assert.strictEqual(calculatePercentage(5, -10), 0);
});

it('calculatePercentage: clamps attended to conducted if attended exceeds conducted', () => {
  assert.strictEqual(calculatePercentage(15, 10), 100);
});

it('calculatePercentage: accurately rounds to one decimal place', () => {
  assert.strictEqual(calculatePercentage(1, 3), 33.3);
  assert.strictEqual(calculatePercentage(2, 3), 66.7);
  assert.strictEqual(calculatePercentage(3, 4), 75.0);
});

it('determineStanding: returns NO_DATA for 0 conducted classes', () => {
  const res = determineStanding(0, 75, 0);
  assert.strictEqual(res.status, 'NO_DATA');
  assert.strictEqual(res.isShortage, false);
});

it('determineStanding: correctly classifies GOOD_STANDING (>= threshold + 5)', () => {
  const res = determineStanding(80, 75, 10);
  assert.strictEqual(res.status, 'GOOD_STANDING');
  assert.strictEqual(res.isShortage, false);
});

it('determineStanding: correctly classifies WARNING ([threshold, threshold + 5))', () => {
  const res = determineStanding(76, 75, 10);
  assert.strictEqual(res.status, 'WARNING');
  assert.strictEqual(res.isShortage, false);
});

it('determineStanding: correctly classifies SHORTAGE (< threshold)', () => {
  const res = determineStanding(74.9, 75, 10);
  assert.strictEqual(res.status, 'SHORTAGE');
  assert.strictEqual(res.isShortage, true);
});

it('calculateClassesToAttend: returns 0 required when already meeting target', () => {
  const res = calculateClassesToAttend(8, 10, 75); // 80% >= 75%
  assert.strictEqual(res.required, 0);
  assert.strictEqual(res.isMet, true);
});

it('calculateClassesToAttend: computes exact consecutive lectures needed when below target', () => {
  // 7 attended out of 10 = 70%. Target 75%.
  // ceil((0.75 * 10 - 7) / (1 - 0.75)) = ceil((7.5 - 7) / 0.25) = ceil(0.5 / 0.25) = 2.
  // After 2 classes: 9 / 12 = 75%. Target met!
  const res = calculateClassesToAttend(7, 10, 75);
  assert.strictEqual(res.required, 2);
  assert.strictEqual(res.isMet, false);
});

it('calculateClassesToAttend: handles 100% target impossible case when classes missed', () => {
  const res = calculateClassesToAttend(9, 10, 100);
  assert.strictEqual(res.impossible, true);
  assert.strictEqual(res.isMet, false);
});

it('calculateClassesCanMiss: returns 0 allowable misses when below threshold', () => {
  const res = calculateClassesCanMiss(7, 10, 75);
  assert.strictEqual(res.canMiss, 0);
});

it('calculateClassesCanMiss: accurately calculates safe miss budget when above threshold', () => {
  // 18 attended out of 20 = 90%. Target 75%.
  // floor((18 - 0.75 * 20) / 0.75) = floor((18 - 15) / 0.75) = floor(3 / 0.75) = 4.
  // After 4 misses: 18 / 24 = 75.0%. Target maintained!
  const res = calculateClassesCanMiss(18, 20, 75);
  assert.strictEqual(res.canMiss, 4);
});

it('calculateClassesCanMiss: handles 0 conducted classes safely', () => {
  const res = calculateClassesCanMiss(0, 0, 75);
  assert.strictEqual(res.canMiss, 0);
});

it('generateInsights: categorizes subjects and identifies highest shortfall', () => {
  const subjects = [
    { _id: '1', name: 'Algos', code: 'CS101', attendedClasses: 18, totalClasses: 20, missedClasses: 2, attendancePercentage: 90 },
    { _id: '2', name: 'DB', code: 'CS102', attendedClasses: 14, totalClasses: 20, missedClasses: 6, attendancePercentage: 70 },
    { _id: '3', name: 'OS', code: 'CS103', attendedClasses: 15, totalClasses: 20, missedClasses: 5, attendancePercentage: 75 },
  ];
  const insights = generateInsights(subjects, 75);
  assert.strictEqual(insights.safeCount, 1); // 90%
  assert.strictEqual(insights.warningCount, 1); // 75%
  assert.strictEqual(insights.shortageCount, 1); // 70%
  assert.strictEqual(insights.highestShortfall.code, 'CS102');
  assert.strictEqual(insights.totalDeficitClasses, 4); // (0.75 * 20 - 14) / 0.25 = 1 / 0.25 = 4
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
