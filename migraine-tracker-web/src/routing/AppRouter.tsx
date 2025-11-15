import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../features/auth/ProtectedRoute';
import LoginPage from '../features/auth/LoginPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import MigraineListPage from '../features/migraine/MigraineListPage';
import MigraineDetailPage from '../features/migraine/MigraineDetailPage';
import MigraineFormPage from '../features/migraine/MigraineFormPage';
import ProfilePage from '../features/profile/ProfilePage';

// ============================================
// APP ROUTER
// ============================================

/**
 * Application Router Component
 * Defines all routes and their protection levels
 */
export const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/migraines"
        element={
          <ProtectedRoute>
            <MigraineListPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/migraines/new"
        element={
          <ProtectedRoute>
            <MigraineFormPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/migraines/:id"
        element={
          <ProtectedRoute>
            <MigraineDetailPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/migraines/:id/edit"
        element={
          <ProtectedRoute>
            <MigraineFormPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Default Route - Redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;

