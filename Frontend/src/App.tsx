import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import HomePage from './pages/HomePage';
import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import UserDashboard from './pages/user/Dashboard';
import MonitorList from './pages/user/MonitorList';
import MonitorDetail from './pages/user/MonitorDetail';
import CreateMonitor from './pages/user/CreateMonitor';
import UserProfile from './pages/user/Profile';
import UserSettings from './pages/user/Settings';
import ContributorDashboard from './pages/contributor/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import NotFoundPage from './pages/NotFoundPage';

// Router Guards
import AuthGuard from './components/auth/AuthGuard';
import RoleGuard from './components/auth/RoleGuard';

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  // Check user role from Clerk metadata
  const getUserRole = () => {
    if (!user) return null;
    return user.publicMetadata.role || 'user';
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Redirect unauthenticated users to home page
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && 
          !currentPath.startsWith('/sign-in') && 
          !currentPath.startsWith('/sign-up')) {
        navigate('/');
      }
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
      </Route>

      {/* Auth routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
      </Route>

      {/* Protected user routes */}
      <Route element={<AuthGuard><MainLayout /></AuthGuard>}>
        <Route path="dashboard" element={
          <RoleGuard allowedRoles={['user']} fallback="/contributor/dashboard">
            <UserDashboard />
          </RoleGuard>
        } />
        <Route path="monitors" element={<MonitorList />} />
        <Route path="monitors/:id" element={<MonitorDetail />} />
        <Route path="monitors/create" element={<CreateMonitor />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="settings" element={<UserSettings />} />
      </Route>

      {/* Protected contributor routes */}
      <Route element={<AuthGuard><MainLayout /></AuthGuard>}>
        <Route path="contributor/dashboard" element={
          <RoleGuard allowedRoles={['contributor']} fallback="/dashboard">
            <ContributorDashboard />
          </RoleGuard>
        } />
      </Route>

      {/* Protected admin routes */}
      <Route element={<AuthGuard><MainLayout /></AuthGuard>}>
        <Route path="admin/dashboard" element={
          <RoleGuard allowedRoles={['admin']} fallback="/dashboard">
            <AdminDashboard />
          </RoleGuard>
        } />
        <Route path="admin/users" element={
          <RoleGuard allowedRoles={['admin']} fallback="/dashboard">
            <AdminUsers />
          </RoleGuard>
        } />
      </Route>

      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;