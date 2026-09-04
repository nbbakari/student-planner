# Student Study Planner & Grade Dashboard

A browser-based planner that lets a student track courses, plan assignments by priority and
status, and watch their grades and progress on a live dashboard.

Built with **Visual Studio Code** and **GitHub Copilot**, versioned with **Git**/**GitHub**,
deployed on **GitHub Pages**. Plain HTML, CSS and JavaScript — no framework, no build step,
no dependencies.

👉 **Full requirements, versions and deployment steps: [SETUP.md](SETUP.md)**

---

## Version history

| Version | Tag | What it adds |
|---|---|---|
| **Version 1 — Basic** | `v1.0` | Courses (add/edit/delete), assignments (add/edit/delete), priority, status, `localStorage` persistence |
| **Version 2 — Enhanced** | `v2.0` | Grades + dashboard (total, completed, remaining, overdue, graded-only average), overdue detection, per-course progress, search/filter/sort, dark mode, JSON export & import |

```bash
git checkout v1.0    # demo the basic version
git checkout main    # back to the enhanced version
```

## Features

**Courses** — name, code, instructor, credits. Deleting a course also removes its assignments
(after a confirmation). Each card shows that course's own progress and average.

**Assignments** — title, course, due date, priority (Low/Medium/High), status
(Not Started/In Progress/Completed) and an optional grade. Priority, status and grade are all
editable straight from the table row.

**Dashboard** — Total, Completed, Remaining, Overdue and Average grade, plus a completion bar.
*Overdue* means past its due date and not yet completed. The **average uses graded assignments
only** — ungraded work is skipped rather than counted as zero.

**Extras in v2** — search by title or course, filter by course/status (including "overdue
only"), five sort orders, a remembered dark mode, and JSON export/import for backups.

**Storage** — everything is saved to `localStorage` on every change, so a refresh loses nothing.
A version 1 save is upgraded automatically when opened in version 2.

## Run it

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

…or just open `index.html`, or use the VS Code **Live Server** extension.

## Test it

```bash
node tests/stats.test.js
```

Covers the Version 2 scenario end to end: 5 assignments → 2 completed, 3 remaining, 1 overdue,
and an average built from the 3 graded assignments only.

## Layout

| File | Role |
|---|---|
| `index.html` | Dashboard, course panel, assignment table |
| `styles.css` | Styling and the dark-theme variables |
| `stats.js` | Pure, DOM-free calculations — shared by the app and the tests |
| `app.js` | State, storage, rendering, events |
| `tests/stats.test.js` | Dashboard maths checks (Node, no dependencies) |
