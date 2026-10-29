import React, { useState } from 'react';
import { Menu, Calendar, User, KeyRound, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function Navbar({ onToggleSidebar, title }) {
  const { user, setUser, isAdmin } = useAuth();
  const todayFormatted = format(new Date(), 'EEEE, dd MMM yyyy');

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const handleOpenProfileModal = () => {
    setProfileForm({
      username: user?.username || '',
      currentPassword: '',
      newPassword: '',
    });
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await apiClient.put('/auth/profile', {
        newUsername: profileForm.username.trim() || undefined,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined,
      });

      const updated = res.data?.data || res.data;
      if (updated?.username) {
        setUser((prev) => ({ ...prev, username: updated.username }));
      }

      toast.success('Admin credentials updated successfully!');
      setIsProfileModalOpen(false);
      setProfileForm({ username: '', currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update credentials');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#0a0f1e]/90 backdrop-blur-md border-b border-navy-700/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 lg:hidden focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {title && (
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              {title}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Date display */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-navy-800/80 px-3 py-1.5 rounded-lg border border-navy-700/60">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* User preview / Profile button */}
          <button
            type="button"
            onClick={handleOpenProfileModal}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-navy-800/60 transition-colors text-left focus:outline-none group"
            title="Click to change admin username / password"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 group-hover:border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-xs transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 leading-tight transition-colors">
                {user?.name || user?.username || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'User'}</p>
            </div>
          </button>
        </div>
      </header>

      {/* ADMIN CREDENTIALS / PROFILE MODAL */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Admin Account Settings"
        subtitle="Change admin username or update login password"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Admin Username"
            required
            value={profileForm.username}
            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
            placeholder="e.g. admin"
          />

          <div className="pt-2 border-t border-navy-700/60">
            <p className="text-xs font-semibold text-slate-400 mb-2">Change Password (Optional)</p>
            <div className="space-y-3">
              <Input
                label="Current Password"
                type="password"
                placeholder="Required only if setting a new password"
                value={profileForm.currentPassword}
                onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="At least 6 characters"
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-700/60">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProfileModalOpen(false)}
              disabled={savingProfile}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingProfile}
              icon={Check}
            >
              Save Credentials
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
