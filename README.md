# Student Study Planner & Grade Dashboard

A browser-based planner for students, built with **Visual Studio Code**, **GitHub Copilot**,
**Git** and **GitHub**, and deployed with **GitHub Pages**. No build tools, no frameworks —
just HTML, CSS and vanilla JavaScript, so the repository can be served directly.

## Version 1 — Basic Version (tag `v1.0`)

| Requirement | Where it lives |
|---|---|
| Add a course | `Courses` form → `submitCourse()` in `app.js` |
| Edit a course | `Edit` on a course card → `startCourseEdit()` |
| Delete a course | `Delete` on a course card → `deleteCourse()` (also removes its assignments) |
| Add / edit / delete assignments | `Assignments` form + row buttons |
| Change priority | Priority dropdown inside each row |
| Change status | Status dropdown inside each row |
| Data survives a refresh | `localStorage` key `study-planner-v1` |

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

See `SETUP.md` for full requirements, versions and deployment steps.
