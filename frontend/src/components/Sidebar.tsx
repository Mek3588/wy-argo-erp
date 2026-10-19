import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Receipt,
  Wallet,
  ShieldCheck,
  Layers,
  LucideIcon
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
  description: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { hasRole } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & dairy alerts',
    },
    {
      id: 'inventory',
      label: 'Dairy Inventory',
      icon: Package,
      description: 'Products & fresh batches',
    },
    {
      id: 'sales',
      label: 'Sales Counter / POS',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER', 'SALES_CASHIER', 'FINANCE'],
      description: 'Cashier & customer billing',
    },
    {
      id: 'customers',
      label: 'Customers & Credit',
      icon: Users,
      roles: ['ADMIN', 'MANAGER', 'SALES_CASHIER', 'FINANCE'],
      description: 'Receivables & loan accounts',
    },
    {
      id: 'expenses',
      label: 'Expense Tracker',
      icon: Receipt,
      roles: ['ADMIN', 'MANAGER', 'INVENTORY_CLERK', 'FINANCE'],
      description: 'Milk sourcing, feed & power',
    },
    {
      id: 'cashflow',
      label: 'Cash Flow & Ledger',
      icon: Wallet,
      roles: ['ADMIN', 'MANAGER', 'FINANCE'],
      description: 'Inflow, outflow & net cash',
    },
    {
      id: 'users',
      label: 'Roles & Staff Access',
      icon: ShieldCheck,
      roles: ['ADMIN', 'MANAGER'],
      description: 'Permissions & staff users',
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.some((r: any) => hasRole(r))
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Operations
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <div className="truncate">
                <div className="leading-tight">{item.label}</div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    isActive ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cold Chain System Live
          </div>
          <p className="text-slate-500 mt-1 leading-relaxed">
            Perishable FEFO dairy batch dispatch and automated cash entries enabled.
          </p>
        </div>
      </div>
    </aside>
  );
};
