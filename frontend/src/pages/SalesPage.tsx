import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { Product, Sale, PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Receipt,
  Search,
  Download,
  Calendar,
  Filter,
  Eye,
  Edit2,
  RotateCcw,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

const SALE_CATEGORIES = [
  'Retail / Walk-in',
  'Morning Shift Sales',
  'Evening Shift Sales',
  'Wholesale / Cafe Delivery',
  'Hotel & Restaurant Bulk',
  'Route Distribution',
];

export const SalesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const canEditSales = hasRole('ADMIN', 'MANAGER');

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleCategory, setSaleCategory] = useState('Retail / Walk-in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<Sale | null>(null);

  // Search & Filter State in History
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // History detail modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  // Edit Sale Modal State (for Manager / Admin)
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    sale_category: 'Retail / Walk-in',
    payment_method: 'CASH' as PaymentMethod,
    discount: 0,
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, saleRes] = await Promise.all([
        api.getProducts(),
        api.getSales({
          search: filterSearch || undefined,
          date: filterDate || undefined,
          category: filterCategory !== 'ALL' ? filterCategory : undefined,
        }),
      ]);
      setProducts(prodRes.products);
      setSales(saleRes.sales);
    } catch (err: any) {
      alert(`Error loading sales data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDate, filterCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const available = product.current_stock ?? 0;

    if (existing) {
      if (existing.quantity >= available) {
        alert(`Cannot add more than available stock (${available} ${product.unit})`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      if (available <= 0) {
        alert(`Product "${product.name}" is currently out of stock!`);
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const available = item.product.current_stock ?? 0;
            if (newQty > available) {
              alert(`Maximum available stock is ${available} ${item.product.unit}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.unit_price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        sale_category: saleCategory,
        payment_method: paymentMethod,
        discount: Number(discount),
        notes,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.unit_price,
        })),
      };

      const res = await api.createSale(payload);
      setSaleSuccess(res.sale);
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setSaleCategory('Retail / Walk-in');
      setDiscount(0);
      setNotes('');
      loadData();
    } catch (err: any) {
      alert(`Sale failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const viewSaleDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    try {
      const res = await api.getSaleDetails(sale.id);
      setSaleItems(res.items);
    } catch (err: any) {
      alert(`Failed to load items: ${err.message}`);
    }
  };

  // Open Manager Edit Modal
  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditForm({
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone || '',
      sale_category: sale.sale_category || 'Retail / Walk-in',
      payment_method: sale.payment_method,
      discount: sale.discount || 0,
      notes: sale.notes || '',
    });
  };

  // Save Manager Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    try {
      setSavingEdit(true);
      await api.updateSale(editingSale.id, {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        sale_category: editForm.sale_category,
        payment_method: editForm.payment_method,
        discount: Number(editForm.discount),
        notes: editForm.notes,
      });

      setEditingSale(null);
      alert('Sale corrected successfully! Stock and cash flow have been synchronized.');
      loadData();
    } catch (err: any) {
      alert(`Failed to update sale: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Direct Excel (.xlsx) Export
  const exportDailySalesToExcel = () => {
    if (sales.length === 0) {
      alert('No sales records to export for this selection.');
      return;
    }

    const exportRows: Array<Record<string, any>> = sales.map((s, index) => ({
      '#': index + 1,
      'Receipt Code': s.sale_code,
      'Date & Time': s.created_at,
      'Sale Category': s.sale_category || 'Retail / Walk-in',
      'Customer Name': s.customer_name,
      'Customer Phone': s.customer_phone || '-',
      'Cashier': s.cashier_name || 'System',
      'Payment Method': s.payment_method,
      'Payment Status': s.payment_status,
      'Subtotal (ETB)': s.subtotal,
      'Discount (ETB)': s.discount,
      'Net Amount (ETB)': s.total_amount,
      'Notes': s.notes || '',
    }));

    // Add totals row
    const totalAmount = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalDiscount = sales.reduce((acc, s) => acc + s.discount, 0);
    const totalSubtotal = sales.reduce((acc, s) => acc + s.subtotal, 0);

    exportRows.push({
      '#': '' as any,
      'Receipt Code': 'TOTALS',
      'Date & Time': '',
      'Sale Category': '',
      'Customer Name': '',
      'Customer Phone': '',
      'Cashier': '',
      'Payment Method': '',
      'Payment Status': '',
      'Subtotal (ETB)': totalSubtotal,
      'Discount (ETB)': totalDiscount,
      'Net Amount (ETB)': totalAmount,
      'Notes': `${sales.length} Total Sales`,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Sales');

    const fileName = `WY_Argo_Dairy_Sales_${filterDate || 'Report'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // Daily totals summary
  const dailyTotalAmount = sales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales & Daily Billing</h2>
          <p className="text-sm text-slate-500">
            Process orders, filter daily sales by category, export to Excel, and manage mistake edits.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            POS Counter
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Daily Sales & Receipts ({sales.length})
          </button>
        </div>
      </div>

      {/* POS REGISTER */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Product Catalog */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search dairy items to sell..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const stock = p.current_stock ?? 0;
                const isOutOfStock = stock <= 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                      isOutOfStock
                        ? 'opacity-60 border-slate-200 bg-slate-50'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {p.category}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : stock <= p.min_stock_level
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {stock} {p.unit} in stock
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2 text-sm">{p.name}</h4>
                      <p className="text-xs font-mono text-slate-400">{p.sku}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-base font-bold text-slate-900">{p.unit_price}</span>
                        <span className="text-xs text-slate-500 font-medium"> ETB/{p.unit}</span>
                      </div>
                      <button
                        disabled={isOutOfStock}
                        onClick={() => addToCart(p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Cart & Billing */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Current Cart ({cart.reduce((a, b) => a + b.quantity, 0)} items)
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto max-h-52 divide-y divide-slate-100 my-2">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  Cart is empty. Select dairy products to begin.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="w-1/2">
                      <div className="font-semibold text-slate-800 truncate">{item.product.name}</div>
                      <div className="text-slate-400">
                        {item.product.unit_price} ETB × {item.quantity} {item.product.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 ml-1 text-slate-300 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="font-bold text-slate-900 w-16 text-right">
                      {(item.product.unit_price * item.quantity).toLocaleString()} ETB
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Billing Form */}
            <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+251..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sale Category Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Daily Sales Category
                </label>
                <select
                  value={saleCategory}
                  onChange={(e) => setSaleCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  {SALE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['CASH', 'TELEBIRR', 'BANK_TRANSFER', 'CREDIT'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        paymentMethod === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'BANK_TRANSFER' ? 'Bank CBE' : m === 'TELEBIRR' ? 'Telebirr' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Discount (ETB):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-1 text-right border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{subtotal.toLocaleString()} ETB</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{discount.toLocaleString()} ETB</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Due:</span>
                  <span className="text-blue-600">{total.toLocaleString()} ETB</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={cart.length === 0 || submitting}
                className={`w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                  cart.length === 0 || submitting
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                }`}
              >
                {submitting ? 'Recording Sale...' : `Settle & Print (${total.toLocaleString()} ETB)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SALES HISTORY & DAILY SALES VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Daily Sales Filter Bar with Search & Excel Export */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search receipt, customer, item..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </form>

              {/* Date Filter & Category Filter */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Date Picker */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-transparent border-none text-slate-800 font-semibold focus:outline-none"
                  />
                  {filterDate && (
                    <button
                      type="button"
                      onClick={() => setFilterDate('')}
                      className="text-slate-400 hover:text-slate-600 text-[10px]"
                      title="Clear date filter"
                    >
                      All
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Sales Categories</option>
                  {SALE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Direct Excel Download Button */}
                <button
                  onClick={exportDailySalesToExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all"
                  title="Download directly as Microsoft Excel (.xlsx) file"
                >
                  <Download className="w-4 h-4" />
                  Export to Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Daily Total Summary Strip */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">Date Range: </span>
                  <span className="font-bold text-slate-800">{filterDate || 'All Recorded Dates'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Receipts: </span>
                  <span className="font-bold text-slate-800">{sales.length}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Filtered Sales Revenue: </span>
                <span className="font-bold text-emerald-600 text-sm">
                  {dailyTotalAmount.toLocaleString()} ETB
                </span>
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Sales Category</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">{s.sale_code}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{s.created_at}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {s.sale_category || 'Retail / Walk-in'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.customer_name}</div>
                        {s.customer_phone && (
                          <div className="text-xs text-slate-400">{s.customer_phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                        {s.cashier_name || 'System'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {s.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {s.total_amount.toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => viewSaleDetails(s)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEditSales && (
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Manager Edit: Correct mistake on already sold item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW RECEIPT */}
      <Modal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={`Sales Receipt: ${selectedSale?.sale_code}`}
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">WY Argo Dairy ERP</p>
                <p className="text-slate-500">Category: {selectedSale.sale_category || 'Retail / Walk-in'}</p>
                <p className="text-slate-500">Customer: {selectedSale.customer_name}</p>
                <p className="text-slate-500">Cashier: {selectedSale.cashier_name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-slate-500">{selectedSale.created_at}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                  {selectedSale.payment_method} ({selectedSale.payment_status})
                </span>
              </div>
            </div>

            <table className="w-full text-left">
              <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saleItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium text-slate-800">{item.product_name}</td>
                    <td className="py-2 text-center">
                      {item.quantity} {item.product_unit}
                    </td>
                    <td className="py-2 text-right">{item.unit_price} ETB</td>
                    <td className="py-2 text-right font-semibold text-slate-900">
                      {item.subtotal.toLocaleString()} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-3 border-t border-slate-200 space-y-1 text-right">
              <div className="text-slate-500">Subtotal: {selectedSale.subtotal.toLocaleString()} ETB</div>
              {selectedSale.discount > 0 && (
                <div className="text-rose-600">Discount: -{selectedSale.discount.toLocaleString()} ETB</div>
              )}
              <div className="text-base font-bold text-slate-900">
                Net Total: {selectedSale.total_amount.toLocaleString()} ETB
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: MANAGER EDIT SALE RECORD */}
      <Modal
        isOpen={!!editingSale}
        onClose={() => setEditingSale(null)}
        title={`Manager Correction: ${editingSale?.sale_code}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            <b>Manager Privilege:</b> Correct customer details, sales category, payment channel, or discount for receipt #{editingSale?.sale_code}. This will also automatically adjust the Cash Flow ledger.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
              <input
                required
                type="text"
                value={editForm.customer_name}
                onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Phone</label>
              <input
                type="text"
                value={editForm.customer_phone}
                onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Category</label>
              <select
                value={editForm.sale_category}
                onChange={(e) => setEditForm({ ...editForm, sale_category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                {SALE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={editForm.payment_method}
                onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value as PaymentMethod })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                <option value="CASH">Cash</option>
                <option value="TELEBIRR">Telebirr</option>
                <option value="BANK_TRANSFER">Bank (CBE)</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Amount (ETB)</label>
            <input
              type="number"
              min="0"
              value={editForm.discount}
              onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Mistake Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Cashier selected wrong payment channel / adjusted customer discount"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingSale(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs"
            >
              {savingEdit ? 'Updating Sale...' : 'Save Corrections'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SUCCESS MODAL POPUP */}
      <Modal
        isOpen={!!saleSuccess}
        onClose={() => setSaleSuccess(null)}
        title="Sale Completed Successfully!"
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">
            {saleSuccess?.total_amount.toLocaleString()} ETB Received
          </h4>
          <p className="text-xs text-slate-500">
            Receipt #{saleSuccess?.sale_code} settled under <b>{saleSuccess?.sale_category}</b> via{' '}
            {saleSuccess?.payment_method}.
          </p>
          <div className="pt-3">
            <button
              onClick={() => setSaleSuccess(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
            >
              Done / Next Customer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
