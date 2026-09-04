/* Dashboard maths, checked against the Version 2 acceptance scenario.
   Run with:  node tests/stats.test.js                                */

const assert = require('node:assert/strict');
const { computeStats, isOverdue, isGraded } = require('../stats.js');

const today = new Date(2026, 8, 4); // 4 Sept 2026 — fixed so the test never drifts
const past = '2026-09-01';
const future = '2026-12-01';

// 5 assignments → 2 completed, 1 unfinished + overdue, grades on only 3 of them.
const assignments = [
  { title: 'Essay',   status: 'Completed',   dueDate: past,   grade: 80 },
  { title: 'Lab 1',   status: 'Completed',   dueDate: past,   grade: 90 },
  { title: 'Lab 2',   status: 'In Progress', dueDate: past,   grade: null },  // overdue
  { title: 'Quiz',    status: 'Not Started', dueDate: future, grade: 70 },
  { title: 'Project', status: 'Not Started', dueDate: future, grade: null }
];

const stats = computeStats(assignments, today);

const checks = [
  ['Total is 5',                       stats.total, 5],
  ['Completed is 2',                   stats.completed, 2],
  ['Remaining is 3',                   stats.remaining, 3],
  ['Overdue is 1',                     stats.overdue, 1],
  ['Only 3 assignments are graded',    stats.gradedCount, 3],
  ['Average uses the 3 graded only',   stats.average, 80],   // (80+90+70)/3
  ['Completion rate is 40%',           stats.completionRate, 40]
];

for (const [label, actual, expected] of checks) {
  assert.equal(actual, expected, `${label} — expected ${expected}, got ${actual}`);
  console.log(`  ok  ${label}`);
}

// Edge cases the average must not get wrong.
assert.equal(computeStats([], today).average, null, 'no assignments → no average');
assert.equal(computeStats([{ status: 'Not Started', grade: 0 }], today).average, 0, 'a grade of 0 still counts');
assert.equal(isGraded({ grade: '' }), false, 'an empty grade box is not a grade');
assert.equal(isOverdue({ status: 'Completed', dueDate: past }, today), false, 'finished work is never overdue');
assert.equal(isOverdue({ status: 'Not Started', dueDate: '' }, today), false, 'no due date → never overdue');
console.log('  ok  edge cases (empty list, zero grade, blank grade, completed past-due, undated)');

console.log('\nAll dashboard checks passed.');
