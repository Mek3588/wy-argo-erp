import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Receipt,
  Plus,
  Trash2,
  Filter,
  DollarSign,
  Building,
  FileText,
  Calendar,
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canDelete = hasRole('ADMIN', 'MANAGER');
  const canAdd = hasRole('ADMIN', 'MANAGER', 'INVENTORY_CLERK');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const categoryLabels: Record<ExpenseCategory, string> = {
    RAW_MILK_PROCUREMENT: 'Raw Milk Procurement',
    FEED_FODDER: 'Cattle Feed & Fodder',
    PACKAGING_MATERIALS: 'Packaging (Bottles & Pouches)',
    COLD_CHAIN_ELECTRICITY: 'Cold Chain / Power / Diesel',
    TRANSPORT_LOGISTICS: 'Transport & Delivery Logistics',
    STAFF_WAGES: 'Staff & Processing Wages',
    EQUIPMENT_MAINTENANCE: 'Equipment & Chiller Maintenance',
    SUPPLIES_OTHER: 'Cleaning CIP & Supplies',
  };

  const [form, setForm] = useState({
    title: '',
    category: 'RAW_MILK_PROCUREMENT' as ExpenseCategory,
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'BANK_TRANSFER' as PaymentMethod,
    vendor_name: '',
    receipt_ref: '',
    notes: '',
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses();
      setExpenses(res.expenses);
    } catch (err: any) {
      alert(`Error loading expenses: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        ...form,
        amount: Number(form.amount),
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        category: 'RAW_MILK_PROCUREMENT',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'BANK_TRANSFER',
        vendor_name: '',
        receipt_ref: '',
        notes: '',
      });
      loadExpenses();
    } catch (err: any) {
      alert(`Failed to record expense: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense? This will also reverse the cash outflow entry in Cash Flow.')) {
      return;
    }
    try {
      await api.deleteExpense(id);
      loadExpenses();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    return selectedCategoryFilter === 'ALL' || e.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dairy Expense Tracker</h2>
          <p className="text-sm text-slate-500">
            Log milk sourcing costs, cattle feed, chiller electricity & operational outflows.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        )}
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Logged Expenses
          </span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            -{totalExpenses.toLocaleString()} ETB
          </div>
          <p className="text-xs text-slate-400 mt-1">{expenses.length} total operational vouchers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Top Outflow Category
          </span>
          <div className="text-lg font-bold text-slate-900 mt-1">Raw Milk Procurement</div>
          <p className="text-xs text-slate-400 mt-1">Direct purchases from milk farmers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Auto Cash Ledger Link
          </span>
          <div className="text-emerald-600 font-bold text-sm mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active & Synced
          </div>
          <p className="text-xs text-slate-400 mt-1">Every recorded expense updates Cash Flow</p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedCategoryFilter === 'ALL'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Categories
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategoryFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategoryFilter === key
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Voucher / Code</th>
                <th className="py-3 px-4">Title & Notes</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4">Date & Method</th>
                <th className="py-3 px-4 text-right">Amount (ETB)</th>
                {canDelete && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-semibold text-rose-600">{e.expense_code}</span>
                    {e.receipt_ref && (
                      <div className="text-[11px] text-slate-400">Ref: {e.receipt_ref}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{e.title}</div>
                    {e.notes && <div className="text-xs text-slate-500 mt-0.5">{e.notes}</div>}
                    <div className="text-[10px] text-slate-400">By: {e.recorded_by_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                      {categoryLabels[e.category] || e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{e.vendor_name || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-slate-600">{e.expense_date}</div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {e.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600 text-base">
                    -{e.amount.toLocaleString()} ETB
                  </td>
                  {canDelete && (
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Voucher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Dairy Operating Expense"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Title / Description</label>
            <input
              required
              type="text"
              placeholder="e.g. Morning 200L Milk sourcing from farmer group"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                {Object.entries(categoryLabels).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (ETB)</label>
              <input
                required
                type="number"
                min="1"
                step="0.5"
                placeholder="5000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                required
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                <option value="BANK_TRANSFER">Bank Transfer (CBE)</option>
                <option value="TELEBIRR">Telebirr</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Payee</label>
              <input
                type="text"
                placeholder="e.g. Oromia Farmers Coop"
                value={form.vendor_name}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt / Invoice Ref</label>
              <input
                type="text"
                placeholder="e.g. RCP-1029"
                value={form.receipt_ref}
                onChange={(e) => setForm({ ...form, receipt_ref: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Additional remarks or batch details..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              className="px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold shadow-xs"
            >
              Record & Update Cash Out
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

