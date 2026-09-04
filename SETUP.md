# SETUP — Student Study Planner & Grade Dashboard

Everything needed to run, develop, version and deploy this project.
Built with Visual Studio Code + GitHub Copilot, versioned with Git/GitHub, deployed on GitHub Pages.

---

## 1. Requirements

### Must have

| Tool | Minimum version | Used for | Check with |
|---|---|---|---|
| A modern browser | Chrome 90+ / Edge 90+ / Firefox 88+ / Safari 15+ | Running the app (needs `localStorage`) | `chrome://version` |
| Git | 2.30+ (built with **2.43.0**) | Version control, tags | `git --version` |
| Visual Studio Code | 1.85+ | Development environment | Help → About |
| GitHub account | — | Remote repository + GitHub Pages | github.com |

### VS Code extensions

| Extension | Publisher | Why |
|---|---|---|
| **GitHub Copilot** | GitHub | AI code completion |
| **GitHub Copilot Chat** | GitHub | Ask/Edit/Agent mode prompts |
| **Live Server** (`ritwickdey.LiveServer`) | Ritwick Dey | One-click local preview with auto-reload |

Install from the terminal if you prefer:

```bash
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat
code --install-extension ritwickdey.LiveServer
```

Copilot needs an active subscription — free for verified students through the
[GitHub Student Developer Pack](https://education.github.com/pack).

### Optional (only for the automated test)

| Tool | Version | Used for |
|---|---|---|
| Node.js | 18+ (built with **v24.20.0**) | `node tests/stats.test.js` |
| Python 3 | 3.7+ | `python3 -m http.server` as a local preview |

**The app itself has zero dependencies** — no npm install, no build step, no framework.
Plain HTML + CSS + JavaScript, which is exactly what GitHub Pages serves.

---

## 2. Project structure

```
study-planner/
├── index.html          # markup: dashboard, course panel, assignment table
├── styles.css          # all styling, incl. the dark theme variables
├── stats.js            # pure calculations (total/completed/overdue/average)
├── app.js              # state, storage, rendering, event handling
├── tests/
│   └── stats.test.js   # checks the dashboard maths (Node, no dependencies)
├── README.md           # what the project is + version history
├── SETUP.md            # this file
└── .gitignore
```

`stats.js` is deliberately DOM-free so the same code the browser runs can be tested in Node.

---

## 3. Running it locally

Pick any one:

1. **Live Server (recommended)** — open the folder in VS Code, right-click `index.html` → *Open with Live Server*.
2. **Python** — `python3 -m http.server 8000`, then open <http://localhost:8000>.
3. **Straight from disk** — double-click `index.html`. Works, because there is no build step.

Run the calculation test:

```bash
node tests/stats.test.js
```

Expected output ends with `All dashboard checks passed.`

---

## 4. How it was implemented

### Version 1 — Basic Version (tag `v1.0`)

| Required function | Implementation |
|---|---|
| Add a course | `submitCourse()` pushes `{id, name, code, instructor, credits}` into `state.courses` |
| Edit a course | `startCourseEdit()` loads the record into the form; submitting updates in place |
| Delete a course | `deleteCourse()` confirms first, and removes that course's assignments too |
| Add an assignment | `submitAssignment()` — title + course required, plus due date, priority, status |
| Edit / delete an assignment | Row buttons → `startAssignmentEdit()` / `deleteAssignment()` |
| Change priority | `<select>` in each row (Low / Medium / High) → `handleChange()` |
| Change status | `<select>` in each row (Not Started / In Progress / Completed) |
| Data survives a refresh | Every mutation calls `saveState()` → `localStorage["study-planner-v1"]` |

### Version 2 — Enhanced Version (tag `v2.0`)

Everything from v1, plus:

| Addition | Detail |
|---|---|
| **Grades** | Optional 0–100 grade per assignment, editable inline in the table or in the form |
| **Dashboard** | Total, Completed, Remaining, Overdue and Average grade cards + a completion bar |
| **Overdue detection** | Due date earlier than today **and** status is not Completed |
| **Graded-only average** | Ungraded work is skipped, never counted as zero; shows `—` when nothing is graded |
| **Per-course progress** | Each course card shows `x/y done · avg n% · n overdue` |
| **Search & filter** *(extra feature)* | Search by title/course/code; filter by course and status, incl. "Overdue only" |
| **Sorting** *(extra feature)* | Due date ↑↓, priority, grade, or title |
| **Dark mode** *(extra feature)* | Remembered in `localStorage`, otherwise follows the OS setting |
| **Export / Import JSON** *(extra feature)* | Back the planner up to a file and restore it on another machine |
| **Data migration** | v2 reads a v1 save and adds the missing `grade` field automatically |

Storage keys: v1 uses `study-planner-v1`; v2 writes `study-planner-v2` but will read a v1 save once.

---

## 5. Git workflow (what this repository already contains)

```
git init                      →  initial repository
   ↓  Version 1 development
git commit                    →  "feat: Version 1 — study planner with course and assignment management"
git tag -a v1.0               →  Version 1 marked
   ↓  additional development (4 commits)
   ·  grade tracking and live dashboard summary
   ·  search, filtering, sorting and per-course progress
   ·  dark mode and JSON backup / restore
   ·  documentation for version 2 (README + this guide)
git tag -a v2.0               →  Version 2 marked
```

Inspect it:

```bash
git log --oneline --decorate --graph
git tag -l -n1
git show v1.0 --stat
git diff v1.0 v2.0 --stat        # exactly what changed between versions
```

### Reproducing the tagging steps yourself

```bash
git add .
git commit -m "feat: your change"
git tag -a v2.1 -m "Version 2.1 — description"
```

---

## 6. Publishing to GitHub

```bash
# 1. Create an EMPTY repo on github.com (no README, no .gitignore)

# 2. Connect and push the branch
git remote add origin https://github.com/<your-username>/study-planner.git
git branch -M main
git push -u origin main

# 3. Push the version tags — these do NOT go up with a normal push
git push origin --tags
```

Confirm on GitHub: **Code → Tags** should list `v1.0` and `v2.0`, and **Releases** can be
created from either tag for the demonstration.

---

## 7. Deploying with GitHub Pages

1. On GitHub open **Settings → Pages**.
2. **Source:** `Deploy from a branch`.
3. **Branch:** `main`, **Folder:** `/ (root)` → **Save**.
4. Wait ~1 minute, then visit:
   `https://<your-username>.github.io/study-planner/`

It works with no configuration because `index.html` sits in the repository root and all
paths (`styles.css`, `stats.js`, `app.js`) are relative.

**To publish a fix:** commit → `git push` → Pages redeploys automatically (~1 min).
Hard-refresh (`Ctrl+Shift+R`) if you still see the old version.

---

## 8. Demonstrating both versions

```bash
git checkout v1.0     # the basic version, exactly as tagged
# ... demo, then come back:
git checkout main     # the enhanced version
```

While on a tag Git says *"detached HEAD"* — that is normal and expected for a read-only demo.

> **Tip for the demo:** v1 and v2 use different storage keys, so v1 data will not be
> destroyed. If you want each version to start empty, demo them in different browser
> profiles, or open DevTools → Application → Local Storage and clear the key.

---

## 9. Test plans

### Version 1 checklist

| # | Step | Expected |
|---|---|---|
| 1 | Add a course | Card appears in the Courses list |
| 2 | Edit that course | Card shows the new details, no duplicate created |
| 3 | Delete a course | Card disappears after the confirmation |
| 4 | Add several courses | All appear; each is selectable in the assignment form |
| 5 | Add an assignment | Row appears in the table under the right course |
| 6 | Edit the assignment | Row updates in place |
| 7 | Delete the assignment | Row disappears after confirmation |
| 8 | Change priority | Dropdown keeps the new value |
| 9 | Change status | Dropdown keeps the new value; Completed strikes the title through |
| 10 | Refresh the browser (F5) | **Every course, assignment, priority and status is still there** |

### Version 2 scenario

Create **5 assignments**, then:
complete **2** → make **1 unfinished assignment overdue** (due date in the past) →
enter grades on **only 3** (e.g. 80, 90, 70).

| Dashboard card | Expected |
|---|---|
| Total | **5** |
| Completed | **2** |
| Remaining | **3** |
| Overdue | **1** |
| Average grade | **80.0%** — the mean of 80, 90 and 70 only |
| Graded note | `(3 of 5 graded)` |

The two ungraded assignments must not drag the average down; `(80+90+70)/3 = 80`,
not `(80+90+70)/5 = 48`. That rule is locked in by `tests/stats.test.js`, which also
covers a grade of `0` (counts) versus an empty grade box (does not).

---

## 10. Using GitHub Copilot on this project

Open Copilot Chat with `Ctrl+Alt+I` (`Cmd+Alt+I` on macOS); inline suggestions with `Ctrl+I`.

Prompts that fit this codebase:

- `Add a "notes" field to each assignment, shown when the row is expanded.`
- `#file:stats.js add a weighted average that uses each course's credits.`
- `Explain how deleting a course also removes its assignments.`
- `Write a test for computeStats where every assignment is graded 0.`
- `/tests` on `stats.js` — generates more cases in the existing style.

Accept a suggestion with `Tab`, dismiss with `Esc`, cycle alternatives with `Alt+]`.
Re-run `node tests/stats.test.js` after any Copilot edit to `stats.js`.

---

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Data vanishes on refresh | Private/incognito window, or site data blocked. Use a normal window. |
| Pages shows a 404 | `index.html` must be in the repo root, and Pages set to `main` + `/ (root)`. |
| Pages shows the old version | Browser cache — hard-refresh with `Ctrl+Shift+R`. |
| Tags missing on GitHub | Tags need their own push: `git push origin --tags`. |
| `git push` rejected | The GitHub repo was created with a README. Run `git pull --rebase origin main` first. |
| Overdue count looks wrong | Overdue means past due **and** not Completed; finishing late clears it. |
| Copilot not suggesting | Check the status-bar icon is not muted, and that you are signed in to GitHub in VS Code. |
