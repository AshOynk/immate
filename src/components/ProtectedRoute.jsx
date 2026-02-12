import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="auth-loading">Checking login…</p>;
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  if (requireAdmin && user.role !== 'admin') return <p className="auth-error">Admin access required. <Link to="/">Go to dashboard</Link>.</p>;
  return children;
}
