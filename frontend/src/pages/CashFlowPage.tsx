import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CashSummary, CashTransaction, PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Smartphone,
  Building2,
  Banknote,
  PieChart,
} from 'lucide-react';

export const CashFlowPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canAdjust = hasRole('ADMIN', 'MANAGER');

  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    type: 'IN' as 'IN' | 'OUT',
    source: 'CAPITAL',
    amount: '',
    payment_method: 'CASH' as PaymentMethod,
    description: '',
  });

  const loadCashFlow = async () => {
    try {
      setLoading(true);
      const [sumRes, txRes] = await Promise.all([
        api.getCashFlowSummary(),
        api.getCashTransactions(),
      ]);
      setSummary(sumRes);
      setTransactions(txRes.transactions);
    } catch (err: any) {
      alert(`Error loading cash flow: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashFlow();
  }, []);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCashTransaction({
        ...form,
        amount: Number(form.amount),
      });
      setIsModalOpen(false);
      setForm({
        type: 'IN',
        source: 'CAPITAL',
        amount: '',
        payment_method: 'CASH',
        description: '',
      });
      loadCashFlow();
    } catch (err: any) {
      alert(`Failed to record cash transaction: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const netBalance = summary?.summary.net_balance ?? 0;
  const totalIn = summary?.summary.total_in ?? 0;
  const totalOut = summary?.summary.total_out ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cash Flow Management</h2>
          <p className="text-sm text-slate-500">
            Real-time liquidity tracking across Cash, Telebirr, and CBE Bank accounts.
          </p>
        </div>

        {canAdjust && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Cash In / Out Adjustment
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Inflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cash Inflow</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            +{totalIn.toLocaleString()} ETB
          </div>
          <p className="text-xs text-slate-400 mt-1">From dairy sales & capital deposits</p>
        </div>

        {/* Total Outflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cash Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            -{totalOut.toLocaleString()} ETB
          </div>
          <p className="text-xs text-slate-400 mt-1">Milk sourcing, electricity & logistics</p>
        </div>

        {/* Net Liquidity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Balance</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {netBalance.toLocaleString()} ETB
          </div>
          <p className="text-xs text-slate-400 mt-1">Net available working capital</p>
        </div>
      </div>

      {/* Account Balances by Payment Channel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Liquid Balance Breakdown by Channel
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary?.by_method.map((item) => {
            const isBank = item.payment_method === 'BANK_TRANSFER';
            const isTele = item.payment_method === 'TELEBIRR';

            return (
              <div
                key={item.payment_method}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      {isBank ? (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      ) : isTele ? (
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Banknote className="w-4 h-4 text-amber-600" />
                      )}
                      {item.payment_method.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {item.balance.toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Inflow:</span>
                      <span className="text-emerald-600 font-semibold">
                        +{item.in_amount.toLocaleString()} ETB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outflow:</span>
                      <span className="text-rose-600 font-semibold">
                        -{item.out_amount.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cash Flow Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-600" />
            Complete Cash Flow Ledger
          </h3>
          <span className="text-xs text-slate-400">{transactions.length} total entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Amount (ETB)</th>
                <th className="py-3 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-xs text-slate-500">{tx.created_at}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        tx.type === 'IN'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {tx.type === 'IN' ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      CASH {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                      {tx.source}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{tx.description}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-mono text-slate-600 uppercase">
                      {tx.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-base">
                    <span className={tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>
                      {tx.type === 'IN' ? '+' : '-'}
                      {tx.amount.toLocaleString()} ETB
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 font-medium">
                    {tx.recorded_by_name || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MANUAL ADJUSTMENT */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Manual Cash Flow Entry"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Flow Direction</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'IN' | 'OUT' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="IN">Cash In (Inflow / Deposit)</option>
                <option value="OUT">Cash Out (Outflow / Withdrawal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Category</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="CAPITAL">Owner Capital / Cash Float</option>
                <option value="MANUAL_DEPOSIT">Manual Deposit</option>
                <option value="MANUAL_WITHDRAWAL">Owner Drawings / Withdrawal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (ETB)</label>
              <input
                required
                type="number"
                min="1"
                step="0.5"
                placeholder="10000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="CASH">Cash in Hand</option>
                <option value="TELEBIRR">Telebirr</option>
                <option value="BANK_TRANSFER">Bank (CBE)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Description</label>
            <input
              required
              type="text"
              placeholder="e.g. Additional morning till float"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-xs"
            >
              Save Cash Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
