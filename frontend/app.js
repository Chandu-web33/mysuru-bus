// FRONTEND: talks to the backend with fetch() and builds the page.
const $ = id => document.getElementById(id);

// Small helper that wraps fetch and throws a readable error.
async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// Helper to create an element. textContent (not innerHTML) keeps user-typed text safe.
function el(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}

// ---------- Stops dropdowns ----------
// ---------- Stops (typed search) ----------
let stopsByName = new Map();   // "mysuru palace" -> 2

async function loadStops() {
  const stops = await api('/api/stops');
  // Remember each stop as lowercase name -> id, so typing "PALACE" still works
  stopsByName = new Map(stops.map(s => [s.name.toLowerCase(), s.id]));

  // Fill the suggestion list the browser shows while typing
  const list = $('stop-list');
  list.replaceChildren();
  for (const s of stops) {
    const option = el('option');
    option.value = s.name;
    list.append(option);
  }
}

// Turn what the user typed into a stop id.
// 1) exact match (ignoring capitals)  2) otherwise, if only ONE stop contains the text, use it
function findStopId(typed) {
  const text = typed.trim().toLowerCase();
  if (!text) return null;
  if (stopsByName.has(text)) return stopsByName.get(text);
  const partial = [...stopsByName.keys()].filter(name => name.includes(text));
  return partial.length === 1 ? stopsByName.get(partial[0]) : null;
}

// ---------- Search ----------
// ---------- Search ----------
$('search-form').addEventListener('submit', async e => {
  e.preventDefault();
  const box = $('results');
  box.replaceChildren();
  try {
    const fromId = findStopId($('from').value);
    const toId = findStopId($('to').value);
    if (!fromId) throw new Error('Could not find the "From" stop. Pick one from the suggestions.');
    if (!toId) throw new Error('Could not find the "To" stop. Pick one from the suggestions.');

    const q = new URLSearchParams({ from: fromId, to: toId, after: $('after').value });
    const results = await api('/api/search?' + q);
    if (results.length === 0) {
      box.append(el('p', 'No direct bus between these stops yet.', 'muted'));
      return;
    }
    for (const r of results) box.append(renderResult(r));
  } catch (err) {
    box.append(el('p', err.message, 'error'));
  }
});

// ---------- Swap From and To ----------
$('swap').addEventListener('click', () => {
  const temp = $('from').value;
  $('from').value = $('to').value;
  $('to').value = temp;
});

function renderResult(r) {
  const card = el('div', undefined, 'result');
  const head = el('div', undefined, 'result-head');
  head.append(el('span', r.number, 'badge'), el('span', r.name));
  const body = el('div', undefined, 'result-body');
  body.append(el('div', `Ride time: ${r.rideMinutes} min`, 'muted'));
  if (r.buses.length === 0) {
    body.append(el('p', 'No more buses after this time. Try an earlier time.', 'muted'));
  } else {
    const list = el('ul', undefined, 'times');
    for (const b of r.buses) {
      const li = el('li');
      li.append(el('strong', b.board), el('span', ` arrives ${b.arrive}`, 'muted'));
      list.append(li);
    }
    body.append(list);
  }
  card.append(head, body);
  return card;
}

// ---------- All routes ----------
async function loadRoutes() {
  const box = $('routes');
  box.replaceChildren();
  const routes = await api('/api/routes');
  if (routes.length === 0) box.append(el('p', 'No routes yet. Add one below.', 'muted'));
  for (const r of routes) {
    const card = el('div', undefined, 'route');
    const title = el('div', undefined, 'route-title');
    const left = el('span');
    left.append(el('span', r.number, 'badge'), el('span', r.name));
    const del = el('button', 'Delete', 'delete');
    del.addEventListener('click', async () => {
      if (!confirm(`Delete route ${r.number}?`)) return;
      await api('/api/routes/' + r.id, { method: 'DELETE' });
      await refresh();
    });
    title.append(left, del);
    card.append(title,
      el('div', r.stops.map(s => s.name).join(' → '), 'stops'),
      el('div', 'Leaves the first stop at: ' + r.times.join(', '), 'small-times muted'));
    box.append(card);
  }
}

// ---------- Add a route ----------
$('add-form').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('add-msg');
  msg.className = '';
  try {
    const stops = $('r-stops').value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const i = line.lastIndexOf(',');
      return { name: line.slice(0, i).trim(), minutes: Number(line.slice(i + 1)) };
    });
    const times = $('r-times').value.split(',').map(t => t.trim()).filter(Boolean);
    const returnTimes = $('r-return').value.split(',').map(t => t.trim()).filter(Boolean);
    await api('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: $('r-number').value, name: $('r-name').value, stops, times, returnTimes })
    });
    msg.textContent = 'Route saved.';
    e.target.reset();
    await refresh();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'error';
  }
});

async function refresh() {
  await loadStops();
  await loadRoutes();
}

// Default "leaving after" to the current time
const now = new Date();
$('after').value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
refresh();