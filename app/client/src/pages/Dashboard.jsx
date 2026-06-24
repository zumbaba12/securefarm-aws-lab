import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  return (
    <div>
      <header className="page-head">
        <h1>Dashboard</h1>
        <p className="muted">Operational summary for your plots and seasons.</p>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{data.plotCount}</div>
          <div className="stat-label">Plots</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.activeSeasonCount}</div>
          <div className="stat-label">Active seasons</div>
        </div>
      </div>

      <section className="panel">
        <h2>Recently updated plots</h2>
        {data.recentPlots.length === 0 ? (
          <p className="muted">No plots yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Crop</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPlots.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/plots/${p.id}`}>{p.name}</Link></td>
                  <td>{p.location || '—'}</td>
                  <td>{p.crop_type || '—'}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
