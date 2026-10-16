import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Spinner from './components/ui/Spinner';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import StudentList from './pages/admin/StudentList';
import StudentForm from './pages/admin/StudentForm';
import StudentDetail from './pages/admin/StudentDetail';
import FeeGroups from './pages/admin/FeeGroups';
import Billing from './pages/admin/Billing';
import Payments from './pages/admin/Payments';
import FormerStudents from './pages/admin/FormerStudents';
import Reports from './pages/admin/Reports';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';

/**
 * ProtectedRoute Guard
 * Verifies authentication status and validates role permissions.
 */
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" color="text-cyan-400" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">
          Verifying security clearance...
        </p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check required role
  if (requiredRole) {
    const currentRole = (user.role || '').toUpperCase();
    const targetRole = requiredRole.toUpperCase();

    if (currentRole !== targetRole) {
      if (currentRole === 'ADMIN') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      if (currentRole === 'STUDENT') {
        return <Navigate to="/student/dashboard" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Portal Routes (Protected, ADMIN only) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<StudentList />} />
        <Route path="students/new" element={<StudentForm />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="fee-groups" element={<FeeGroups />} />
        <Route path="billing" element={<Billing />} />
        <Route path="payments" element={<Payments />} />
        <Route path="former-students" element={<FormerStudents />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Student Portal Routes (Protected, STUDENT only) */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="STUDENT">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
