/* ------------------------------------------------------------------
   Pure calculation helpers for the dashboard (Version 2).

   Kept free of DOM code on purpose so the numbers can be unit-tested
   with Node (see tests/stats.test.js) as well as used by the browser.
   ------------------------------------------------------------------ */

/** Parse a yyyy-mm-dd input value as a LOCAL date (no timezone shifting). */
function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** An assignment counts as graded only when it holds a real number. */
function isGraded(assignment) {
  const grade = assignment.grade;
  if (grade === null || grade === undefined || grade === '') return false;
  return !Number.isNaN(Number(grade));
}

/** Not finished, has a due date, and that date is before today. */
function isOverdue(assignment, today = new Date()) {
  if (assignment.status === 'Completed') return false;
  const due = parseDate(assignment.dueDate);
  if (!due) return false;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due < startOfToday;
}

/**
 * Dashboard summary.
 * average is calculated from graded assignments ONLY — ungraded work is
 * ignored rather than counted as zero — and is null when nothing is graded.
 */
function computeStats(assignments, today = new Date()) {
  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === 'Completed').length;
  const remaining = total - completed;
  const overdue = assignments.filter((a) => isOverdue(a, today)).length;

  const graded = assignments.filter(isGraded);
  const average = graded.length
    ? graded.reduce((sum, a) => sum + Number(a.grade), 0) / graded.length
    : null;

  return {
    total,
    completed,
    remaining,
    overdue,
    gradedCount: graded.length,
    average,
    completionRate: total ? Math.round((completed / total) * 100) : 0
  };
}

/** Letter band for a percentage: a/b/c/d/f, or null when there is no grade. */
function gradeBand(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return null;
  const grade = Number(value);
  if (grade >= 90) return 'a';
  if (grade >= 80) return 'b';
  if (grade >= 70) return 'c';
  if (grade >= 60) return 'd';
  return 'f';
}

/** The same thing as a display letter: A, B, C, D, F or '' when ungraded. */
function gradeLetter(value) {
  const band = gradeBand(value);
  return band ? band.toUpperCase() : '';
}

/** The same summary, narrowed to a single course. */
function computeCourseStats(assignments, courseId, today = new Date()) {
  return computeStats(assignments.filter((a) => a.courseId === courseId), today);
}

/* Available to Node for tests; harmless in the browser. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseDate, isGraded, isOverdue, computeStats, computeCourseStats, gradeBand, gradeLetter };
}
