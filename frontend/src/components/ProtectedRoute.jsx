import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Where each role belongs when it lands somewhere it isn't allowed.
const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'cashier' ? '/cashier' : '/');

export default function ProtectedRoute({ children, adminOnly = false, roles = null }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  const allowed = roles || (adminOnly ? ['admin'] : null);
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return children;
}
