import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api.js';

const emptySeason = {
  season_name: '',
  crop_type: '',
  variety: '',
  start_date: '',
  expected_harvest_date: '',
  status: 'active',
  notes: '',
};

export default function PlotDetail() {
  const { id } = useParams();
  const [plot, setPlot] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [form, setForm] = useState(emptySeason);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    apiFetch(`/api/plots/${id}`)
      .then((data) => { setPlot(data.plot); setSeasons(data.seasons); })
      .catch((err) => setError(err.message));
  }

  useEffect(() => { load(); }, [id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/api/plots/${id}/seasons`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(emptySeason);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="form-error">{error}</div>;
  if (!plot) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="breadcrumb"><Link to="/plots">← Plots</Link></div>
      <header className="page-head">
        <h1>{plot.name}</h1>
        <span className={`badge badge-${plot.status}`}>{plot.status}</span>
      </header>

      <section className="panel">
        <h2>Plot details</h2>
        <dl className="detail-list">
          <div><dt>Location</dt><dd>{plot.location || '—'}</dd></div>
          <div><dt>Size</dt><dd>{plot.size_hectares ?? '—'} ha</dd></div>
          <div><dt>Crop type</dt><dd>{plot.crop_type || '—'}</dd></div>
        </dl>
        {/*
          LAB_VULNERABILITY (stored-xss): plot notes are rendered as raw HTML
          via dangerouslySetInnerHTML, so a stored <script>/<img onerror> style
          payload in the notes field will execute when this page loads.
        */}
        <div className="notes-block">
          <h3>Notes</h3>
          <div
            className="notes-body"
            dangerouslySetInnerHTML={{ __html: plot.notes || '<em>No notes.</em>' }}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Seasons</h2>
          <button className="primary-btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Add season'}
          </button>
        </div>

        {showForm && (
          <form className="form-grid" onSubmit={handleCreate}>
            <label>Season name<input value={form.season_name} onChange={(e) => update('season_name', e.target.value)} required /></label>
            <label>Crop type<input value={form.crop_type} onChange={(e) => update('crop_type', e.target.value)} /></label>
            <label>Variety<input value={form.variety} onChange={(e) => update('variety', e.target.value)} /></label>
            <label>Start date<input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} /></label>
            <label>Expected harvest<input type="date" value={form.expected_harvest_date} onChange={(e) => update('expected_harvest_date', e.target.value)} /></label>
            <label>Status
              <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="active">active</option>
                <option value="completed">completed</option>
                <option value="planned">planned</option>
              </select>
            </label>
            <label className="full-row">Notes<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} /></label>
            <button type="submit" className="primary-btn">Create season</button>
          </form>
        )}

        {seasons.length === 0 ? (
          <p className="muted">No seasons recorded for this plot.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Crop / variety</th>
                <th>Start</th>
                <th>Expected harvest</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.id}>
                  <td>{s.season_name}</td>
                  <td>{[s.crop_type, s.variety].filter(Boolean).join(' / ') || '—'}</td>
                  <td>{s.start_date || '—'}</td>
                  <td>{s.expected_harvest_date || '—'}</td>
                  <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
