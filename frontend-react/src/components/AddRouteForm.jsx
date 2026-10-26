import { useState } from 'react';
import { api } from '../api';

// "07:00, 07:30" -> ["07:00", "07:30"]
const splitList = text => text.split(',').map(t => t.trim()).filter(Boolean);

// One line of the stops box -> { name, minutes, latitude?, longitude? }
// "Mysuru Palace, 10, 12.3052, 76.6551"  or just  "Mysuru Palace, 10"
function parseStopLine(line) {
  const parts = line.split(',').map(p => p.trim());
  const stop = { name: parts[0], minutes: Number(parts[1]) };
  if (parts[2] && parts[3]) {
    stop.latitude = Number(parts[2]);
    stop.longitude = Number(parts[3]);
  }
  return stop;
}

export default function AddRouteForm({ onSaved }) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [stopsText, setStopsText] = useState('');
  const [times, setTimes] = useState('');
  const [returnTimes, setReturnTimes] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const stops = stopsText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(parseStopLine);

      await api('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number,
          name,
          stops,
          times: splitList(times),
          returnTimes: splitList(returnTimes)
        })
      });

      setMsg({ text: 'Route saved.', isError: false });
      setNumber('');
      setName('');
      setStopsText('');
      setTimes('');
      setReturnTimes('');
      onSaved(); // ask App to reload the data
    } catch (err) {
      setMsg({ text: err.message, isError: true });
    }
  }

  return (
    <section className="panel" aria-labelledby="add-h">
      <h2 id="add-h">Add a route</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Route number
          <input value={number} onChange={e => setNumber(e.target.value)} placeholder="201" required />
        </label>
        <label>
          Route name
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="City Bus Stand to Chamundi Hill"
            required
          />
        </label>
        <label>
          Stops, one per line: name, minutes after the first stop, latitude, longitude (position is optional)
          <textarea
            rows="5"
            value={stopsText}
            onChange={e => setStopsText(e.target.value)}
            placeholder={'City Bus Stand, 0\nMysuru Palace, 10, 12.3052, 76.6551\nChamundi Hill, 35, 12.2725, 76.6700'}
            required
          />
        </label>
        <label>
          Departure times from the first stop, separated by commas
          <input value={times} onChange={e => setTimes(e.target.value)} placeholder="07:00, 07:30, 08:00" required />
        </label>
        <label>
          Return departure times from the last stop (optional, leave empty for one-way)
          <input value={returnTimes} onChange={e => setReturnTimes(e.target.value)} placeholder="08:00, 08:30, 09:00" />
        </label>
        <button type="submit">Save route</button>
        <p role="status" className={msg.isError ? 'error' : ''}>
          {msg.text}
        </p>
      </form>
    </section>
  );
}