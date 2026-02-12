import { Link, useLocation } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import Badges from './Badges';
import './Layout.css';

export default function Layout({ children }) {
  const { progressPercent, loading } = useProgress();
  const { user, logout } = useAuth();
  const location = useLocation();
  const onLearnPage = location.pathname.startsWith('/learn') || location.pathname.startsWith('/lesson');

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">
          <img src="/images/logo-white.svg" alt="iMmate" className="logo-img" />
        </Link>
        <Link to="/dashboard" className="header-dashboard">Dashboard</Link>
        <div className="header-right">
          {onLearnPage && !loading && (
            <div className="progress-bar-wrap">
              <div className="progress-label">
                <span>Your progress</span>
                <span className="progress-value">{progressPercent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}
          {onLearnPage && <Badges />}
          {user ? (
            <div className="header-auth">
              <span className="header-user">{user.name || user.username}{user.role === 'admin' ? ' (Admin)' : ''}</span>
              {user.role === 'admin' && <Link to="/compliance/dashboard" className="header-dashboard">Review</Link>}
              <button type="button" className="header-logout" onClick={logout}>Log out</button>
            </div>
          ) : (
            <Link to="/login" className="header-login">Log in</Link>
          )}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
