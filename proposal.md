# SPACE Mentor Tracker — Project Proposal

## What are you building? Who is it for?
A web-based session tracker for SPACE program mentors. It lets mentors log which students they cased, which case they used, and gives the whole cohort a shared view of coverage — all in one place. Built for SPACE mentors at Babson College.

## Why?
Tracking mentor sessions manually across spreadsheets creates blind spots — some students get cased multiple times while others get skipped. This app gives every mentor a shared, real-time view so the whole cohort gets covered evenly.

## MVP vs. Stretch Goals
**MVP:**
- Log a session (mentor name, student name, case used)
- View cohort roster with casing status
- Persist data in the browser with localStorage

**Stretch Goals:**
- Real-time shared storage via Supabase so all mentors see the same data
- Case library with search, import (CSV/JSON), and export
- Dashboard with live coverage stats and cohort progress bar
- Dark/light mode theme toggle
- Responsive mobile layout

## Technologies
- HTML5, CSS3 (Flexbox, Grid, custom properties, media queries)
- Vanilla JavaScript (ES6+)
- Supabase (PostgreSQL database + REST API for shared real-time storage)
- localStorage (offline fallback)
- GitHub Pages (deployment)
- Claude and GitHub Copilot (AI-assisted development)
