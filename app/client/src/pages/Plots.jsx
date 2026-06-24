import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';

const emptyForm = {
  name: '',
  location: '',
  size_hectares: '',
  crop_type: '',
  status: 'active',
  notes: '',
};

export default function Plots() {
  const [plots, setPlots] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function load(searchTerm = '') {
    const q = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    apiFetch(`/api/plots${q}`)
      .then((data) => setPlots(data.plots))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    setError(null);
    load(search);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/plots', { method: 'POST', body: JSON.stringify(form) });
      setForm(emptyForm);
      setShowForm(false);
      load(search);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-head">
        <h1>Plots</h1>
        <button className="primary-btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add plot'}
        </button>
      </header>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by name, location, or crop…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="secondary-btn">Search</button>
        {search && (
          <button
            type="button"
            className="link-btn"
            onClick={() => { setSearch(''); load(''); }}
          >
            Clear
          </button>
        )}
      </form>

      {error && <div className="form-error">{error}</div>}

      {showForm && (
        <form className="panel form-grid" onSubmit={handleCreate}>
          <label>Name<input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label>Location<input value={form.location} onChange={(e) => update('location', e.target.value)} /></label>
          <label>Size (ha)<input type="number" step="0.01" value={form.size_hectares} onChange={(e) => update('size_hectares', e.target.value)} /></label>
          <label>Crop type<input value={form.crop_type} onChange={(e) => update('crop_type', e.target.value)} /></label>
          <label>Status
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="active">active</option>
              <option value="fallow">fallow</option>
              <option value="retired">retired</option>
            </select>
          </label>
          <label className="full-row">Notes<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} /></label>
          <button type="submit" className="primary-btn">Create plot</button>
        </form>
      )}

      {plots.length === 0 ? (
        <p className="muted">No plots match.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Size (ha)</th>
              <th>Crop</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/plots/${p.id}`}>{p.name}</Link></td>
                <td>{p.location || '—'}</td>
                <td>{p.size_hectares ?? '—'}</td>
                <td>{p.crop_type || '—'}</td>
                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
