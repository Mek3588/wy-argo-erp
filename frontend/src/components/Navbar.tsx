import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Milk, LogOut, Shield, Activity, Clock } from 'lucide-react';
import { Role } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) + ' • ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const roleBadges: Record<Role, { label: string; color: string; border: string }> = {
    ADMIN: { label: 'Administrator', color: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
    MANAGER: { label: 'Dairy Manager', color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
    FINANCE: { label: 'Finance Officer', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    SALES_CASHIER: { label: 'Sales & POS Cashier', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
    INVENTORY_CLERK: { label: 'Inventory Clerk', color: 'bg-sky-50 text-sky-700', border: 'border-sky-200' },
  };

  const userRoleInfo = user ? roleBadges[user.role] : null;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Brand & Industrial Unit */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-inner font-black">
            <Milk className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-tight text-white uppercase leading-none font-sans">
                Bani Milk <span className="text-blue-400">Industries</span>
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                ERP v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-1">
              Dairy Processing, Inventory & Accounts Management
            </p>
          </div>
        </div>

        {/* Center: System Telemetry */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold">Node 1 Online</span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400 font-mono">SQLite WAL</span>
          </div>

          {currentTime && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTime} EAT</span>
            </div>
          )}
        </div>

        {/* Right: Authenticated User Controls */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-800/70 border border-slate-700/80 px-2.5 py-1 rounded-lg">
              <div className="w-7 h-7 rounded-md bg-blue-700 text-white font-bold text-xs flex items-center justify-center font-mono">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-100 leading-tight">{user.full_name}</div>
                <div className="text-[10px] text-blue-400 font-mono font-semibold uppercase">
                  {userRoleInfo?.label || user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out of Session"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

