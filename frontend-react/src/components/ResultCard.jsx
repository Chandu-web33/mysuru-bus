// One search result. It only displays what it is given (props), so it needs no state.
export default function ResultCard({ route }) {
  return (
    <div className="result">
      <div className="result-head">
        <span className="badge">{route.number}</span>
        <span>{route.name}</span>
      </div>
      <div className="result-body">
        <div className="muted">Ride time: {route.rideMinutes} min</div>
        {route.buses.length === 0 ? (
          <p className="muted">No more buses after this time. Try an earlier time.</p>
        ) : (
          <ul className="times">
            {route.buses.map(b => (
              <li key={b.board}>
                <strong>{b.board}</strong>
                <span className="muted"> arrives {b.arrive}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}