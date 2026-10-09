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
  PlusCircle,
  Receipt,
  ShoppingCart,
  CheckCircle2,
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl">
        Failed to load dashboard data: {error}
      </div>
    );
  }

  const { salesToday, salesThisMonth, expensesThisMonth, cashTotals, inventory } = stats;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
            Dairy Operations Dashboard
          </span>
          <h2 className="text-2xl font-bold mt-2">Welcome back, {user?.full_name}!</h2>
          <p className="text-blue-100 text-sm mt-1">
            Real-time dairy inventory freshness, cashier sales, and cash flow balance.
          </p>
        </div>

        {/* Quick Shortcuts */}
        <div className="flex flex-wrap gap-2.5">
          {['ADMIN', 'MANAGER', 'SALES_CASHIER'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setActiveTab('sales');
                if (openNewSale) openNewSale();
              }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-900/30"
            >
              <ShoppingCart className="w-4 h-4" />
              New Sale
            </button>
          )}

          {['ADMIN', 'MANAGER', 'INVENTORY_CLERK'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setActiveTab('inventory');
                if (openNewBatch) openNewBatch();
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
              <Package className="w-4 h-4" />
              Stock-In Batch
            </button>
          )}

          {['ADMIN', 'MANAGER', 'INVENTORY_CLERK'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setActiveTab('expenses');
                if (openNewExpense) openNewExpense();
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
              <Receipt className="w-4 h-4" />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">
              {salesToday.total.toLocaleString()} ETB
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="font-semibold text-emerald-600">{salesToday.count}</span> orders settled today
          </div>
        </div>

        {/* This Month's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">
              {salesThisMonth.total.toLocaleString()} ETB
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="font-semibold text-blue-600">{salesThisMonth.count}</span> sales this month
          </div>
        </div>

        {/* This Month's Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">
              {expensesThisMonth.total.toLocaleString()} ETB
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="font-semibold text-rose-600">{expensesThisMonth.count}</span> payments (milk/feed/power)
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Position</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-bold ${
                cashTotals.net_cash >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {cashTotals.net_cash.toLocaleString()} ETB
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            In: <span className="text-emerald-600 font-semibold">{cashTotals.total_in.toLocaleString()}</span> | Out:{' '}
            <span className="text-rose-600 font-semibold">{cashTotals.total_out.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dairy Alerts Section: Expiring Batches & Low Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expiring Soon Alert */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
              <Clock className="w-5 h-5 text-amber-600" />
              Perishable Dairy Batches (Expiring ≤ 3 Days)
            </div>
            <span className="bg-amber-200 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {inventory.expiringBatchesCount} Batches
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {inventory.expiringBatches.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All active dairy batches are within safe freshness dates!
              </div>
            ) : (
              inventory.expiringBatches.map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{b.product_name}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-500">[{b.batch_number}]</span>
                    <p className="text-slate-500 mt-0.5">
                      Remaining: <span className="font-semibold text-slate-800">{b.current_quantity} {b.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold px-2 py-1 rounded-md text-[11px] ${
                        b.days_left !== undefined && b.days_left <= 1
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {b.days_left !== undefined && b.days_left <= 0
                        ? 'Expires Today!'
                        : `${b.days_left} days left`}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Exp: {b.expiry_date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Low Stock Products (Below Reorder Point)
            </div>
            <span className="bg-rose-200 text-rose-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {inventory.lowStockProductsCount} Products
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {inventory.lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All dairy products meet minimum inventory levels.
              </div>
            ) : (
              inventory.lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-3 rounded-xl border border-rose-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-slate-500">[{p.sku}]</span>
                    <p className="text-slate-500 mt-0.5">
                      Min threshold:{' '}
                      <span className="font-semibold text-slate-700">
                        {p.min_stock_level} {p.unit}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded-md text-[11px]">
                      Stock: {p.current_stock ?? 0} {p.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              Recent Sales Receipts
            </h3>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Receipt</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats.recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-600">{s.sale_code}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{s.customer_name}</div>
                      <div className="text-[10px] text-slate-400">By: {s.cashier_name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {s.total_amount.toLocaleString()} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-600" />
              Recent Operating Expenses
            </h3>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats.recentExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono font-semibold text-rose-600">{e.expense_code}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{e.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {e.category.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{e.vendor_name || 'N/A'}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      -{e.amount.toLocaleString()} ETB
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

