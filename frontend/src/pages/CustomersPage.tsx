import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Customer, CustomerType, PaymentMethod, Sale, CustomerPayment } from '../types';
import {
  Users,
  Search,
  Plus,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  Phone,
  MapPin,
  Calendar,
  X,
  CreditCard,
  Building,
  ArrowUpRight,
  UserCheck,
  History,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Summary stats
  const [receivablesSummary, setReceivablesSummary] = useState({
    total_receivables: 0,
    debtor_count: 0,
    over_limit_count: 0,
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'RETAIL' as CustomerType,
    credit_limit: '',
    notes: '',
  });

  // Repayment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CASH' as PaymentMethod,
    receipt_ref: '',
    notes: '',
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCustomersAndSummary();
  }, [searchTerm, selectedType, filterDebtOnly]);

  const fetchCustomersAndSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const [custRes, summaryRes] = await Promise.all([
        api.getCustomers({
          search: searchTerm || undefined,
          type: selectedType !== 'ALL' ? selectedType : undefined,
          has_debt: filterDebtOnly || undefined,
        }),
        api.getReceivablesSummary(),
      ]);

      setCustomers(custRes.customers || []);
      setReceivablesSummary(summaryRes.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;

    try {
      await api.createCustomer({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
        customer_type: newCustomer.customer_type,
        credit_limit: Number(newCustomer.credit_limit) || 0,
        notes: newCustomer.notes.trim() || undefined,
      });

      setIsAddModalOpen(false);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type: 'RETAIL',
        credit_limit: '',
        notes: '',
      });
      setStatusMessage({ type: 'success', text: 'Customer registered successfully!' });
      setTimeout(() => setStatusMessage(null), 3000);
      fetchCustomersAndSummary();
    } catch (err: any) {
      alert(`Error creating customer: ${err.message}`);
    }
  };

  const openRepaymentModal = (customer: Customer) => {
    setSelectedCustomerForPayment(customer);
    setPaymentForm({
      amount: String(customer.current_balance),
      payment_method: 'CASH',
      receipt_ref: '',
      notes: 'Outstanding debt settlement',
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPayment) return;

    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid positive payment amount');
      return;
    }

    try {
      setPaymentSubmitting(true);
      await api.recordCustomerPayment(selectedCustomerForPayment.id, {
        amount: amt,
        payment_method: paymentForm.payment_method,
        receipt_ref: paymentForm.receipt_ref.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });

      setSelectedCustomerForPayment(null);
      setStatusMessage({
        type: 'success',
        text: `Successfully collected ${amt.toLocaleString()} ETB repayment from ${selectedCustomerForPayment.name}! Cash flow ledger updated.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
      fetchCustomersAndSummary();
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const openHistoryModal = async (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setHistoryLoading(true);
    try {
      const res = await api.getCustomerDetails(customer.id);
      setCustomerSales(res.sales || []);
      setCustomerPayments(res.payments || []);
    } catch (err: any) {
      alert(`Failed to load history: ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getCustomerTypeBadge = (type: CustomerType) => {
    switch (type) {
      case 'HOTEL_CAFE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">Hotel / Cafe</span>;
      case 'WHOLESALE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Wholesaler</span>;
      case 'DISTRIBUTOR':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">Distributor</span>;
      case 'STAFF':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Staff Account</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">Retail Regular</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Customers & Receivables (Loan Tracking)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage registered clients, wholesale accounts, credit limits, and debt collection.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Register New Customer
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Receivables (Owed)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {receivablesSummary.total_receivables.toLocaleString()} ETB
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Outstanding customer loans & credit</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Debtors Count</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {receivablesSummary.debtor_count}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Customers with pending balances</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Registered Customers</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {customers.length}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Active commercial profiles</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Credit Limit Warnings</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {receivablesSummary.over_limit_count}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Debts exceeding assigned limits</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">All Customer Types</option>
            <option value="RETAIL">Retail Regular</option>
            <option value="HOTEL_CAFE">Hotels & Cafes</option>
            <option value="WHOLESALE">Wholesalers</option>
            <option value="DISTRIBUTOR">Distributors</option>
            <option value="STAFF">Staff</option>
          </select>

          <button
            onClick={() => setFilterDebtOnly(!filterDebtOnly)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-1.5 ${
              filterDebtOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Debtors Only ({receivablesSummary.debtor_count})
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading customer records...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">{error}</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm || selectedType !== 'ALL' || filterDebtOnly
                ? 'Try clearing your filters'
                : 'Click "Register New Customer" above to add your first customer.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Contact & Location</th>
                  <th className="py-3.5 px-4 text-right">Credit Limit</th>
                  <th className="py-3.5 px-4 text-right">Outstanding Debt</th>
                  <th className="py-3.5 px-4 text-right">Orders</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((c) => {
                  const hasDebt = c.current_balance > 0;
                  const isOverLimit = c.credit_limit > 0 && c.current_balance > c.credit_limit;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        {c.notes && <div className="text-xs text-slate-400 truncate max-w-xs">{c.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">{getCustomerTypeBadge(c.customer_type)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                          {c.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.phone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                          {c.address && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {c.address}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        {c.credit_limit > 0 ? `${c.credit_limit.toLocaleString()} ETB` : 'No Limit'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold inline-block px-2.5 py-1 rounded-lg text-xs ${
                            hasDebt
                              ? isOverLimit
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {hasDebt ? `${c.current_balance.toLocaleString()} ETB` : 'Settled (0)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-semibold text-slate-600">
                        {c.total_orders_count || 0} orders
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {hasDebt && (
                            <button
                              onClick={() => openRepaymentModal(c)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" />
                              Collect
                            </button>
                          )}
                          <button
                            onClick={() => openHistoryModal(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors title='Account History'"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Register New Customer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Register New Customer
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bole Sky Hotel or Abebe Kebede"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Customer Type
                  </label>
                  <select
                    value={newCustomer.customer_type}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, customer_type: e.target.value as CustomerType })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="RETAIL">Retail Regular</option>
                    <option value="HOTEL_CAFE">Hotel / Cafe</option>
                    <option value="WHOLESALE">Wholesaler</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="STAFF">Staff Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0911234567"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Credit Limit (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = unlimited"
                    value={newCustomer.credit_limit}
                    onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Delivery / Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bole Medhanialem or Kazanchis"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional order or credit terms..."
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Collect Repayment / Debt Settlement */}
      {selectedCustomerForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
              <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Collect Debt Repayment
              </h3>
              <button
                onClick={() => setSelectedCustomerForPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 uppercase font-semibold">Customer</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedCustomerForPayment.name}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-500">Total Outstanding Loan:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {selectedCustomerForPayment.current_balance.toLocaleString()} ETB
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Repayment Amount Received (ETB) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  max={selectedCustomerForPayment.current_balance}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'TELEBIRR', 'BANK_TRANSFER'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, payment_method: method })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        paymentForm.payment_method === method
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method === 'BANK_TRANSFER' ? 'CBE / Bank' : method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Receipt Ref / Telebirr Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. REC-8921 or FT26..."
                  value={paymentForm.receipt_ref}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receipt_ref: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Settlement notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForPayment(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {paymentSubmitting ? 'Processing...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Account History (Ledger) */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {selectedCustomerForHistory.name} - Statement Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Current Balance Owed: <span className="font-bold text-rose-600">{selectedCustomerForHistory.current_balance.toLocaleString()} ETB</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {historyLoading ? (
                <div className="text-center py-8 text-slate-400">Loading history...</div>
              ) : (
                <>
                  {/* Purchases / Orders */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      Invoices & Purchase Orders ({customerSales.length})
                    </h4>
                    {customerSales.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No orders recorded yet.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                              <th className="p-2.5">Date / Invoice</th>
                              <th className="p-2.5">Payment Method</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">Paid</th>
                              <th className="p-2.5 text-right">Due</th>
                              <th className="p-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customerSales.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-800">{s.sale_code}</div>
                                  <div className="text-[10px] text-slate-400">{s.created_at.split('T')[0]}</div>
                                </td>
                                <td className="p-2.5 font-medium">{s.payment_method}</td>
                                <td className="p-2.5 text-right font-bold">{s.total_amount.toLocaleString()} ETB</td>
                                <td className="p-2.5 text-right text-emerald-600">{(s.paid_amount || 0).toLocaleString()} ETB</td>
                                <td className="p-2.5 text-right text-rose-600 font-bold">{(s.due_amount || 0).toLocaleString()} ETB</td>
                                <td className="p-2.5 text-center">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      s.payment_status === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : s.payment_status === 'PARTIALLY_PAID'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {s.payment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Repayments */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Repayments & Debt Collections ({customerPayments.length})
                    </h4>
                    {customerPayments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No repayments recorded yet.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Method</th>
                              <th className="p-2.5">Ref #</th>
                              <th className="p-2.5 text-right">Amount Repaid</th>
                              <th className="p-2.5">Collected By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customerPayments.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5 text-slate-600">{p.created_at.split('T')[0]}</td>
                                <td className="p-2.5 font-bold text-slate-700">{p.payment_method}</td>
                                <td className="p-2.5 text-slate-500">{p.receipt_ref || '-'}</td>
                                <td className="p-2.5 text-right font-bold text-emerald-600">
                                  +{p.amount.toLocaleString()} ETB
                                </td>
                                <td className="p-2.5 text-slate-500">{p.collected_by_name || 'Cashier'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
