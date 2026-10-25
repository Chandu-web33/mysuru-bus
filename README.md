# Mysuru City Bus

A full-stack web app to find city bus routes and timings in Mysuru.

## Features
- Search buses between two stops by typing stop names, with suggestions
- Swap From and To with one click
- Return routes for every route
- Add and delete routes (disabled on the public site)

## Tech stack
- Frontend: React (Vite)
- Backend: Node.js, Express
- Database: SQLite (better-sqlite3)

## Run it locally
1. Install Node.js 20 or newer
2. In the project folder: `npm install`
3. Build the frontend: `npm run build`
4. Start the server: `npm start`
5. Open http://localhost:3000

## How it works
Browser (React) -> `/api/...` (Express) -> SQL (SQLite) -> JSON back to the browser.

## Note
The routes and timings in `database/db.js` are sample data, not official timetables.

Live demo: https://mysuru-bus.onrender.com (free hosting, so the first load can take about a minute)
