import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingScreen from './components/ui/LoadingScreen';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';

// Public pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const VerifyEmailLinkPage = lazy(() => import('./pages/auth/VerifyEmailLinkPage'));

// User pages
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const MonitorsPage = lazy(() => import('./pages/user/MonitorsPage'));
const CheckHistoryPage = lazy(() => import('./pages/user/CheckHistoryPage'));
const UserWalletPage = lazy(() => import('./pages/user/UserWalletPage'));
const UserProfilePage = lazy(() => import('./pages/user/UserProfilePage'));

// Contributor pages
const ContributorDashboard = lazy(() => import('./pages/contributor/ContributorDashboard'));
const WebsitesPage = lazy(() => import('./pages/contributor/WebsitesPage'));
const CreateMonitorPage = lazy(() => import('./pages/contributor/CreateMonitorPage'));
const ContributorWalletPage = lazy(() => import('./pages/contributor/ContributorWalletPage'));
const ContributorProfilePage = lazy(() => import('./pages/contributor/ContributorProfilePage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsersPage = lazy(() => import('./pages/admin/ManageUsersPage'));
const ManageWebsitesPage = lazy(() => import('./pages/admin/ManageWebsitesPage'));
const MonitorStatusPage = lazy(() => import('./pages/admin/MonitorStatusPage'));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage'));

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/contributor/verify" element={<VerifyEmailLinkPage />} />

          {/* User routes */}
          <Route 
            path="/user" 
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <DashboardLayout userType="user" />
              </ProtectedRoute>
            }
          >
            <Route index element={<UserDashboard />} />
            <Route path="monitors" element={<MonitorsPage />} />
            <Route path="history" element={<CheckHistoryPage />} />
            <Route path="wallet" element={<UserWalletPage />} />
            <Route path="profile" element={<UserProfilePage />} />
          </Route>

          {/* Contributor routes */}
          <Route 
            path="/contributor" 
            element={
              <ProtectedRoute allowedRoles={['contributor']}>
                <DashboardLayout userType="contributor" />
              </ProtectedRoute>
            }
          >
            <Route index element={<ContributorDashboard />} />
            <Route path="websites" element={<WebsitesPage />} />
            <Route path="create-monitor" element={<CreateMonitorPage />} />
            <Route path="wallet" element={<ContributorWalletPage />} />
            <Route path="profile" element={<ContributorProfilePage />} />
          </Route>

          {/* Admin routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout userType="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsersPage />} />
            <Route path="websites" element={<ManageWebsitesPage />} />
            <Route path="monitors" element={<MonitorStatusPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;