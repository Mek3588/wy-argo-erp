import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Clock,
  Package,
  Receipt,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
  openNewSale?: () => void;
  openNewBatch?: () => void;
  openNewExpense?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  setActiveTab,
  openNewSale,
  openNewBatch,
  openNewExpense,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const data = await api.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
          Initializing Bani Enterprise Cockpit...
        </span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>Failed to load enterprise operational telemetry</span>
        </div>
        <p className="text-xs text-rose-600 mt-1 font-mono">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { salesToday, salesThisMonth, expensesThisMonth, cashTotals, inventory } = stats;

  return (
    <div className="space-y-5">
      {/* 1. Industrial Command Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider">
              BANI MILK • ADAMA PLANT #1
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-blue-600 font-semibold">Active Operational Cycle</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5 font-sans">
            Operations & Financial Control Cockpit
          </h2>
          <p className="text-xs text-slate-500">
            Real-time cold-chain stock levels, POS cashier settlement, and cash flow balance.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
            <span>Sync</span>
          </button>

          {['ADMIN', 'MANAGER', 'SALES_CASHIER'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setActiveTab('sales');
                if (openNewSale) openNewSale();
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Sales Terminal</span>
              <kbd className="hidden sm:inline text-[10px] font-mono bg-emerald-700 px-1 py-0.5 rounded text-emerald-100">F2</kbd>
            </button>
          )}

          {['ADMIN', 'MANAGER', 'INVENTORY_CLERK'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setActiveTab('inventory');
                if (openNewBatch) openNewBatch();
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stock-In Intake</span>
              <kbd className="hidden sm:inline text-[10px] font-mono bg-blue-700 px-1 py-0.5 rounded text-blue-100">F3</kbd>
            </button>
          )}

          {['ADMIN', 'MANAGER', 'INVENTORY_CLERK', 'FINANCE'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setActiveTab('expenses');
                if (openNewExpense) openNewExpense();
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Disburse Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Structured Enterprise KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Today's Settled Sales */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-emerald-500 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                Today's Settled Sales
              </span>
              <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                {salesToday.total.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">ETB</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Volume: <b className="text-slate-800">{salesToday.count}</b> receipts</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-[10px]">Settled</span>
          </div>
        </div>

        {/* Month-To-Date Revenue */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-blue-600 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                Monthly Gross Revenue
              </span>
              <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                {salesThisMonth.total.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">ETB</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Orders: <b className="text-slate-800">{salesThisMonth.count}</b> closed</span>
            <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold text-[10px]">MTD Gross</span>
          </div>
        </div>

        {/* Monthly Operating Expenses */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-rose-500 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                Operating Outflow (MTD)
              </span>
              <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                {expensesThisMonth.total.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">ETB</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Entries: <b className="text-slate-800">{expensesThisMonth.count}</b> paid</span>
            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-semibold text-[10px]">Procurement/Ops</span>
          </div>
        </div>

        {/* Net Cash Flow Balance */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-indigo-600 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                Net Operating Cash Balance
              </span>
              <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span
                className={`text-2xl font-black font-mono tabular-nums tracking-tight ${
                  cashTotals.net_cash >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {cashTotals.net_cash.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">ETB</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-600 font-semibold">+{cashTotals.total_in.toLocaleString()}</span>
            <span className="text-slate-300">/</span>
            <span className="text-rose-600 font-semibold">-{cashTotals.total_out.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 3. Dairy Inventory Stock Alerts (Data Grid) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
              Perishable Inventory & Reorder Monitoring ({inventory.lowStockProductsCount} Attention Required)
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('inventory')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono uppercase"
          >
            <span>Full Inventory Grid</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {inventory.lowStockProducts.length === 0 ? (
          <div className="p-4 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">All dairy stock units exceed minimum reorder safety thresholds. Stock on hand is nominal.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-4 font-mono">SKU Code</th>
                  <th className="py-2 px-4">Product Name</th>
                  <th className="py-2 px-4">Category</th>
                  <th className="py-2 px-4 text-right">Physical Stock</th>
                  <th className="py-2 px-4 text-right">Min Threshold</th>
                  <th className="py-2 px-4 text-center">Status</th>
                  <th className="py-2 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.lowStockProducts.map((p) => {
                  const stock = p.current_stock ?? 0;
                  const isZero = stock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">{p.sku}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-medium">{p.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {stock} {p.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                        {p.min_stock_level} {p.unit}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Stockout
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Below Reorder
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => setActiveTab('inventory')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Real-time Ledgers Split (Sales & Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Settled Sales */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recent Sales Settlements</span>
            </h3>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 font-mono uppercase"
            >
              All Sales →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/60 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3.5 font-mono">Receipt #</th>
                  <th className="py-2 px-3.5">Customer / Cashier</th>
                  <th className="py-2 px-3.5">Channel</th>
                  <th className="py-2 px-3.5 text-right font-mono">Total ETB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700">{s.sale_code}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900 leading-tight">{s.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">By: {s.cashier_name}</div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                      {s.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Operating Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
              <span>Recent Operating Disbursements</span>
            </h3>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 font-mono uppercase"
            >
              All Expenses →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/60 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3.5 font-mono">Voucher #</th>
                  <th className="py-2 px-3.5">Category / Purpose</th>
                  <th className="py-2 px-3.5">Payee / Vendor</th>
                  <th className="py-2 px-3.5 text-right font-mono">Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-rose-600">{e.expense_code}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900 leading-tight">{e.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {e.category.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 text-xs">{e.vendor_name || 'N/A'}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600">
                      -{e.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

