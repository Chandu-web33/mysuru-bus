import { useState } from 'react';
import { api } from '../api';

// "07:00, 07:30" -> ["07:00", "07:30"]
const splitList = text => text.split(',').map(t => t.trim()).filter(Boolean);

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
      // each line "Stop name, minutes" -> { name, minutes }
      const stops = stopsText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(line => {
          const i = line.lastIndexOf(',');
          return { name: line.slice(0, i).trim(), minutes: Number(line.slice(i + 1)) };
        });

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
          Stops, one per line: name, minutes after the first stop
          <textarea
            rows="5"
            value={stopsText}
            onChange={e => setStopsText(e.target.value)}
            placeholder={'City Bus Stand, 0\nMysuru Palace, 10\nChamundi Hill, 35'}
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