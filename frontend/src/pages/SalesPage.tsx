import React, { useEffect, useState } from 'react';
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
  CreditCard,
  DollarSign,
  Smartphone,
  Eye,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export const SalesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<Sale | null>(null);

  // History detail modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, saleRes] = await Promise.all([api.getProducts(), api.getSales()]);
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
  }, []);

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
        alert(`Product "${product.name}" is out of stock!`);
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

  // Calculations
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
    setLoadingDetails(true);
    try {
      const res = await api.getSaleDetails(sale.id);
      setSaleItems(res.items);
    } catch (err: any) {
      alert(`Failed to load items: ${err.message}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales & Cashier Counter</h2>
          <p className="text-sm text-slate-500">
            Process counter orders, issue receipts, and update cash flow automatically.
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
            POS Register
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
            Sales Receipts ({sales.length})
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
                          {stock} {p.unit} left
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
            <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-slate-100 my-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Cart is empty. Select dairy products from the left to begin.
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

            {/* Customer & Checkout Form */}
            <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Customer</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+251..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
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

      {/* SALES HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{s.sale_code}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{s.created_at}</td>
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
                      <button
                        onClick={() => viewSaleDetails(s)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: SALE DETAILS / RECEIPT */}
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
                  <th className="py-2">Batch</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saleItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium text-slate-800">{item.product_name}</td>
                    <td className="py-2 font-mono text-slate-500">{item.batch_number || '-'}</td>
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

      {/* SUCCESS MODAL POPUP */}
      <Modal
        isOpen={!!saleSuccess}
        onClose={() => setSaleSuccess(null)}
        title="Sale Recorded Successfully!"
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">
            {saleSuccess?.total_amount.toLocaleString()} ETB Succeeded
          </h4>
          <p className="text-xs text-slate-500">
            Receipt #{saleSuccess?.sale_code} settled via {saleSuccess?.payment_method}. Dairy stock
            automatically deducted using First-Expired-First-Out batches, and Cash Flow ledger updated!
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
