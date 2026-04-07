# SPACE Mentor Tracker

A lightweight tracker for the SPACE program. It lets mentors record:

- who they cased
- what case they used
- which cohort members still need coverage
- the current shared case library

## What changed in this version

- The header now runs across the top of the app instead of using a side hero layout.
- The UI has been simplified to feel more like an internal Microsoft-style tool.
- Case deletion is available directly in the case library table.
- The app now supports shared cloud storage for GitHub Pages through Supabase, with local browser fallback if cloud storage is not configured.

## Files

- [index.html](/c:/GITHUB/SPACE/index.html) - app layout
- [styles.css](/c:/GITHUB/SPACE/styles.css) - app styling
- [app.js](/c:/GITHUB/SPACE/app.js) - tracker logic and storage layer
- [storage-config.js](/c:/GITHUB/SPACE/storage-config.js) - deployment-time storage settings
- [supabase-schema.sql](/c:/GITHUB/SPACE/supabase-schema.sql) - shared storage tables and policies

## Local use

1. Open [index.html](/c:/GITHUB/SPACE/index.html) in a browser.
2. If `storage-config.js` is left in `local` mode, data is saved only in that browser.

## Shared storage for GitHub Pages

GitHub Pages can host the site, but it cannot store shared edits by itself. For shared session tracking, this app is set up to use Supabase.

### Setup

1. Create a Supabase project.
2. Run [supabase-schema.sql](/c:/GITHUB/SPACE/supabase-schema.sql) in the Supabase SQL editor.
3. Open [storage-config.js](/c:/GITHUB/SPACE/storage-config.js).
4. Set:
   - `provider` to `"supabase"`
   - `supabaseUrl` to your project URL
   - `supabaseAnonKey` to your public anon key
5. Deploy the repo to GitHub Pages.

### Notes

- In `local` mode, the app uses browser storage only.
- In `supabase` mode, the app loads shared data, writes changes to Supabase, and refreshes on a timer.
- Backup import/export stays available in both modes.

## Case imports

You can import either:

- `.json` with an array of case objects or an object with a `cases` array
- `.csv` with headers such as `title`, `category`, `difficulty`, `link`, `notes`
