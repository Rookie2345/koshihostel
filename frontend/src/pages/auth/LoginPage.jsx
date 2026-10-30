import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Building2, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your username');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      const user = await login({ username: username.trim(), password });
      toast.success(`Welcome back, ${user.name || user.username}!`);

      // Determine redirect path
      const role = String(user.role).toUpperCase();
      if (role === 'ADMIN') {
        const from = location.state?.from?.pathname || '/admin/dashboard';
        navigate(from, { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Invalid username or password. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-300">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-[#0f1629]/90 border border-[#1e2d45] p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/30">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#080d1a] border border-cyan-500/30 shadow-xl shadow-cyan-500/20 mb-4 p-1 transform hover:scale-105 transition-transform duration-200">
              <img
                src="/logo.png"
                alt="Koshi Hostel Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Koshi Hostel
            </h1>
            <p className="text-xs text-cyan-400 font-medium mt-1">
              ESTD 2079 • Biratnagar-10, Morang, Nepal
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Sign in to manage hostel accounts and billing
            </p>
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="mb-5">
              <Alert type="error" onDismiss={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="e.g. admin or student ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={User}
              required
              autoFocus
              autoComplete="username"
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                required
                autoComplete="current-password"
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-lg shadow-cyan-500/20 mt-2"
            >
              Sign In
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-5 border-t border-navy-700/60 text-center text-xs text-slate-500">
            Koshi Hostel Billing & Student Management System
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Password Reset Assistance"
        subtitle="Contact administration to reset your account credentials"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            For security reasons, password resets are handled directly by the hostel administration office.
          </p>

          <div className="rounded-xl bg-navy-900/80 border border-navy-700/60 p-4 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Hostel Admin Office, Block A, Biratnagar-10</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>+977 21-XXXXXX / +977 98XXXXXXXX</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>support@koshihostel.edu.np</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setForgotModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
