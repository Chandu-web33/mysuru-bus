// DATABASE LAYER: creates the tables, seeds sample data, and exposes `db`.
// SQLite keeps everything in one file (bus.db), so there is nothing to install or run.
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bus.db'));
db.pragma('foreign_keys = ON'); // makes ON DELETE CASCADE work

// 4 tables:
//  stops       - every bus stop once
//  routes      - a bus number + name
//  route_stops - which stops a route visits, in order (seq), and minutes after leaving the first stop
//  timings     - departure times from the route's first stop
db.exec(`
  CREATE TABLE IF NOT EXISTS stops (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY,
    number TEXT NOT NULL,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS route_stops (
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    stop_id INTEGER NOT NULL REFERENCES stops(id),
    seq INTEGER NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (route_id, seq)
  );
  CREATE TABLE IF NOT EXISTS timings (
    id INTEGER PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    departure TEXT NOT NULL  -- "HH:MM", 24-hour
  );
`);

// A transaction = all inserts succeed together, or none of them do.
const addRoute = db.transaction((number, name, stops, times) => {
  const routeId = db.prepare('INSERT INTO routes (number, name) VALUES (?, ?)').run(number, name).lastInsertRowid;
  const insertStop = db.prepare('INSERT OR IGNORE INTO stops (name) VALUES (?)');
  const findStop = db.prepare('SELECT id FROM stops WHERE name = ?');
  const insertRS = db.prepare('INSERT INTO route_stops (route_id, stop_id, seq, minutes) VALUES (?, ?, ?, ?)');
  stops.forEach((s, i) => {
    insertStop.run(s.name);
    insertRS.run(routeId, findStop.get(s.name).id, i, s.minutes);
  });
  const insertTime = db.prepare('INSERT INTO timings (route_id, departure) VALUES (?, ?)');
  times.forEach(t => insertTime.run(routeId, t));
  return routeId;
});

function deleteRoute(id) {
  db.prepare('DELETE FROM routes WHERE id = ?').run(id);
  db.prepare('DELETE FROM stops WHERE id NOT IN (SELECT stop_id FROM route_stops)').run(); // tidy unused stops
}

// Helper for seed data: every("07:00", "21:00", 30) -> ["07:00", "07:30", ...]
function every(start, end, stepMin) {
  const toMin = t => t.split(':').reduce((h, m) => h * 60 + +m);
  const out = [];
  for (let m = toMin(start); m <= toMin(end); m += stepMin) {
    out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  }
  return out;
}

// Reverse a route: stops in the opposite order, minutes counted from the new first stop.
// (Assumes minutes go up along the route: 0, 10, 22, 35 ...)
function reverseStops(stops) {
  const total = stops[stops.length - 1].minutes;
  return stops
    .map(s => ({ name: s.name, minutes: total - s.minutes }))
    .reverse();
}

// Create the return route of a forward route. The name is built from its first and last stops.
function addReturnRoute(number, stops, returnTimes) {
  const back = reverseStops(stops);
  const name = `${back[0].name} to ${back[back.length - 1].name}`;
  return addRoute(number, name, back, returnTimes);
}


// SAMPLE DATA ONLY: replace with real routes and timings (see README).
// SAMPLE DATA ONLY: replace with real routes and timings.
if (db.prepare('SELECT COUNT(*) AS n FROM routes').get().n === 0) {
  const s201 = [{ name: 'City Bus Stand', minutes: 0 }, { name: 'Mysuru Palace', minutes: 10 },
                { name: 'Lalitha Mahal', minutes: 22 }, { name: 'Chamundi Hill', minutes: 35 }];
  addRoute('201', 'City Bus Stand to Chamundi Hill', s201, every('07:00', '20:00', 30));
  addReturnRoute('201', s201, every('07:30', '20:30', 30));

  const s62 = [{ name: 'City Bus Stand', minutes: 0 }, { name: 'Railway Station', minutes: 8 },
               { name: 'Vijayanagar', minutes: 20 }, { name: 'Kuvempunagar', minutes: 30 }];
  addRoute('62', 'City Bus Stand to Kuvempunagar', s62, every('06:30', '21:00', 20));
  addReturnRoute('62', s62, every('06:45', '21:15', 20));

  const s150 = [{ name: 'City Bus Stand', minutes: 0 }, { name: 'Railway Station', minutes: 8 },
                { name: 'Hebbal', minutes: 22 }, { name: 'Infosys Campus', minutes: 35 }];
  addRoute('150', 'City Bus Stand to Infosys Campus', s150, every('06:00', '19:00', 45));
  addReturnRoute('150', s150, every('06:30', '19:30', 45));

  const s17 = [{ name: 'City Bus Stand', minutes: 0 }, { name: 'Vijayanagar', minutes: 18 },
               { name: 'Bogadi', minutes: 30 }];
  addRoute('17', 'City Bus Stand to Bogadi', s17, every('06:30', '20:30', 25));
  addReturnRoute('17', s17, every('06:45', '20:45', 25));
}

module.exports = { db, addRoute, addReturnRoute, deleteRoute };