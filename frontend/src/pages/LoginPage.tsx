import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Milk, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { Role } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('admin@wyargo.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (userType: Role) => {
    const creds: Record<Role, { login: string; pass: string }> = {
      ADMIN: { login: 'admin@wyargo.com', pass: 'admin123' },
      MANAGER: { login: 'manager@wyargo.com', pass: 'manager123' },
      SALES_CASHIER: { login: 'cashier@wyargo.com', pass: 'cashier123' },
      INVENTORY_CLERK: { login: 'inventory@wyargo.com', pass: 'inventory123' },
    };
    const c = creds[userType];
    setIdentifier(c.login);
    setPassword(c.pass);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
        {/* Brand Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Milk className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            WY Argo <span className="text-blue-600">Dairy ERP</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Dairy Management System • Addis Ababa, Ethiopia
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                required
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@wyargo.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:bg-blue-300"
          >
            {submitting ? 'Authenticating...' : 'Sign In to ERP'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
            Quick Test Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('ADMIN')}
              className="p-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-800 font-semibold transition-all text-left"
            >
              <div className="font-bold">🔴 Administrator</div>
              <div className="text-[10px] text-rose-600">admin@wyargo.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('MANAGER')}
              className="p-2 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-800 font-semibold transition-all text-left"
            >
              <div className="font-bold">🟣 Dairy Manager</div>
              <div className="text-[10px] text-purple-600">manager@wyargo.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('SALES_CASHIER')}
              className="p-2 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-800 font-semibold transition-all text-left"
            >
              <div className="font-bold">🟢 Sales Cashier</div>
              <div className="text-[10px] text-emerald-600">cashier@wyargo.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('INVENTORY_CLERK')}
              className="p-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-800 font-semibold transition-all text-left"
            >
              <div className="font-bold">🔵 Inventory Clerk</div>
              <div className="text-[10px] text-blue-600">inventory@wyargo.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
