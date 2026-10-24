import { api } from '../api';

export default function RouteList({ routes, onChanged }) {
  async function remove(route) {
    if (!confirm(`Delete route ${route.number}?`)) return;
    await api('/api/routes/' + route.id, { method: 'DELETE' });
    onChanged(); // ask App to reload the routes
  }

  return (
    <section aria-labelledby="routes-h">
      <h2 id="routes-h">All routes</h2>
      {routes.length === 0 && <p className="muted">No routes yet. Add one below.</p>}
      {routes.map(r => (
        <div className="route" key={r.id}>
          <div className="route-title">
            <span>
              <span className="badge">{r.number}</span>
              <span>{r.name}</span>
            </span>
            <button className="delete" onClick={() => remove(r)}>
              Delete
            </button>
          </div>
          <div className="stops">{r.stops.map(s => s.name).join(' → ')}</div>
          <div className="small-times muted">Leaves the first stop at: {r.times.join(', ')}</div>
        </div>
      ))}
    </section>
  );
}