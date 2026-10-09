import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Product, InventoryLog, DairyCategory, DairyUnit } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Package,
  Plus,
  AlertTriangle,
  History,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN', 'MANAGER', 'INVENTORY_CLERK');

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'logs'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    category: 'Milk' as DairyCategory,
    unit: 'Liter' as DairyUnit,
    min_stock_level: 20,
    unit_cost: 0,
    unit_price: 0,
    description: '',
    initial_stock: 0,
  });

  const [stockInForm, setStockInForm] = useState({
    product_id: 0,
    quantity: 50,
    cost_per_unit: 0,
    reference_note: 'Daily milk / product intake',
  });

  const [adjustForm, setAdjustForm] = useState({
    product_id: 0,
    quantity: 1,
    reason: 'Damaged packaging / spillage',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, logRes] = await Promise.all([
        api.getProducts(),
        api.getInventoryLogs(),
      ]);
      setProducts(prodRes.products);
      setLogs(logRes.logs);
      if (prodRes.products.length > 0 && stockInForm.product_id === 0) {
        setStockInForm((prev) => ({
          ...prev,
          product_id: prodRes.products[0].id,
          cost_per_unit: prodRes.products[0].unit_cost,
        }));
        setAdjustForm((prev) => ({
          ...prev,
          product_id: prodRes.products[0].id,
        }));
      }
    } catch (err: any) {
      alert(`Error loading inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle Add Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct(productForm);
      setIsProductModalOpen(false);
      setProductForm({
        sku: '',
        name: '',
        category: 'Milk',
        unit: 'Liter',
        min_stock_level: 20,
        unit_cost: 0,
        unit_price: 0,
        description: '',
        initial_stock: 0,
      });
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle Stock-In
  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.stockIn({
        product_id: stockInForm.product_id,
        quantity: Number(stockInForm.quantity),
        cost_per_unit: Number(stockInForm.cost_per_unit),
        reference_note: stockInForm.reference_note,
      });
      setIsStockInModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle Adjust
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adjustStock({
        product_id: adjustForm.product_id,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
      });
      setIsAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const openStockInForProduct = (p: Product) => {
    setStockInForm({
      product_id: p.id,
      quantity: 50,
      cost_per_unit: p.unit_cost,
      reference_note: `Restock ${p.name}`,
    });
    setIsStockInModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dairy Inventory & Stock</h2>
          <p className="text-sm text-slate-500">
            Monitor current physical stock on hand, record restocks, and log count adjustments.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStockInModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs"
            >
              <ArrowDownCircle className="w-4 h-4" />
              Stock In
            </button>
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border border-slate-200"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Adjust Stock
            </button>
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Product
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeSubTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Products & Stock on Hand ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeSubTab === 'logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Stock Movement Log
        </button>
      </div>

      {/* TAB 1: PRODUCTS & STOCK */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {['ALL', 'Milk', 'Cheese', 'Butter', 'Yogurt', 'Cream'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">SKU & Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Reorder Level</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {canEdit && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const isLow = (p.current_stock ?? 0) <= p.min_stock_level;
                    const isOut = (p.current_stock ?? 0) === 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="font-mono text-xs text-blue-600">{p.sku}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{p.unit_cost} ETB</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.unit_price} ETB</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {p.min_stock_level} {p.unit}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-base font-bold text-slate-900">
                            {p.current_stock ?? 0} {p.unit}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOut ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => openStockInForProduct(p)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              title="Restock Item"
                            >
                              + Restock
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Staff Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-500">{l.created_at}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          l.type === 'STOCK_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.type === 'SALE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{l.product_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {l.type === 'STOCK_IN' ? '+' : '-'}
                      {l.quantity} {l.product_unit}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{l.reason || '-'}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">{l.user_name || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE PRODUCT */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Add New Dairy Product"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU Code</label>
              <input
                required
                type="text"
                placeholder="e.g. MK-PAST-2L"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Category</label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value as DairyCategory })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Milk">Milk</option>
                <option value="Cheese">Cheese</option>
                <option value="Butter">Butter</option>
                <option value="Yogurt">Yogurt</option>
                <option value="Cream">Cream</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Fresh Low-Fat Milk (1L)"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value as DairyUnit })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Liter">Liter</option>
                <option value="Kg">Kg</option>
                <option value="Pack">Pack</option>
                <option value="Bottle">Bottle</option>
                <option value="Pcs">Pcs</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost (ETB)</label>
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={productForm.unit_cost}
                onChange={(e) => setProductForm({ ...productForm, unit_cost: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (ETB)</label>
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={productForm.unit_price}
                onChange={(e) => setProductForm({ ...productForm, unit_price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Reorder Level</label>
              <input
                type="number"
                min="1"
                value={productForm.min_stock_level}
                onChange={(e) => setProductForm({ ...productForm, min_stock_level: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Opening Stock</label>
              <input
                type="number"
                min="0"
                value={productForm.initial_stock}
                onChange={(e) => setProductForm({ ...productForm, initial_stock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: STOCK-IN */}
      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title="Stock In / Restock Inventory"
      >
        <form onSubmit={handleStockIn} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Dairy Product</label>
            <select
              required
              value={stockInForm.product_id}
              onChange={(e) => {
                const pid = Number(e.target.value);
                const prod = products.find((p) => p.id === pid);
                setStockInForm({
                  ...stockInForm,
                  product_id: pid,
                  cost_per_unit: prod ? prod.unit_cost : stockInForm.cost_per_unit,
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Current: {p.current_stock ?? 0} {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Add</label>
              <input
                required
                type="number"
                min="0.5"
                step="0.5"
                value={stockInForm.quantity}
                onChange={(e) => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost (ETB)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={stockInForm.cost_per_unit}
                onChange={(e) => setStockInForm({ ...stockInForm, cost_per_unit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Note</label>
            <input
              type="text"
              placeholder="e.g. Farm collection batch #40"
              value={stockInForm.reference_note}
              onChange={(e) => setStockInForm({ ...stockInForm, reference_note: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStockInModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold shadow-xs"
            >
              Confirm Stock In
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADJUST / DEDUCT */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Record Stock Adjustment / Deduction"
      >
        <form onSubmit={handleAdjustInventory} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product</label>
            <select
              required
              value={adjustForm.product_id}
              onChange={(e) => setAdjustForm({ ...adjustForm, product_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Current: {p.current_stock ?? 0} {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Deduct</label>
            <input
              required
              type="number"
              min="0.5"
              step="0.5"
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Adjustment</label>
            <input
              required
              type="text"
              placeholder="e.g. Spillage during transport, physical count audit"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold shadow-xs"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
