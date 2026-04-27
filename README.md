# SPACE Mentor Tracker

A lightweight, real-time session tracker for SPACE program mentors at Babson College. Log who cased whom, track cohort coverage, manage a shared case library, and monitor session stats — all from one shared web app.

## Live Demo
[https://SumairNibber.github.io/SPACE](https://SumairNibber.github.io/SPACE)

## Features
- **Session Logging** — Record mentor name, student cased, case used, and notes
- **Cohort Roster** — View all students with their current casing status; search by name
- **Case Library** — Add, search, and delete cases; import via CSV or JSON; export the full library
- **Dashboard** — Live stats: total sessions, unique students cased, students not yet cased, most-used case, and cohort coverage progress bar
- **Dark / Light Theme Toggle** — Persists across sessions via localStorage
- **Real-time Shared Storage** — Supabase backend syncs data across all users; falls back to localStorage if cloud is unavailable
- **Responsive Design** — Works on mobile, tablet, and desktop

## Technologies Used
- HTML5 (semantic markup, ARIA attributes)
- CSS3 (Flexbox, Grid, custom properties, media queries, dark theme)
- Vanilla JavaScript ES6+ (modules, async/await, fetch API)
- [Supabase](https://supabase.com) — PostgreSQL database with REST API for shared persistent storage
- localStorage — offline/fallback storage
- GitHub Pages — static hosting and deployment

## AI Tools Used
- **Claude (claude.ai)** — Scaffolded the Supabase storage abstraction layer, the CSV/JSON import parser, and the dashboard stats renderer. Also used for code review and debugging the async storage initialization flow.
- **GitHub Copilot** — Assisted with autocompletion throughout, particularly in repetitive DOM render functions and CSS rule generation.

All AI-generated code was reviewed, tested, and understood before inclusion. Comments in the source mark specific AI-assisted sections.

## Challenges & Solutions
- **GitHub Pages can't store shared data** — Solved by integrating Supabase as a backend with an anonymous public API key, with automatic fallback to localStorage so the app still works offline or before Supabase is configured.
- **Keeping cohort state in sync across multiple users** — Solved with a polling refresh (every 60 seconds) that re-fetches Supabase data and merges it with local state without wiping unsaved form inputs.
- **CSV import with inconsistent column names** — Solved by normalizing headers to lowercase and trimming whitespace before mapping, so imports work regardless of how the CSV was exported.

## Future Improvements
- User authentication (Supabase Auth) so each mentor has a personal login and session history
- Chart.js integration on the Dashboard to visualize casing frequency over time
- Push notifications or email alerts when a student hasn't been cased in over a week
- PWA (Progressive Web App) support so mentors can install it on their phones and use it offline
- Admin view to manage the cohort roster and set required casing targets per student
