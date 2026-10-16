import React from 'react';
import { Menu, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar({ onToggleSidebar, title }) {
  const { user } = useAuth();
  const todayFormatted = format(new Date(), 'EEEE, dd MMM yyyy');

  return (
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

        {/* User preview */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight">
              {user?.name || user?.username || 'Admin'}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'User'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
