import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';

export default function AdminLayout() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" color="text-cyan-400" />
        <p className="text-sm text-slate-400 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  // Auth & Admin role guard
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // If logged in as student, redirect to student dashboard
    return <Navigate to="/student/dashboard" replace />;
  }

  // Derive current page title for Navbar
  const getPageTitle = (pathname) => {
    if (pathname.includes('/admin/dashboard')) return 'System Dashboard';
    if (pathname.includes('/admin/students/new')) return 'Register New Student';
    if (pathname.includes('/admin/students/')) return 'Student Profile & Ledger';
    if (pathname.includes('/admin/students')) return 'Students Management';
    if (pathname.includes('/admin/fee-groups')) return 'Fee Groups & Packages';
    if (pathname.includes('/admin/billing')) return 'Monthly Billing Generation';
    if (pathname.includes('/admin/payments')) return 'Payments & Collections';
    if (pathname.includes('/admin/former-students')) return 'Former Students & Unsettled Dues';
    if (pathname.includes('/admin/reports')) return 'Reports & Financial Statements';
    return 'Koshi Hostel Admin';
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col flex-1">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={getPageTitle(location.pathname)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
