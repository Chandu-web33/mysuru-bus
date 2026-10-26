import { useEffect, useState } from 'react';
import { api } from './api';
import SearchForm from './components/SearchForm';
import MapView from './components/MapView';
import RouteList from './components/RouteList';
import AddRouteForm from './components/AddRouteForm';
import './App.css';

// App owns the data that several components share: the stops and the routes.
export default function App() {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Fetch fresh data from the backend. Children call this after adding or deleting a route.
  async function refresh() {
    try {
      setStops(await api('/api/stops'));
      setRoutes(await api('/api/routes'));
      setLoadError('');
    } catch (err) {
      setLoadError('Could not reach the server. Is "npm start" running in the mini folder?');
    }
  }

  // Runs once when the page opens (the [] means "only once")
  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <header>
        <h1>Mysuru city bus</h1>
        <p>Choose your stop and where you’re headed. See the next buses. Timings are sample data for now, not official.</p>
      </header>
      <main>
        {loadError && <p className="error">{loadError}</p>}
        <SearchForm stops={stops} />
        <MapView stops={stops} routes={routes} />
        <RouteList routes={routes} onChanged={refresh} />
        <AddRouteForm onSaved={refresh} />
      </main>
    </>
  );
}