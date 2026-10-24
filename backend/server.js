// BACKEND: an Express server that serves the website AND a JSON API.
// Browser (public/app.js)  --fetch-->  /api/...  --SQL-->  bus.db
const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, addRoute, deleteRoute } = require('../database/db');

const app = express();
app.use(express.json());                                   // read JSON request bodies
// Serve the React build if it exists, otherwise the old plain-JS frontend
const reactBuild = path.join(__dirname, '..', 'frontend-react', 'dist');
const webFolder = fs.existsSync(reactBuild) ? reactBuild : path.join(__dirname, '..', 'frontend');
app.use(express.static(webFolder));

// "07:30" <-> minutes since midnight, so we can do arithmetic on times
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toHHMM = n => String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');

// GET /api/stops  -> every stop, for the dropdowns
app.get('/api/stops', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM stops ORDER BY name').all());
});

// GET /api/routes  -> every route with its stops and departure times
app.get('/api/routes', (req, res) => {
  const routes = db.prepare('SELECT id, number, name FROM routes ORDER BY CAST(number AS INTEGER), number').all();
  const stopsQ = db.prepare(`SELECT s.name, rs.minutes FROM route_stops rs
                             JOIN stops s ON s.id = rs.stop_id WHERE rs.route_id = ? ORDER BY rs.seq`);
  const timesQ = db.prepare('SELECT departure FROM timings WHERE route_id = ? ORDER BY departure');
  res.json(routes.map(r => ({ ...r, stops: stopsQ.all(r.id), times: timesQ.all(r.id).map(t => t.departure) })));
});

// GET /api/search?from=<stopId>&to=<stopId>&after=HH:MM
// Finds direct buses that visit `from` BEFORE `to`, then works out when each bus reaches
// the boarding stop: departure from first stop + minutes to the boarding stop.
app.get('/api/search', (req, res) => {
  const { from, to, after } = req.query;
  if (!from || !to || from === to) return res.status(400).json({ error: 'Pick two different stops.' });
  const afterMin = after ? toMin(after) : 0;

  const matches = db.prepare(`
    SELECT r.id, r.number, r.name, a.minutes AS fromMin, b.minutes AS toMin
    FROM routes r
    JOIN route_stops a ON a.route_id = r.id AND a.stop_id = ?
    JOIN route_stops b ON b.route_id = r.id AND b.stop_id = ?
    WHERE a.seq < b.seq`).all(from, to);

  const timesQ = db.prepare('SELECT departure FROM timings WHERE route_id = ? ORDER BY departure');
  const results = matches.map(r => ({
    number: r.number,
    name: r.name,
    rideMinutes: r.toMin - r.fromMin,
    buses: timesQ.all(r.id)
      .map(t => toMin(t.departure))
      .map(dep => ({ board: dep + r.fromMin, arrive: dep + r.toMin }))
      .filter(b => b.board >= afterMin)
      .slice(0, 5)
      .map(b => ({ board: toHHMM(b.board), arrive: toHHMM(b.arrive) }))
  }));
  res.json(results);
});


// POST /api/routes  -> add a route
// When READ_ONLY=true (set on the hosting site), nobody can add or delete routes
function blockWrites(req, res, next) {
  if (process.env.READ_ONLY === 'true') {
    return res.status(403).json({ error: 'This public site is read-only.' });
  }
  next();
}

// body: { number, name, stops: [{name, minutes}], times: ["07:00", ...] }
// POST /api/routes  -> add a route (and optionally its return route)
// body: { number, name, stops: [{name, minutes}], times: [...], returnTimes: [...] }
app.post('/api/routes', blockWrites, (req, res) => {
  const { number, name, stops, times, returnTimes } = req.body;
  const okTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  if (!number || !name) return res.status(400).json({ error: 'Route number and name are required.' });
  if (!Array.isArray(stops) || stops.length < 2 || stops.some(s => !s.name || !Number.isInteger(s.minutes) || s.minutes < 0))
    return res.status(400).json({ error: 'Give at least 2 stops, each as "Stop name, minutes".' });
  if (!Array.isArray(times) || times.length === 0 || !times.every(okTime))
    return res.status(400).json({ error: 'Times must look like 07:30, separated by commas.' });

  const wantsReturn = Array.isArray(returnTimes) && returnTimes.length > 0;
  if (wantsReturn && !returnTimes.every(okTime))
    return res.status(400).json({ error: 'Return times must look like 07:30, separated by commas.' });

  const id = addRoute(String(number).trim(), String(name).trim(), stops, times);
  if (wantsReturn) addReturnRoute(String(number).trim(), stops, returnTimes);
  res.status(201).json({ id });
});

// DELETE /api/routes/:id  -> remove a route
app.delete('/api/routes/:id', blockWrites, (req, res) => {
  deleteRoute(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mysuru Bus running at http://localhost:${PORT}`));