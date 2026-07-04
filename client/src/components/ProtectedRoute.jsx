import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gates a route by authentication and (optionally) role. Unauthenticated
 * users go to login; a user with the wrong role goes to their own home.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loader">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'HR' ? '/hr' : '/jobs'} replace />;
  }
  return children;
}
