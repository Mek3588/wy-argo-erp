import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { Product, Sale, PaymentMethod, Customer, CustomerType } from '../types';
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
  User,
  Users,
  AlertCircle,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckSquare,
  Printer,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  rawQuantity?: string;
  rawPrice?: string;
}

interface EditItemRow {
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_unit?: string;
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
  const canVerifyFinance = hasRole('ADMIN', 'MANAGER', 'FINANCE');

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerMode, setCustomerMode] = useState<'walkin' | 'registered'>('walkin');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleCategory, setSaleCategory] = useState('Retail / Walk-in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isPartialCredit, setIsPartialCredit] = useState(false);
  const [upfrontPaidAmount, setUpfrontPaidAmount] = useState('');
  const [upfrontMethod, setUpfrontMethod] = useState<PaymentMethod>('CASH');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<Sale | null>(null);

  // Quick Customer Modal
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: '',
    phone: '',
    customer_type: 'RETAIL' as CustomerType,
  });

  // Repayment Modal State (Direct Collection from History)
  const [repaymentSale, setRepaymentSale] = useState<Sale | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState<PaymentMethod>('CASH');
  const [repaymentRef, setRepaymentRef] = useState('');
  const [submittingRepayment, setSubmittingRepayment] = useState(false);

  // Search & Filter State in History
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFinanceStatus, setFilterFinanceStatus] = useState<string>('ALL');
  const [bulkVerifying, setBulkVerifying] = useState(false);

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
    notes: '',
  });
  const [editItems, setEditItems] = useState<EditItemRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, saleRes, custRes] = await Promise.all([
        api.getProducts(),
        api.getSales({
          search: filterSearch || undefined,
          date: filterDate || undefined,
          category: filterCategory !== 'ALL' ? filterCategory : undefined,
          status: filterStatus !== 'ALL' ? filterStatus : undefined,
          finance_status: filterFinanceStatus !== 'ALL' ? filterFinanceStatus : undefined,
        }),
        api.getCustomers(),
      ]);
      setProducts(prodRes.products);
      setSales(saleRes.sales);
      setCustomers(custRes.customers || []);
    } catch (err: any) {
      alert(`Error loading sales data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDate, filterCategory, filterStatus, filterFinanceStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const available = product.current_stock ?? 0;

    if (existing) {
      const currentQty = Number(existing.quantity) || 0;
      if (currentQty >= available) {
        alert(`Cannot add more than available stock (${available} ${product.unit})`);
        return;
      }
      const nextQty = Math.round((currentQty + 1) * 100) / 100;
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQty, rawQuantity: String(nextQty) }
            : item
        )
      );
    } else {
      if (available <= 0) {
        alert(`Product "${product.name}" is currently out of stock!`);
        return;
      }
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unit_price: product.unit_price,
          rawQuantity: '1',
          rawPrice: String(product.unit_price),
        },
      ]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const currentQty = Number(item.quantity) || 0;
            const newQty = Math.round((currentQty + delta) * 100) / 100;
            const available = item.product.current_stock ?? 0;
            if (newQty > available) {
              alert(`Maximum available stock is ${available} ${item.product.unit}`);
              return item;
            }
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty, rawQuantity: String(newQty) };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemQuantity = (productId: number, strVal: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const parsed = parseFloat(strVal);
          const available = item.product.current_stock ?? 0;
          if (!isNaN(parsed) && parsed > available) {
            alert(`Maximum available stock is ${available} ${item.product.unit}`);
            return { ...item, quantity: available, rawQuantity: String(available) };
          }
          return {
            ...item,
            rawQuantity: strVal,
            quantity: isNaN(parsed) || parsed < 0 ? 0 : parsed,
          };
        }
        return item;
      })
    );
  };

  const updateItemPrice = (productId: number, strVal: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const parsed = parseFloat(strVal);
          return {
            ...item,
            rawPrice: strVal,
            unit_price: isNaN(parsed) || parsed < 0 ? 0 : parsed,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
    0
  );
  const total = subtotal; // Direct price, no discount needed

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    try {
      setSubmitting(true);
      const selCustomer = customers.find((c) => c.id === selectedCustomerId);
      const isCredit = paymentMethod === 'CREDIT';
      const paidAmt = isCredit ? Number(upfrontPaidAmount || 0) : total;
      const dueAmt = Math.max(0, total - paidAmt);

      const invalidItem = cart.find((i) => (Number(i.quantity) || 0) <= 0);
      if (invalidItem) {
        alert(`Please enter a valid quantity for "${invalidItem.product.name}"`);
        return;
      }

      const payload = {
        customer_id: customerMode === 'registered' && selectedCustomerId ? selectedCustomerId : undefined,
        customer_name: customerMode === 'registered' && selCustomer ? selCustomer.name : customerName,
        customer_phone:
          customerMode === 'registered' && selCustomer
            ? selCustomer.phone || customerPhone
            : customerPhone,
        sale_category: saleCategory,
        payment_method: paymentMethod,
        upfront_payment_method: isCredit && paidAmt > 0 ? upfrontMethod : undefined,
        paid_amount: paidAmt,
        due_amount: dueAmt,
        due_date: isCredit && dueDate ? dueDate : undefined,
        discount: 0,
        notes,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: Number(i.quantity) || 0,
          unit_price: Number(i.unit_price) || 0,
        })),
      };

      const res = await api.createSale(payload);
      setSaleSuccess(res.sale);
      setCart([]);
      setCustomerMode('walkin');
      setSelectedCustomerId(null);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setSaleCategory('Retail / Walk-in');
      setPaymentMethod('CASH');
      setIsPartialCredit(false);
      setUpfrontPaidAmount('');
      setDueDate('');
      setNotes('');
      loadData();
    } catch (err: any) {
      alert(`Sale failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name.trim()) return;
    try {
      const res = await api.createCustomer({
        name: quickCustomer.name.trim(),
        phone: quickCustomer.phone.trim() || undefined,
        customer_type: quickCustomer.customer_type,
        credit_limit: 0,
      });
      setIsQuickCustomerModalOpen(false);
      setQuickCustomer({
        name: '',
        phone: '',
        customer_type: 'RETAIL',
      });
      await loadData();
      if (res.customer) {
        setCustomerMode('registered');
        setSelectedCustomerId(res.customer.id);
        setCustomerName(res.customer.name);
        setCustomerPhone(res.customer.phone || '');
      }
    } catch (err: any) {
      alert(`Failed to create customer: ${err.message}`);
    }
  };

  const handleCollectRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentSale || !repaymentSale.customer_id) return;
    const amt = Number(repaymentAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid repayment amount');
      return;
    }
    try {
      setSubmittingRepayment(true);
      await api.recordCustomerPayment(repaymentSale.customer_id, {
        amount: amt,
        payment_method: repaymentMethod,
        receipt_ref: repaymentRef.trim() || undefined,
        sale_id: repaymentSale.id,
        notes: `Settlement for invoice ${repaymentSale.sale_code}`,
      });
      setRepaymentSale(null);
      alert(`Repayment of ${amt.toLocaleString()} ETB recorded successfully!`);
      loadData();
    } catch (err: any) {
      alert(`Failed to record repayment: ${err.message}`);
    } finally {
      setSubmittingRepayment(false);
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

  // Open Manager Edit Modal - Fetch full items for full line-item correction
  const openEditModal = async (sale: Sale) => {
    setEditingSale(sale);
    setEditForm({
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone || '',
      sale_category: sale.sale_category || 'Retail / Walk-in',
      payment_method: sale.payment_method,
      notes: sale.notes || '',
    });
    try {
      const res = await api.getSaleDetails(sale.id);
      setEditItems(
        (res.items || []).map((i: any) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          product_name: i.product_name,
          product_unit: i.product_unit,
        }))
      );
    } catch (err) {
      setEditItems([]);
    }
  };

  const updateEditItem = (index: number, field: keyof EditItemRow, value: any) => {
    setEditItems((prev) => {
      const copy = [...prev];
      if (field === 'product_id') {
        const prodId = Number(value);
        const prod = products.find((p) => p.id === prodId);
        copy[index] = {
          ...copy[index],
          product_id: prodId,
          product_name: prod?.name || '',
          product_unit: prod?.unit || 'pcs',
          unit_price: prod ? prod.unit_price : copy[index].unit_price,
        };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const removeEditItem = (index: number) => {
    if (editItems.length <= 1) {
      alert('Sale must contain at least one product.');
      return;
    }
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addEditItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setEditItems((prev) => [
      ...prev,
      {
        product_id: firstProd.id,
        quantity: 1,
        unit_price: firstProd.unit_price,
        product_name: firstProd.name,
        product_unit: firstProd.unit,
      },
    ]);
  };

  const editTotal = editItems.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  );

  // Save Manager Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    if (editItems.length === 0) {
      alert('Sale must have at least one product item!');
      return;
    }

    try {
      setSavingEdit(true);
      await api.updateSale(editingSale.id, {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        sale_category: editForm.sale_category,
        payment_method: editForm.payment_method,
        discount: 0,
        notes: editForm.notes,
        items: editItems.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
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

  // Finance Verification Toggle
  const handleToggleFinanceVerify = async (saleId: number) => {
    try {
      const res = await api.toggleFinanceVerify(saleId);
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? {
                ...s,
                is_finance_verified: res.is_finance_verified,
                finance_verified_at: res.finance_verified_at,
                finance_verified_by_name: res.finance_verified_by_name,
              }
            : s
        )
      );
      setSelectedSale((prev) =>
        prev && prev.id === saleId
          ? {
              ...prev,
              is_finance_verified: res.is_finance_verified,
              finance_verified_at: res.finance_verified_at,
              finance_verified_by_name: res.finance_verified_by_name,
            }
          : prev
      );
    } catch (err: any) {
      alert(`Finance verification failed: ${err.message}`);
    }
  };

  // Bulk Finance Verification
  const handleBulkFinanceVerify = async () => {
    const unverified = sales.filter((s) => !s.is_finance_verified);
    if (unverified.length === 0) {
      alert('All sales currently shown are already verified!');
      return;
    }
    if (!confirm(`Acknowledge and verify cash/payment received for all ${unverified.length} pending sales?`)) {
      return;
    }
    try {
      setBulkVerifying(true);
      await api.bulkFinanceVerify(unverified.map((s) => s.id));
      alert(`Successfully verified ${unverified.length} sales!`);
      loadData();
    } catch (err: any) {
      alert(`Bulk verification failed: ${err.message}`);
    } finally {
      setBulkVerifying(false);
    }
  };

  // Direct Excel (.xlsx) Export with Products & Quantities
  const exportDailySalesToExcel = () => {
    if (sales.length === 0) {
      alert('No sales records to export for this selection.');
      return;
    }

    const exportRows: Array<Record<string, any>> = sales.map((s, index) => ({
      '#': index + 1,
      'Receipt Code': s.sale_code,
      'Date & Time': s.created_at,
      'Products & Quantities': s.items_summary || '-',
      'Customer Name': s.customer_name,
      'Customer Phone': s.customer_phone || '-',
      'Sales Category': s.sale_category || 'Retail / Walk-in',
      'Cashier': s.cashier_name || 'System',
      'Payment Method': s.payment_method,
      'Payment Status': s.payment_status,
      'Net Amount (ETB)': s.total_amount,
      'Balance Due (ETB)': s.due_amount || 0,
      'Finance Verified': s.is_finance_verified
        ? `Verified (${s.finance_verified_by_name || 'Finance'})`
        : 'Pending Review',
      'Notes': s.notes || '',
    }));

    // Add totals row
    const totalAmount = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalDue = sales.reduce((acc, s) => acc + (s.due_amount || 0), 0);

    exportRows.push({
      '#': '' as any,
      'Receipt Code': 'TOTALS',
      'Date & Time': '',
      'Products & Quantities': `${sales.length} Total Sales`,
      'Customer Name': '',
      'Customer Phone': '',
      'Sales Category': '',
      'Cashier': '',
      'Payment Method': '',
      'Payment Status': '',
      'Net Amount (ETB)': totalAmount,
      'Balance Due (ETB)': totalDue,
      'Finance Verified': '',
      'Notes': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Sales');

    const fileName = `Bani_Milk_Sales_${filterDate || 'Report'}.xlsx`;
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
    <div className="space-y-5">
      {/* 1. Industrial Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider">
              POINT OF SALE & ACCOUNTS RECEIVABLE
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-blue-600 font-semibold">Active Counter</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Sales Counter, POS & Settlement Registry
          </h2>
          <p className="text-xs text-slate-500">
            Process direct customer orders, manage credit accounts, audit receipts, and export verified ledger records.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS Register</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales Archive ({sales.length})</span>
          </button>
        </div>
      </div>

      {/* POS REGISTER */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Product Catalog */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all select-none ${
                      isOutOfStock
                        ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-[0.99]'
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
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
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
                Current Cart ({cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)} items)
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto max-h-72 space-y-2.5 my-2 pr-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  Cart is empty. Select dairy products to begin.
                </div>
              ) : (
                cart.map((item) => {
                  const lineTotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
                  return (
                    <div
                      key={item.product.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl transition-all shadow-2xs space-y-2"
                    >
                      {/* Top row: Name, Line total, Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-800 text-xs truncate block">
                            {item.product.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.product.sku}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                            {lineTotal.toLocaleString()} ETB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom row: Flexible Unit Price & Quantity Stepper */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 text-xs">
                        {/* Flexible Price input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Price:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.rawPrice !== undefined ? item.rawPrice : item.unit_price}
                            onChange={(e) => updateItemPrice(item.product.id, e.target.value)}
                            placeholder="0"
                            className="w-20 px-2 py-1 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                          />
                          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                            ETB/{item.product.unit}
                          </span>
                        </div>

                        {/* Stepper with Decimal Quantity Input */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
                            title="Decrease"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.rawQuantity !== undefined ? item.rawQuantity : item.quantity}
                            onChange={(e) => updateItemQuantity(item.product.id, e.target.value)}
                            placeholder="1"
                            className="w-14 h-7 text-center font-bold text-xs text-slate-900 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
                            title="Increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Billing Form */}
            <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              {/* Customer Type Toggle */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer Profile</label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('walkin');
                      setSelectedCustomerId(null);
                      setCustomerName('Walk-in Customer');
                      setCustomerPhone('');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1 ${
                      customerMode === 'walkin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Walk-in Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('registered');
                      if (customers.length > 0 && !selectedCustomerId) {
                        setSelectedCustomerId(customers[0].id);
                        setCustomerName(customers[0].name);
                        setCustomerPhone(customers[0].phone || '');
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1 ${
                      customerMode === 'registered'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Registered Account
                  </button>
                </div>

                {customerMode === 'registered' ? (
                  <div className="space-y-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-blue-900">Select Client</span>
                      <button
                        type="button"
                        onClick={() => setIsQuickCustomerModalOpen(true)}
                        className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> New Customer
                      </button>
                    </div>
                    <select
                      value={selectedCustomerId || ''}
                      onChange={(e) => {
                        const cid = Number(e.target.value);
                        setSelectedCustomerId(cid);
                        const c = customers.find((cust) => cust.id === cid);
                        if (c) {
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone || '');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 text-xs"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.customer_type.replace('_', '/')}) — Balance: {c.current_balance} ETB
                        </option>
                      ))}
                    </select>

                    {selectedCustomerId && (() => {
                      const c = customers.find((cust) => cust.id === selectedCustomerId);
                      if (!c) return null;
                      return (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-100">
                          <span className="text-slate-500">Current Debt Balance:</span>
                          <span className={`font-bold ${c.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {c.current_balance.toLocaleString()} ETB
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer Name (optional)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone (optional)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>
                )}
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(['CASH', 'TELEBIRR', 'EBIRR', 'BANK_TRANSFER', 'CREDIT'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        paymentMethod === m
                          ? m === 'CREDIT'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'BANK_TRANSFER' ? 'Bank CBE' : m === 'TELEBIRR' ? 'Telebirr' : m === 'EBIRR' ? 'E-Birr' : m === 'CREDIT' ? 'On Credit' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* CREDIT / LOAN CONFIGURATION */}
              {paymentMethod === 'CREDIT' && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      Credit / Loan Order
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPartialCredit}
                        onChange={(e) => {
                          setIsPartialCredit(e.target.checked);
                          if (!e.target.checked) setUpfrontPaidAmount('');
                        }}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      Partial Upfront Paid
                    </label>
                  </div>

                  {isPartialCredit && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-rose-200/60">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Amount Paid Now (ETB)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={total}
                          value={upfrontPaidAmount}
                          onChange={(e) => setUpfrontPaidAmount(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Upfront Method
                        </label>
                        <select
                          value={upfrontMethod}
                          onChange={(e) => setUpfrontMethod(e.target.value as PaymentMethod)}
                          className="w-full px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs"
                        >
                          <option value="CASH">Cash</option>
                          <option value="TELEBIRR">Telebirr</option>
                          <option value="EBIRR">E-Birr</option>
                          <option value="BANK_TRANSFER">Bank CBE</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-600 font-medium">Remaining Credit / Loan Balance:</span>
                    <span className="font-bold text-rose-700 text-xs font-mono">
                      {Math.max(0, total - (Number(upfrontPaidAmount) || 0)).toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              )}

              {/* Totals Summary */}
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-blue-600 text-base">{total.toLocaleString()} ETB</span>
                </div>
                {paymentMethod === 'CREDIT' && (
                  <div className="flex justify-between text-xs font-bold text-rose-600 pt-1 border-t border-dashed border-rose-200">
                    <span>Added to Customer Debt:</span>
                    <span>{Math.max(0, total - (Number(upfrontPaidAmount) || 0)).toLocaleString()} ETB</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={cart.length === 0 || submitting}
                className={`w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                  cart.length === 0 || submitting
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : paymentMethod === 'CREDIT'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                }`}
              >
                {submitting
                  ? 'Recording Sale...'
                  : paymentMethod === 'CREDIT'
                  ? `Confirm Credit / Loan Sale (${total.toLocaleString()} ETB)`
                  : `Settle & Print (${total.toLocaleString()} ETB)`}
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
                  <option value="ALL">All Categories</option>
                  {SALE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Status Dropdown */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="PAID">Fully Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="CREDIT">On Credit / Pending</option>
                </select>

                {/* Finance Status Dropdown */}
                <select
                  value={filterFinanceStatus}
                  onChange={(e) => setFilterFinanceStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Finance Status</option>
                  <option value="VERIFIED">Verified by Finance</option>
                  <option value="PENDING">Pending Review</option>
                </select>

                {/* Bulk Finance Verify Button */}
                {canVerifyFinance && (
                  <button
                    onClick={handleBulkFinanceVerify}
                    disabled={bulkVerifying}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                    title="Acknowledge and verify payment received for all pending sales"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {bulkVerifying ? 'Verifying...' : 'Verify All Pending'}
                  </button>
                )}

                {/* Direct Excel Download Button */}
                <button
                  onClick={exportDailySalesToExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all"
                  title="Download directly as Microsoft Excel (.xlsx) file with Products & Quantities"
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

          {/* Sales Data Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5 font-mono">Receipt / Code</th>
                    <th className="py-2.5 px-3.5">Customer & Channel</th>
                    <th className="py-2.5 px-3.5">Products Dispatched</th>
                    <th className="py-2.5 px-3.5">Payment Method</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">Amount Settled</th>
                    <th className="py-2.5 px-3.5 text-center">Finance Status</th>
                    <th className="py-2.5 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sales.map((s) => {
                    const hasDebt = (s.due_amount || 0) > 0;
                    return (
                      <tr key={s.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                        {/* 1. Receipt & Date */}
                        <td className="py-2.5 px-3.5">
                          <button
                            type="button"
                            onClick={() => viewSaleDetails(s)}
                            className="font-mono font-bold text-blue-700 hover:text-blue-900 text-xs bg-blue-50/70 border border-blue-200/50 px-1.5 py-0.5 rounded block text-left"
                            title="Click to view full receipt & details"
                          >
                            {s.sale_code}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            {s.created_at}
                          </span>
                        </td>

                        {/* 2. Customer & Channel */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">
                              {s.customer_name}
                            </span>
                            {s.customer_id ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                REG
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-slate-100 text-slate-500">
                                WALKIN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {s.customer_phone && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {s.customer_phone}
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {s.sale_category || 'Retail / Walk-in'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Products Sold */}
                        <td className="py-2.5 px-3.5 max-w-[240px]">
                          <div
                            className="text-xs font-medium text-slate-800 line-clamp-2 leading-relaxed"
                            title={s.items_summary || ''}
                          >
                            {s.items_summary || `${s.item_count || 1} items`}
                          </div>
                        </td>

                        {/* 4. Payment & Status */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              {s.payment_method === 'BANK_TRANSFER' ? 'Bank CBE' : s.payment_method === 'TELEBIRR' ? 'Telebirr' : s.payment_method === 'EBIRR' ? 'E-Birr' : s.payment_method}
                            </span>
                            {s.payment_status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1 h-1 rounded-full bg-emerald-600"></span> Paid
                              </span>
                            ) : s.payment_status === 'PARTIALLY_PAID' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1 h-1 rounded-full bg-amber-600"></span> Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1 h-1 rounded-full bg-rose-600"></span> Credit
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Total & Balance */}
                        <td className="py-2.5 px-3.5 text-right font-mono">
                          <div className="font-bold text-slate-900 text-xs tabular-nums">
                            {s.total_amount.toLocaleString()} ETB
                          </div>
                          {hasDebt ? (
                            <div className="text-[11px] font-bold text-rose-600 mt-0.5">
                              Due: {(s.due_amount || 0).toLocaleString()} ETB
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 mt-0.5">Settled</div>
                          )}
                        </td>

                        {/* 6. Finance Status (Clean Status Badge) */}
                        <td className="py-3 px-4 text-center">
                          {s.is_finance_verified ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title={`Verified by ${s.finance_verified_by_name || 'Finance'}${s.finance_verified_at ? ` on ${s.finance_verified_at.split('T')[0]}` : ''}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                              title="Pending finance review. Open receipt details to authorize."
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => viewSaleDetails(s)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Receipt & Finance Verification"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {hasDebt && s.customer_id && (
                              <button
                                onClick={() => {
                                  setRepaymentSale(s);
                                  setRepaymentAmount(String(s.due_amount || ''));
                                  setRepaymentMethod('CASH');
                                  setRepaymentRef('');
                                }}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Collect Debt Repayment for this sale"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {canEditSales && (
                              <button
                                onClick={() => openEditModal(s)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Manager Edit: Correct products, quantity, or payment on this sale"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW RECEIPT & FINANCE AUTHORIZATION */}
      <Modal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={`Sales Receipt: ${selectedSale?.sale_code}`}
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            {/* Clean Receipt Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    🥛 Bani Milk ERP
                  </h3>
                  <p className="text-[11px] text-slate-500">Quality Dairy Operations & Point of Sale</p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Invoice #{selectedSale.sale_code}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-slate-600 block">
                    {selectedSale.created_at}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedSale.payment_method === 'BANK_TRANSFER' ? 'Bank CBE' : selectedSale.payment_method === 'TELEBIRR' ? 'Telebirr' : selectedSale.payment_method === 'EBIRR' ? 'E-Birr' : selectedSale.payment_method}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        selectedSale.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedSale.payment_status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedSale.payment_status === 'PAID'
                        ? 'PAID IN FULL'
                        : selectedSale.payment_status === 'PARTIALLY_PAID'
                        ? 'PARTIAL PAYMENT'
                        : 'CREDIT / UNPAID'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Attendant Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Customer Information
                  </span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    {selectedSale.customer_name}
                    {selectedSale.customer_id && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        Registered
                      </span>
                    )}
                  </div>
                  {selectedSale.customer_phone && (
                    <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                      Phone: {selectedSale.customer_phone}
                    </div>
                  )}
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Sales Channel: {selectedSale.sale_category || 'Retail / Walk-in'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Attendant / Cashier
                  </span>
                  <div className="font-semibold text-slate-800">
                    {selectedSale.cashier_name || 'Staff Member'}
                  </div>
                  {selectedSale.notes && (
                    <div className="text-slate-500 text-[11px] mt-1 italic">
                      Note: "{selectedSale.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5 text-center w-24">Quantity</th>
                      <th className="py-2.5 text-right w-28">Unit Price</th>
                      <th className="py-2.5 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {saleItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-semibold text-slate-800">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 text-center font-mono font-medium text-slate-700">
                          {item.quantity} {item.product_unit}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-600">
                          {Number(item.unit_price).toLocaleString()} ETB
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {Number(item.subtotal).toLocaleString()} ETB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-right text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{selectedSale.subtotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Net Sale Total:</span>
                  <span className="text-base text-blue-700 font-mono">
                    {selectedSale.total_amount.toLocaleString()} ETB
                  </span>
                </div>
                {selectedSale.payment_method === 'CREDIT' && (
                  <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Paid Upfront:</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {(Number(selectedSale.paid_amount) || 0).toLocaleString()} ETB
                      </span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold text-xs">
                      <span>Remaining Credit Due:</span>
                      <span className="font-mono">
                        {(Number(selectedSale.due_amount) || 0).toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Finance Authorization Card (Inside Details Page) */}
              <div className="pt-3 border-t border-slate-200">
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    selectedSale.is_finance_verified
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {selectedSale.is_finance_verified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">
                        {selectedSale.is_finance_verified
                          ? 'Finance Verified & Authorized'
                          : 'Pending Finance Authorization'}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {selectedSale.is_finance_verified
                          ? `Payment verified by ${selectedSale.finance_verified_by_name || 'Finance Officer'}${
                              selectedSale.finance_verified_at
                                ? ` on ${new Date(selectedSale.finance_verified_at).toLocaleString()}`
                                : ''
                            }`
                          : 'Finance has not yet authorized and verified cash/payment receipt for this invoice.'}
                      </div>
                    </div>
                  </div>

                  {canVerifyFinance && (
                    <button
                      type="button"
                      onClick={() => handleToggleFinanceVerify(selectedSale.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 ${
                        selectedSale.is_finance_verified
                          ? 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {selectedSale.is_finance_verified ? 'Revoke Verification' : 'Verify Cash Received'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
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
            <b>Manager Privilege:</b> Correct products sold, decimal quantities, prices, customer details, or payment channel for receipt #{editingSale?.sale_code}. Inventory batches, customer credit balance, and cash flow ledger will automatically re-synchronize.
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
                <option value="EBIRR">E-Birr</option>
                <option value="BANK_TRANSFER">Bank (CBE)</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
          </div>

          {/* Products & Quantities Line Items Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Products Sold & Quantities
              </label>
              <button
                type="button"
                onClick={addEditItem}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-2.5">Product</th>
                    <th className="py-2 px-2.5 w-24">Qty</th>
                    <th className="py-2 px-2.5 w-28">Unit Price</th>
                    <th className="py-2 px-2.5 text-right w-24">Subtotal</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editItems.map((item, idx) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateEditItem(idx, 'product_id', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => updateEditItem(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono text-center focus:ring-1 focus:ring-blue-500"
                            placeholder="Qty"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateEditItem(idx, 'unit_price', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono text-right focus:ring-1 focus:ring-blue-500"
                              placeholder="Price"
                              required
                            />
                            <span className="text-[10px] text-slate-400">ETB</span>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-800">
                          {lineTotal.toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeEditItem(idx)}
                            disabled={editItems.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Recalculated Net Total:</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {editTotal.toLocaleString()} ETB
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Mistake Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Cashier selected wrong payment channel or product amount"
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

      {/* MODAL 4: QUICK ADD CUSTOMER */}
      <Modal
        isOpen={isQuickCustomerModalOpen}
        onClose={() => setIsQuickCustomerModalOpen(false)}
        title="Quick Register Customer / Client"
      >
        <form onSubmit={handleQuickAddCustomer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Customer / Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bole Sky Hotel or Abebe Kebede"
              value={quickCustomer.name}
              onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="0911..."
                value={quickCustomer.phone}
                onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Type</label>
              <select
                value={quickCustomer.customer_type}
                onChange={(e) =>
                  setQuickCustomer({ ...quickCustomer, customer_type: e.target.value as CustomerType })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="RETAIL">Retail Regular</option>
                <option value="HOTEL_CAFE">Hotel / Cafe / Restaurant</option>
                <option value="DISTRIBUTOR">Distributor / Agent</option>
                <option value="SUPERMARKET">Supermarket / Mart</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickCustomerModalOpen(false)}
              className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
            >
              Save & Select Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: DIRECT REPAYMENT / DEBT COLLECTION */}
      <Modal
        isOpen={!!repaymentSale}
        onClose={() => setRepaymentSale(null)}
        title={`Collect Debt Repayment: ${repaymentSale?.sale_code}`}
      >
        {repaymentSale && (
          <form onSubmit={handleCollectRepayment} className="space-y-4 text-xs">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Debtor / Customer:</span>
                <span className="font-bold text-slate-900">{repaymentSale.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sale Total Amount:</span>
                <span className="font-semibold">{repaymentSale.total_amount.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-rose-200/80">
                <span className="font-semibold text-rose-800">Remaining Balance Due:</span>
                <span className="font-bold text-rose-700 text-sm">
                  {(repaymentSale.due_amount || 0).toLocaleString()} ETB
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Repayment Amount (ETB) *</label>
              <input
                type="number"
                required
                min="1"
                max={repaymentSale.due_amount || undefined}
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                placeholder="Enter paid amount"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={repaymentMethod}
                  onChange={(e) => setRepaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="EBIRR">E-Birr</option>
                  <option value="BANK_TRANSFER">Bank CBE</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt / Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. CBE Slip / Telebirr Txn"
                  value={repaymentRef}
                  onChange={(e) => setRepaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRepaymentSale(null)}
                className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRepayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
              >
                {submittingRepayment ? 'Recording...' : 'Record Payment & Settle'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
