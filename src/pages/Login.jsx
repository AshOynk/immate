import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [residentId, setResidentId] = useState('');
  const [role, setRole] = useState('resident');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = searchParams.get('from') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'register' ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;
      const body = mode === 'register'
        ? { username: username.trim(), password, role, name: name.trim() || undefined, residentId: residentId.trim() || undefined }
        : { username: username.trim(), password };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      const message = data.error || (res.status === 0 || !res.ok ? 'Cannot reach server. Check your connection and that the API URL is set (VITE_API_URL on Vercel).' : (mode === 'register' ? 'Registration failed' : 'Login failed'));
      if (!res.ok) throw new Error(message);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Something went wrong';
      setError(err.name === 'TypeError' && msg.includes('fetch') ? 'Cannot reach server. Is the backend running? Set VITE_API_URL in production.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/images/logo-white.svg" alt="iMmate" className="login-logo" />
        </div>
        <p className="login-subtitle">{mode === 'login' ? 'Sign in' : 'Create account'}</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email or username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ash@oynk.co.uk"
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={mode === 'register' ? 6 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {mode === 'register' && (
            <>
              <label>
                Display name (optional)
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </label>
              <label>
                Resident ID (optional, for residents)
                <input type="text" value={residentId} onChange={(e) => setResidentId(e.target.value)} placeholder="e.g. RES-001" />
              </label>
              <label className="login-role">
                <span>Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="resident">Resident</option>
                  <option value="admin">Admin (management)</option>
                </select>
              </label>
            </>
          )}
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="login-switch">
          {mode === 'login' ? (
            <>No account? <button type="button" className="link-button" onClick={() => setMode('register')}>Register</button></>
          ) : (
            <>Already have an account? <button type="button" className="link-button" onClick={() => setMode('login')}>Sign in</button></>
          )}
        </p>
        <p className="login-back">
          <Link to="/">← Back to app</Link>
        </p>
      </div>
    </div>
  );
}
