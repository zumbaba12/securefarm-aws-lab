import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { apiFetch } from '../api.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    // Demo credentials are only returned by the API in development mode.
    apiFetch('/api/demo-credentials')
      .then((data) => data.available && setDemo(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand login-brand">
          <span className="brand-mark">◧</span> SecureFarm
        </div>
        <p className="login-sub">Sign in to the operations dashboard.</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="primary-btn">Sign in</button>

        {demo && (
          <div className="demo-hint">
            <strong>Demo (dev only):</strong>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
              }}
            >
              {demo.email} / {demo.password}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
