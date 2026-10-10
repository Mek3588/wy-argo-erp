import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Milk, LogOut } from 'lucide-react';
import { Role } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-300',
    MANAGER: 'bg-purple-100 text-purple-800 border-purple-300',
    SALES_CASHIER: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    INVENTORY_CLERK: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const roleLabels: Record<Role, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Dairy Manager',
    SALES_CASHIER: 'Sales & Cashier',
    INVENTORY_CLERK: 'Inventory Clerk',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Milk className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
              WY Argo <span className="text-blue-600">Dairy ERP</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Inventory, Sales & Cash Flow Management</p>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="flex items-center gap-4">
            {/* Current User Pill */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user.full_name}</p>
                <span
                  className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold border mt-0.5 ${
                    roleColors[user.role]
                  }`}
                >
                  {roleLabels[user.role]}
                </span>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

