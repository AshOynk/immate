import { Link, useLocation } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import Badges from './Badges';
import './Layout.css';

export default function Layout({ children }) {
  const { progressPercent, loading } = useProgress();
  const location = useLocation();
  const onLearnPage = location.pathname.startsWith('/learn') || location.pathname.startsWith('/lesson');

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to="/dashboard" className="header-dashboard">Dashboard</Link>
        </div>
        <Link to="/" className="logo">
          <img src="/images/logo-white.svg" alt="iMmate" className="logo-img" />
        </Link>
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
          <Link to="/compliance/dashboard" className="header-dashboard">Review</Link>
          <Link to="/compliance/request" className="header-dashboard">Request</Link>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
