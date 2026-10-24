import { useState } from 'react';
import { api } from '../api';
import ResultCard from './ResultCard';

function nowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export default function SearchForm({ stops }) {
  // Every changing value lives in state. Typing in a box updates its state variable.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [after, setAfter] = useState(nowHHMM());
  const [results, setResults] = useState(null); // null = no search done yet
  const [error, setError] = useState('');

  // Turn typed text into a stop id: exact match first, else a single partial match
  function findStopId(typed) {
    const text = typed.trim().toLowerCase();
    if (!text) return null;
    const exact = stops.find(s => s.name.toLowerCase() === text);
    if (exact) return exact.id;
    const partial = stops.filter(s => s.name.toLowerCase().includes(text));
    return partial.length === 1 ? partial[0].id : null;
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  async function handleSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    setError('');
    setResults(null);

    const fromId = findStopId(from);
    const toId = findStopId(to);
    if (!fromId) return setError('Could not find the "From" stop. Pick one from the suggestions.');
    if (!toId) return setError('Could not find the "To" stop. Pick one from the suggestions.');

    try {
      const q = new URLSearchParams({ from: fromId, to: toId, after });
      setResults(await api('/api/search?' + q));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel" aria-labelledby="find-h">
      <h2 id="find-h">Find a bus</h2>
      <form onSubmit={handleSubmit}>
        <label>
          From
          <input
            value={from}
            onChange={e => setFrom(e.target.value)}
            list="stop-list"
            placeholder="Type a stop, e.g. Palace"
            autoComplete="off"
            required
          />
        </label>

        <button type="button" id="swap" onClick={swap} aria-label="Swap From and To">
          ⇅ Swap
        </button>

        <label>
          To
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            list="stop-list"
            placeholder="Type a stop, e.g. Hebbal"
            autoComplete="off"
            required
          />
        </label>

        {/* suggestions shown while typing, built from the stops list */}
        <datalist id="stop-list">
          {stops.map(s => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>

        <label>
          Leaving after
          <input type="time" value={after} onChange={e => setAfter(e.target.value)} />
        </label>

        <button type="submit">Find buses</button>
      </form>

      <div aria-live="polite">
        {error && <p className="error">{error}</p>}
        {results && results.length === 0 && (
          <p className="muted">No direct bus between these stops yet.</p>
        )}
        {results && results.map(r => <ResultCard key={r.number + r.name} route={r} />)}
      </div>
    </section>
  );
}