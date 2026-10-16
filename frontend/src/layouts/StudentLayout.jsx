import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import StudentSidebar from '../components/layout/StudentSidebar';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';

export default function StudentLayout() {
  const { user, loading, isAuthenticated, isStudent } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" color="text-cyan-400" />
        <p className="text-sm text-slate-400 font-medium">Loading student portal...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isStudent) {
    // If admin is logged in, redirect to admin dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col flex-1">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title="Student Financial Portal"
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
