/* ------------------------------------------------------------------
   Student Study Planner & Grade Dashboard — Version 2

   Version 1 features (courses, assignments, priority, status, storage)
   plus grades and a live dashboard summary.
   Calculations live in stats.js so they can be unit-tested.
   ------------------------------------------------------------------ */

const STORAGE_KEY = 'study-planner-v2';
const THEME_KEY = 'study-planner-theme';
const LEGACY_STORAGE_KEY = 'study-planner-v1';
const PRIORITIES = ['Low', 'Medium', 'High'];
/* Each course keeps a colour so it can be recognised at a glance in the table. */
const COURSE_COLORS = ['#5b5bd6', '#0891b2', '#0f9d58', '#c2740b', '#db2777', '#7c3aed', '#0284c7', '#e11d48'];
const STATUSES = ['Not Started', 'In Progress', 'Completed'];

let state = { courses: [], assignments: [] };
let editingCourseId = null;
let editingAssignmentId = null;

/* Which assignments the table shows, and in what order. */
let filters = { search: '', courseId: 'all', status: 'all', sort: 'due-asc' };

const $ = (selector) => document.querySelector(selector);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------------- storage ---------------- */

function loadState() {
  try {
    // Version 2 keeps its own key, but a version 1 planner is upgraded in place.
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    state.assignments = (Array.isArray(parsed.assignments) ? parsed.assignments : [])
      .map((a) => ({ grade: null, ...a })); // v1 records had no grade field
  } catch (err) {
    console.error('Saved data could not be read, starting fresh.', err);
    state = { courses: [], assignments: [] };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Data could not be saved.', err);
  }
}

/* ---------------- helpers ---------------- */

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function courseById(id) {
  return state.courses.find((course) => course.id === id) || null;
}

/* Saved colour first; otherwise fall back to the course's position in the list
   so planners created before colours existed still look right. */
function courseColor(course) {
  if (!course) return 'var(--muted)';
  if (course.color) return course.color;
  const index = state.courses.findIndex((c) => c.id === course.id);
  return COURSE_COLORS[(index < 0 ? 0 : index) % COURSE_COLORS.length];
}

/* 'In Progress' -> 'in-progress', so statuses can be styled by class. */
function slug(text) {
  return String(text).toLowerCase().replace(/\s+/g, '-');
}

/* How close a due date is, used to colour the date cell. */
function dueClass(item) {
  if (isOverdue(item)) return 'is-overdue';
  const due = parseDate(item.dueDate);
  if (!due || item.status === 'Completed') return '';
  const days = Math.round((due - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return days <= 3 ? 'is-soon' : '';
}

function assignmentById(id) {
  return state.assignments.find((item) => item.id === id) || null;
}

/* Undated work always sinks to the bottom, whichever direction we sort. */
function compareDue(a, b) {
  if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

const SORTS = {
  'due-asc': (a, b) => compareDue(a, b),
  'due-desc': (a, b) => (!a.dueDate || !b.dueDate) ? compareDue(a, b) : compareDue(b, a),
  'priority': (a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || compareDue(a, b),
  'grade-desc': (a, b) => (isGraded(b) ? Number(b.grade) : -1) - (isGraded(a) ? Number(a.grade) : -1),
  'title': (a, b) => a.title.localeCompare(b.title)
};

function matchesFilters(item) {
  if (filters.courseId !== 'all' && item.courseId !== filters.courseId) return false;

  if (filters.status === 'overdue') {
    if (!isOverdue(item)) return false;
  } else if (filters.status !== 'all' && item.status !== filters.status) {
    return false;
  }

  const term = filters.search.trim().toLowerCase();
  if (term) {
    const course = courseById(item.courseId);
    const haystack = `${item.title} ${course ? course.name : ''} ${course ? course.code || '' : ''}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
}

function visibleAssignments() {
  const sorter = SORTS[filters.sort] || SORTS['due-asc'];
  return state.assignments.filter(matchesFilters).sort(sorter);
}

function optionList(values, selected) {
  return values
    .map((value) => `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`)
    .join('');
}

/* Escape user text before putting it into innerHTML. */
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

/* ---------------- rendering ---------------- */

function render() {
  renderDashboard();
  renderCourses();
  renderCourseOptions();
  renderFilterOptions();
  renderAssignments();
}

function renderDashboard() {
  const stats = computeStats(state.assignments);

  $('#stat-total').textContent = stats.total;
  $('#stat-completed').textContent = stats.completed;
  $('#stat-remaining').textContent = stats.remaining;
  $('#stat-overdue').textContent = stats.overdue;
  $('#stat-average').textContent = stats.average === null ? '—' : `${stats.average.toFixed(1)}%`;
  $('#stat-graded-note').textContent = `${stats.gradedCount} of ${stats.total} graded`;

  const averageCard = $('#stat-average').closest('.stat');
  averageCard.className = 'stat stat-accent';
  const band = gradeBand(stats.average);
  if (band) averageCard.classList.add(`band-${band}`);

  $('#progress-bar').style.width = `${stats.completionRate}%`;
  $('#progress').setAttribute('aria-valuenow', String(stats.completionRate));
  $('#progress-label').innerHTML =
    `<strong>${stats.completionRate}%</strong> of your assignments are complete.`;
}

function renderCourses() {
  const list = $('#course-list');
  const empty = $('#course-empty');

  empty.hidden = state.courses.length > 0;
  list.innerHTML = state.courses.map((course) => {
    const meta = [
      course.code,
      course.instructor,
      course.credits ? `${course.credits} credits` : ''
    ].filter(Boolean).map(escapeHtml).join(' · ');

    // Progress and average for this course alone.
    const cs = computeCourseStats(state.assignments, course.id);
    const summary = [
      `${cs.completed}/${cs.total} done`,
      cs.average === null ? 'no grades yet' : `avg ${cs.average.toFixed(1)}%`,
      cs.overdue ? `${cs.overdue} overdue` : ''
    ].filter(Boolean).join(' · ');

    return `
      <li class="course-card${course.id === editingCourseId ? ' editing' : ''}" style="--course-color: ${courseColor(course)}">
        <div>
          <div class="course-name"><span class="course-dot" aria-hidden="true"></span>${escapeHtml(course.name)}</div>
          <div class="course-meta">${meta}</div>
          <div class="course-summary${cs.overdue ? ' has-overdue' : ''}">${summary}</div>
        </div>
        <div class="card-actions">
          <button class="btn small ghost" data-action="edit-course" data-id="${course.id}">Edit</button>
          <button class="btn small danger" data-action="delete-course" data-id="${course.id}">Delete</button>
        </div>
      </li>`;
  }).join('');
}

function renderFilterOptions() {
  const select = $('#filter-course');
  select.innerHTML = '<option value="all">All courses</option>' +
    state.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  // A filter pointing at a deleted course falls back to "all".
  if (filters.courseId !== 'all' && !courseById(filters.courseId)) filters.courseId = 'all';
  select.value = filters.courseId;
}

function renderCourseOptions() {
  const select = $('#assignment-course');
  const previous = select.value;
  select.innerHTML = state.courses.length
    ? state.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
    : '<option value="">— add a course first —</option>';
  if (previous && state.courses.some((c) => c.id === previous)) select.value = previous;
}

function renderAssignments() {
  const list = $('#assignment-list');
  const empty = $('#assignment-empty');
  const rows = visibleAssignments();

  empty.hidden = rows.length > 0;
  empty.textContent = state.assignments.length === 0
    ? 'No assignments yet. Add a course first, then plan your work.'
    : 'No assignments match the current search or filters.';
  $('#assignment-table').hidden = rows.length === 0;

  list.innerHTML = rows.map((item) => {
    const course = courseById(item.courseId);
    const overdue = isOverdue(item);
    const classes = [
      item.id === editingAssignmentId ? 'editing' : '',
      item.status === 'Completed' ? 'done' : '',
      overdue ? 'overdue' : ''
    ].filter(Boolean).join(' ');

    const band = gradeBand(item.grade);

    return `
      <tr class="${classes}">
        <td class="assignment-title">
          ${escapeHtml(item.title)}
          ${overdue ? '<span class="tag tag-overdue">Overdue</span>' : ''}
        </td>
        <td>
          <span class="course-chip" style="--course-color: ${courseColor(course)}">
            ${escapeHtml(course ? course.name : 'Unassigned')}
          </span>
        </td>
        <td class="due-cell ${dueClass(item)}">${formatDate(item.dueDate)}</td>
        <td>
          <select class="chip-select prio-${item.priority}" data-action="set-priority" data-id="${item.id}"
                  aria-label="Priority for ${escapeHtml(item.title)}">
            ${optionList(PRIORITIES, item.priority)}
          </select>
        </td>
        <td>
          <select class="chip-select status-${slug(item.status)}" data-action="set-status" data-id="${item.id}"
                  aria-label="Status for ${escapeHtml(item.title)}">
            ${optionList(STATUSES, item.status)}
          </select>
        </td>
        <td>
          <div class="grade-cell">
            <input class="grade-input${band ? ` band-${band}` : ''}" type="number" min="0" max="100" step="0.1" placeholder="—"
                   value="${isGraded(item) ? escapeHtml(item.grade) : ''}"
                   data-action="set-grade" data-id="${item.id}"
                   aria-label="Grade for ${escapeHtml(item.title)}" />
            ${band ? `<span class="grade-letter band-${band}" title="Letter grade">${gradeLetter(item.grade)}</span>` : ''}
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button class="btn small ghost" data-action="edit-assignment" data-id="${item.id}">Edit</button>
            <button class="btn small danger" data-action="delete-assignment" data-id="${item.id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ---------------- course form ---------------- */

function resetCourseForm() {
  editingCourseId = null;
  $('#course-form').reset();
  $('#course-error').textContent = '';
  $('#course-submit').textContent = 'Add course';
  $('#course-cancel').hidden = true;
}

function startCourseEdit(id) {
  const course = courseById(id);
  if (!course) return;
  editingCourseId = id;
  $('#course-name').value = course.name;
  $('#course-code').value = course.code || '';
  $('#course-credits').value = course.credits || '';
  $('#course-instructor').value = course.instructor || '';
  $('#course-submit').textContent = 'Save changes';
  $('#course-cancel').hidden = false;
  $('#course-name').focus();
  renderCourses();
}

function submitCourse(event) {
  event.preventDefault();
  const name = $('#course-name').value.trim();
  if (!name) {
    $('#course-error').textContent = 'A course name is required.';
    return;
  }

  const details = {
    name,
    code: $('#course-code').value.trim(),
    instructor: $('#course-instructor').value.trim(),
    credits: $('#course-credits').value.trim()
  };

  if (editingCourseId) {
    Object.assign(courseById(editingCourseId), details);
  } else {
    const color = COURSE_COLORS[state.courses.length % COURSE_COLORS.length];
    state.courses.push({ id: uid(), color, ...details });
  }

  saveState();
  resetCourseForm();
  render();
}

function deleteCourse(id) {
  const course = courseById(id);
  if (!course) return;
  const linked = state.assignments.filter((a) => a.courseId === id).length;
  const message = linked
    ? `Delete "${course.name}" and its ${linked} assignment(s)?`
    : `Delete "${course.name}"?`;
  if (!confirm(message)) return;

  state.courses = state.courses.filter((c) => c.id !== id);
  state.assignments = state.assignments.filter((a) => a.courseId !== id);
  if (editingCourseId === id) resetCourseForm();
  saveState();
  render();
}

/* ---------------- assignment form ---------------- */

function resetAssignmentForm() {
  editingAssignmentId = null;
  $('#assignment-form').reset();
  $('#assignment-priority').value = 'Medium';
  $('#assignment-status').value = 'Not Started';
  $('#assignment-error').textContent = '';
  $('#assignment-submit').textContent = 'Add assignment';
  $('#assignment-cancel').hidden = true;
}

function startAssignmentEdit(id) {
  const item = assignmentById(id);
  if (!item) return;
  editingAssignmentId = id;
  $('#assignment-title').value = item.title;
  $('#assignment-course').value = item.courseId;
  $('#assignment-due').value = item.dueDate || '';
  $('#assignment-priority').value = item.priority;
  $('#assignment-status').value = item.status;
  $('#assignment-grade').value = isGraded(item) ? item.grade : '';
  $('#assignment-submit').textContent = 'Save changes';
  $('#assignment-cancel').hidden = false;
  $('#assignment-title').focus();
  renderAssignments();
}

/** '' means "not graded yet"; anything numeric is clamped to 0-100. */
function readGrade(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return null;
  const number = Number(trimmed);
  if (Number.isNaN(number)) return null;
  return Math.min(100, Math.max(0, number));
}

function submitAssignment(event) {
  event.preventDefault();
  const title = $('#assignment-title').value.trim();
  const courseId = $('#assignment-course').value;

  if (!title) {
    $('#assignment-error').textContent = 'An assignment title is required.';
    return;
  }
  if (!courseId) {
    $('#assignment-error').textContent = 'Add a course first, then attach the assignment to it.';
    return;
  }

  const details = {
    title,
    courseId,
    dueDate: $('#assignment-due').value,
    priority: $('#assignment-priority').value,
    status: $('#assignment-status').value,
    grade: readGrade($('#assignment-grade').value)
  };

  if (editingAssignmentId) {
    Object.assign(assignmentById(editingAssignmentId), details);
  } else {
    state.assignments.push({ id: uid(), ...details });
  }

  saveState();
  resetAssignmentForm();
  render();
}

function deleteAssignment(id) {
  const item = assignmentById(id);
  if (!item || !confirm(`Delete "${item.title}"?`)) return;
  state.assignments = state.assignments.filter((a) => a.id !== id);
  if (editingAssignmentId === id) resetAssignmentForm();
  saveState();
  render();
}

/* ---------------- theme ---------------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = $('#theme-toggle');
  button.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  button.setAttribute('aria-pressed', String(theme === 'dark'));
}

/* A saved choice wins; otherwise follow the operating system. */
function preferredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (err) {
    // storage may be blocked; fall through to the system preference
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* not fatal */ }
  applyTheme(next);
}

/* ---------------- backup and restore ---------------- */

function exportData() {
  const payload = JSON.stringify({ app: 'study-planner', version: 2, exportedAt: new Date().toISOString(), ...state }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `study-planner-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  event.target.value = ''; // so the same file can be picked again later
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.courses) || !Array.isArray(parsed.assignments)) {
        throw new Error('the file has no courses/assignments lists');
      }
      const message = `Replace the current planner with ${parsed.courses.length} course(s) `
        + `and ${parsed.assignments.length} assignment(s)? This cannot be undone.`;
      if (!confirm(message)) return;

      state = {
        courses: parsed.courses,
        assignments: parsed.assignments.map((a) => ({ grade: null, ...a }))
      };
      resetCourseForm();
      resetAssignmentForm();
      saveState();
      render();
    } catch (err) {
      alert(`That file could not be imported — ${err.message}.`);
    }
  };
  reader.onerror = () => alert('That file could not be read.');
  reader.readAsText(file);
}

/* ---------------- events ---------------- */

function handleClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === 'edit-course') startCourseEdit(id);
  if (action === 'delete-course') deleteCourse(id);
  if (action === 'edit-assignment') startAssignmentEdit(id);
  if (action === 'delete-assignment') deleteAssignment(id);
}

function handleChange(event) {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, id } = control.dataset;
  const item = assignmentById(id);
  if (!item) return;

  if (action === 'set-priority') item.priority = control.value;
  if (action === 'set-status') item.status = control.value;
  if (action === 'set-grade') item.grade = readGrade(control.value);

  saveState();
  render();
}

function init() {
  loadState();
  applyTheme(preferredTheme());
  render();

  $('#course-form').addEventListener('submit', submitCourse);
  $('#course-cancel').addEventListener('click', () => { resetCourseForm(); renderCourses(); });
  $('#assignment-form').addEventListener('submit', submitAssignment);
  $('#assignment-cancel').addEventListener('click', () => { resetAssignmentForm(); renderAssignments(); });

  $('#filter-search').addEventListener('input', (e) => { filters.search = e.target.value; renderAssignments(); });
  $('#filter-course').addEventListener('change', (e) => { filters.courseId = e.target.value; renderAssignments(); });
  $('#filter-status').addEventListener('change', (e) => { filters.status = e.target.value; renderAssignments(); });
  $('#filter-sort').addEventListener('change', (e) => { filters.sort = e.target.value; renderAssignments(); });
  $('#filter-clear').addEventListener('click', () => {
    filters = { search: '', courseId: 'all', status: 'all', sort: 'due-asc' };
    $('#filter-search').value = '';
    $('#filter-status').value = 'all';
    $('#filter-sort').value = 'due-asc';
    renderFilterOptions();
    renderAssignments();
  });

  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#export-btn').addEventListener('click', exportData);
  $('#import-btn').addEventListener('click', () => $('#import-input').click());
  $('#import-input').addEventListener('change', importData);

  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
}

document.addEventListener('DOMContentLoaded', init);
