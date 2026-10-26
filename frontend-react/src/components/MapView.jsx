import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Our own bus-stop symbol. A divIcon is just a small HTML box, so any emoji or SVG works here.
const stopIcon = L.divIcon({
  className: 'stop-marker',
  html: '🚏',
  iconSize: [32, 32],
  iconAnchor: [16, 30],   // the tip of the symbol sits on the exact position
  popupAnchor: [0, -28]   // the popup opens just above the symbol
});

const MYSURU_CENTER = [12.3052, 76.6551];

export default function MapView({ stops, routes }) {
  // Only stops with a position can be drawn
  const placed = stops.filter(s => s.latitude != null && s.longitude != null);

  // Which route numbers visit each stop? e.g. "Mysuru Palace" -> {"201"}
  const routesAtStop = new Map();
  for (const route of routes) {
    for (const stop of route.stops) {
      if (!routesAtStop.has(stop.name)) routesAtStop.set(stop.name, new Set());
      routesAtStop.get(stop.name).add(route.number);
    }
  }

  return (
    <section aria-labelledby="map-h">
      <h2 id="map-h">Bus stops map</h2>
      <div className="map-box">
        <MapContainer center={MYSURU_CENTER} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          {placed.map(s => (
            <Marker key={s.id} position={[s.latitude, s.longitude]} icon={stopIcon}>
              <Popup>
                <strong>{s.name}</strong>
                <br />
                Routes: {[...(routesAtStop.get(s.name) ?? [])].join(', ') || 'none'}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {placed.length < stops.length && (
        <p className="muted">
          {stops.length - placed.length} stop(s) have no position yet, so they are not shown on the map.
        </p>
      )}
    </section>
  );
}