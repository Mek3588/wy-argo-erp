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
    <div className="space-y-5">
      {/* 1. Industrial Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider">
              TREASURY & GENERAL CASH LEDGER
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-purple-600 font-semibold">Multi-Channel Liquidity</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Cash Flow, Treasury & Liquidity Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Real-time liquid balance reconciliation across Physical Cash Drawer, Telebirr Merchant, and CBE Bank accounts.
          </p>
        </div>

        {canAdjust && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Treasury Adjustment</span>
          </button>
        )}
      </div>

      {/* 2. Structured KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Inflow */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-emerald-500 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
              Total Cash Inflow
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums mt-1">
            +{totalIn.toLocaleString()} <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">From POS sales, credit collections & deposits</p>
        </div>

        {/* Total Outflow */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-rose-500 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
              Total Cash Outflow
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono tabular-nums mt-1">
            -{totalOut.toLocaleString()} <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">Milk sourcing, electricity, diesel & wages</p>
        </div>

        {/* Net Liquidity */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-t-3 border-t-indigo-600 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
              Net Treasury Balance
            </span>
            <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tabular-nums mt-1 ${
              netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {netBalance.toLocaleString()} <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">Net operational cash available across all accounts</p>
        </div>
      </div>

      {/* 3. Account Balances by Payment Channel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <h3 className="font-bold text-slate-800 text-xs uppercase font-mono tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Payment Channel Liquidity Distribution</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(['CASH', 'TELEBIRR', 'EBIRR', 'BANK_TRANSFER'] as PaymentMethod[]).map((chan) => {
            const item = summary?.by_method.find((m) => m.payment_method === chan) || {
              payment_method: chan,
              in_amount: 0,
              out_amount: 0,
              balance: 0,
            };
            const isBank = chan === 'BANK_TRANSFER';
            const isTele = chan === 'TELEBIRR';
            const isEbirr = chan === 'EBIRR';
            const chanLabel = isBank ? 'CBE Bank' : isTele ? 'Telebirr' : isEbirr ? 'E-Birr' : 'Cash in Hand';

            return (
              <div
                key={chan}
                className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800 flex items-center gap-1.5">
                      {isBank ? (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      ) : isTele ? (
                        <Smartphone className="w-4 h-4 text-sky-600" />
                      ) : isEbirr ? (
                        <Smartphone className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Banknote className="w-4 h-4 text-emerald-600" />
                      )}
                      {chanLabel}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      {item.balance.toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1 text-xs text-slate-500 font-mono">
                    <div className="flex justify-between text-[11px]">
                      <span>Inflow:</span>
                      <span className="text-emerald-700 font-bold tabular-nums">
                        +{item.in_amount.toLocaleString()} ETB
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Outflow:</span>
                      <span className="text-rose-700 font-bold tabular-nums">
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

      {/* 4. Complete Cash Flow Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-600" />
            <span>Master Cash Flow Audit Trail</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500 font-semibold">{transactions.length} total reconciled entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5 font-mono">Timestamp</th>
                <th className="py-2.5 px-3.5">Flow Direction</th>
                <th className="py-2.5 px-3.5">Ledger Source</th>
                <th className="py-2.5 px-3.5">Transaction Narrative</th>
                <th className="py-2.5 px-3.5">Channel</th>
                <th className="py-2.5 px-3.5 text-right font-mono">Net Flow (ETB)</th>
                <th className="py-2.5 px-3.5">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">{tx.created_at}</td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        tx.type === 'IN'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {tx.type === 'IN' ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-700" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-rose-700" />
                      )}
                      CASH {tx.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                      {tx.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-900 text-xs">{tx.description}</td>
                  <td className="py-2.5 px-3.5">
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tx.payment_method}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-black text-xs tabular-nums">
                    <span className={tx.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}>
                      {tx.type === 'IN' ? '+' : '-'}
                      {tx.amount.toLocaleString()} ETB
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-[11px] text-slate-500 font-mono">
                    {tx.recorded_by_name || 'System Auto'}
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
                <option value="EBIRR">E-Birr</option>
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

