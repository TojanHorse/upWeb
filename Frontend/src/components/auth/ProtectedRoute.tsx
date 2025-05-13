import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    // Redirect based on their actual role
    if (user.role === 'user') {
      return <Navigate to="/user" replace />;
    } else if (user.role === 'contributor') {
      return <Navigate to="/contributor" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
  }

  if (user && !user.isVerified && location.pathname !== '/verify-email') {
    // Redirect to verification page if not verified
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;