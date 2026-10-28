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
  Server,
  Lock,
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
  group: 'Operations' | 'Finance & Ledger' | 'Administration';
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { hasRole } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Control Dashboard',
      icon: LayoutDashboard,
      description: 'Operations & freshness',
      group: 'Operations',
    },
    {
      id: 'inventory',
      label: 'Dairy Inventory',
      icon: Package,
      description: 'Stock & batch tracking',
      group: 'Operations',
    },
    {
      id: 'sales',
      label: 'POS Sales Counter',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER', 'SALES_CASHIER', 'FINANCE'],
      description: 'Fast billing terminal',
      group: 'Operations',
      badge: 'LIVE',
    },
    {
      id: 'customers',
      label: 'Customers & Credit',
      icon: Users,
      roles: ['ADMIN', 'MANAGER', 'SALES_CASHIER', 'FINANCE'],
      description: 'Accounts receivable ledger',
      group: 'Finance & Ledger',
    },
    {
      id: 'expenses',
      label: 'Operating Expenses',
      icon: Receipt,
      roles: ['ADMIN', 'MANAGER', 'INVENTORY_CLERK', 'FINANCE'],
      description: 'Milk procurement & utilities',
      group: 'Finance & Ledger',
    },
    {
      id: 'cashflow',
      label: 'Cash Flow & Ledger',
      icon: Wallet,
      roles: ['ADMIN', 'MANAGER', 'FINANCE'],
      description: 'Inflow, outflow & net balance',
      group: 'Finance & Ledger',
    },
    {
      id: 'users',
      label: 'Staff Access & Roles',
      icon: ShieldCheck,
      roles: ['ADMIN', 'MANAGER'],
      description: 'User security & privileges',
      group: 'Administration',
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.some((r: any) => hasRole(r))
  );

  const groups: Array<'Operations' | 'Finance & Ledger' | 'Administration'> = [
    'Operations',
    'Finance & Ledger',
    'Administration',
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-3.75rem)] select-none">
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {groups.map((group) => {
          const groupItems = visibleItems.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;

          return (
            <div key={group} className="space-y-1">
              <div className="px-3 pb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  {group}
                </span>
                <span className="text-[9px] font-mono text-slate-600 bg-slate-900 px-1.5 py-0.2 rounded">
                  {groupItems.length}
                </span>
              </div>

              {groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 bg-gradient-to-r from-blue-600/20 to-transparent shadow-xs'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-l-3 border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-slate-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate leading-tight font-medium text-slate-200">{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Enterprise System Telemetry Badge */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/80">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 text-[11px] font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Bani Plant Node
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">READY</span>
          </div>
          <div className="text-slate-500 text-[10px] leading-tight flex items-center justify-between">
            <span>Database Engine:</span>
            <span className="text-slate-400">SQLite WAL</span>
          </div>
          <div className="text-slate-500 text-[10px] leading-tight flex items-center justify-between">
            <span>TLS Encryption:</span>
            <span className="text-slate-400 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5 text-blue-400 inline" /> HTTPS
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
