/* ------------------------------------------------------------------
   Student Study Planner & Grade Dashboard — Version 1
   Core features:
     - add / edit / delete courses
     - add / edit / delete assignments
     - change priority and status
     - everything persists in localStorage across refreshes
   ------------------------------------------------------------------ */

const STORAGE_KEY = 'study-planner-v1';
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Not Started', 'In Progress', 'Completed'];

let state = { courses: [], assignments: [] };
let editingCourseId = null;
let editingAssignmentId = null;

const $ = (selector) => document.querySelector(selector);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------------- storage ---------------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    state.assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
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

function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function courseById(id) {
  return state.courses.find((course) => course.id === id) || null;
}

function sortedAssignments() {
  return [...state.assignments].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
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
  renderCourses();
  renderCourseOptions();
  renderAssignments();
}

function renderCourses() {
  const list = $('#course-list');
  const empty = $('#course-empty');

  empty.hidden = state.courses.length > 0;
  list.innerHTML = state.courses.map((course) => {
    const count = state.assignments.filter((a) => a.courseId === course.id).length;
    const meta = [
      course.code,
      course.instructor,
      course.credits ? `${course.credits} credits` : '',
      `${count} assignment${count === 1 ? '' : 's'}`
    ].filter(Boolean).map(escapeHtml).join(' · ');

    return `
      <li class="course-card${course.id === editingCourseId ? ' editing' : ''}">
        <div>
          <div class="course-name">${escapeHtml(course.name)}</div>
          <div class="course-meta">${meta}</div>
        </div>
        <div class="card-actions">
          <button class="btn small ghost" data-action="edit-course" data-id="${course.id}">Edit</button>
          <button class="btn small danger" data-action="delete-course" data-id="${course.id}">Delete</button>
        </div>
      </li>`;
  }).join('');
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
  const rows = sortedAssignments();

  empty.hidden = rows.length > 0;
  $('#assignment-table').hidden = rows.length === 0;

  list.innerHTML = rows.map((item) => {
    const course = courseById(item.courseId);
    const classes = [
      item.id === editingAssignmentId ? 'editing' : '',
      item.status === 'Completed' ? 'done' : ''
    ].filter(Boolean).join(' ');

    return `
      <tr class="${classes}">
        <td class="assignment-title">${escapeHtml(item.title)}</td>
        <td>${escapeHtml(course ? course.name : 'Unassigned')}</td>
        <td>${formatDate(item.dueDate)}</td>
        <td>
          <select data-action="set-priority" data-id="${item.id}" aria-label="Priority for ${escapeHtml(item.title)}">
            ${optionList(PRIORITIES, item.priority)}
          </select>
        </td>
        <td>
          <select data-action="set-status" data-id="${item.id}" aria-label="Status for ${escapeHtml(item.title)}">
            ${optionList(STATUSES, item.status)}
          </select>
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
    const course = courseById(editingCourseId);
    Object.assign(course, details);
  } else {
    state.courses.push({ id: uid(), ...details });
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
  const item = state.assignments.find((a) => a.id === id);
  if (!item) return;
  editingAssignmentId = id;
  $('#assignment-title').value = item.title;
  $('#assignment-course').value = item.courseId;
  $('#assignment-due').value = item.dueDate || '';
  $('#assignment-priority').value = item.priority;
  $('#assignment-status').value = item.status;
  $('#assignment-submit').textContent = 'Save changes';
  $('#assignment-cancel').hidden = false;
  $('#assignment-title').focus();
  renderAssignments();
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
    status: $('#assignment-status').value
  };

  if (editingAssignmentId) {
    const item = state.assignments.find((a) => a.id === editingAssignmentId);
    Object.assign(item, details);
  } else {
    state.assignments.push({ id: uid(), ...details });
  }

  saveState();
  resetAssignmentForm();
  render();
}

function deleteAssignment(id) {
  const item = state.assignments.find((a) => a.id === id);
  if (!item || !confirm(`Delete "${item.title}"?`)) return;
  state.assignments = state.assignments.filter((a) => a.id !== id);
  if (editingAssignmentId === id) resetAssignmentForm();
  saveState();
  render();
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
  const select = event.target.closest('select[data-action]');
  if (!select) return;
  const { action, id } = select.dataset;
  const item = state.assignments.find((a) => a.id === id);
  if (!item) return;

  if (action === 'set-priority') item.priority = select.value;
  if (action === 'set-status') item.status = select.value;

  saveState();
  render();
}

function init() {
  loadState();
  render();

  $('#course-form').addEventListener('submit', submitCourse);
  $('#course-cancel').addEventListener('click', () => { resetCourseForm(); renderCourses(); });
  $('#assignment-form').addEventListener('submit', submitAssignment);
  $('#assignment-cancel').addEventListener('click', () => { resetAssignmentForm(); renderAssignments(); });

  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
}

document.addEventListener('DOMContentLoaded', init);
