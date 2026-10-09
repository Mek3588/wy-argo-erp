import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Product, Batch, InventoryLog, DairyCategory, DairyUnit } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Package,
  Plus,
  AlertTriangle,
  Clock,
  Layers,
  History,
  Trash2,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN', 'MANAGER', 'INVENTORY_CLERK');

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'batches' | 'logs'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<Batch | null>(null);

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
  });

  const [batchForm, setBatchForm] = useState({
    product_id: 0,
    batch_number: '',
    quantity: 50,
    production_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    cost_per_unit: 0,
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 1,
    type: 'SPOILAGE_WASTE' as 'SPOILAGE_WASTE' | 'ADJUSTMENT',
    reason: 'Sour / Curdled during storage',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, batchRes, logRes] = await Promise.all([
        api.getProducts(),
        api.getBatches(),
        api.getInventoryLogs(),
      ]);
      setProducts(prodRes.products);
      setBatches(batchRes.batches);
      setLogs(logRes.logs);
      if (prodRes.products.length > 0 && batchForm.product_id === 0) {
        setBatchForm((prev) => ({
          ...prev,
          product_id: prodRes.products[0].id,
          cost_per_unit: prodRes.products[0].unit_cost,
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

  // Filtered Products
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
      });
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle Stock-In Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBatch(batchForm);
      setIsBatchModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle Adjust / Spoilage
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;
    try {
      await api.adjustInventory({
        batch_id: selectedBatchForAdjust.id,
        quantity: Number(adjustForm.quantity),
        type: adjustForm.type,
        reason: adjustForm.reason,
      });
      setIsAdjustModalOpen(false);
      setSelectedBatchForAdjust(null);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dairy Inventory & Perishables</h2>
          <p className="text-sm text-slate-500">
            Track fresh dairy stock levels, batch shelf-life & FEFO inventory dispatch.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Stock-In Batch
            </button>
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-xs"
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
          Product Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('batches')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeSubTab === 'batches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Dairy Batches & Freshness ({batches.filter((b) => b.status === 'ACTIVE').length})
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

      {/* TAB 1: PRODUCTS */}
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
                    <th className="py-3 px-4">SKU & Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Cost / Selling</th>
                    <th className="py-3 px-4">Min Reorder</th>
                    <th className="py-3 px-4 text-center">Active Batches</th>
                    <th className="py-3 px-4 text-right">In Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
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
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.unit_price} ETB</div>
                          <div className="text-xs text-slate-400">Cost: {p.unit_cost} ETB</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {p.min_stock_level} {p.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                            {p.active_batches_count ?? 0} batches
                          </span>
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
                              Healthy
                            </span>
                          )}
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

      {/* TAB 2: DAIRY BATCHES */}
      {activeSubTab === 'batches' && (
        <div className="space-y-4">
          <div className="bg-blue-50/60 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="font-bold">Dairy Quality Note: </span>
              WY Argo ERP dispatches dairy products on First-Expired-First-Out (FEFO) logic to prevent spoilage.
            </div>
            <span className="font-mono text-blue-700 font-semibold">Today: {new Date().toISOString().split('T')[0]}</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Dairy Item</th>
                    <th className="py-3 px-4">Production Date</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Freshness / Shelf Life</th>
                    <th className="py-3 px-4 text-right">Remaining Stock</th>
                    {canEdit && <th className="py-3 px-4 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {batches.map((b) => {
                    const days = b.days_to_expiry ?? 0;
                    const isExpired = days < 0 || b.status === 'EXPIRED';
                    const isExpiringSoon = days >= 0 && days <= 3 && b.status === 'ACTIVE';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {b.batch_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{b.product_name}</div>
                          <div className="text-xs text-slate-400">{b.product_sku}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{b.production_date}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{b.expiry_date}</td>
                        <td className="py-3 px-4">
                          {isExpired ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              Expired ({Math.abs(days)}d ago)
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              Expiring in {days} day{days === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Fresh ({days}d remaining)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-slate-900">
                            {b.current_quantity} / {b.initial_quantity} {b.product_unit}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-center">
                            {b.current_quantity > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedBatchForAdjust(b);
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                              >
                                Spoilage / Adjust
                              </button>
                            )}
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

      {/* TAB 3: LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Product & Batch</th>
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
                      <div className="text-xs font-mono text-slate-400">{l.batch_number || 'No batch'}</div>
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

      {/* MODAL 2: STOCK-IN BATCH */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Stock-In New Dairy Batch"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Dairy Product</label>
            <select
              required
              value={batchForm.product_id}
              onChange={(e) => {
                const pid = Number(e.target.value);
                const prod = products.find((p) => p.id === pid);
                setBatchForm({
                  ...batchForm,
                  product_id: pid,
                  cost_per_unit: prod ? prod.unit_cost : batchForm.cost_per_unit,
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) - {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Code / Number</label>
              <input
                required
                type="text"
                placeholder={`BATCH-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`}
                value={batchForm.batch_number}
                onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Intake Quantity</label>
              <input
                required
                type="number"
                min="1"
                step="0.5"
                value={batchForm.quantity}
                onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Production Date</label>
              <input
                required
                type="date"
                value={batchForm.production_date}
                onChange={(e) => setBatchForm({ ...batchForm, production_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                required
                type="date"
                value={batchForm.expiry_date}
                onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Per Unit (ETB)</label>
            <input
              required
              type="number"
              min="0"
              step="0.5"
              value={batchForm.cost_per_unit}
              onChange={(e) => setBatchForm({ ...batchForm, cost_per_unit: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
            >
              Stock-In Batch
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADJUST / SPOILAGE */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedBatchForAdjust(null);
        }}
        title={`Record Spoilage / Adjustment for ${selectedBatchForAdjust?.batch_number}`}
      >
        <form onSubmit={handleAdjustInventory} className="space-y-4 text-sm">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            Current batch stock available:{' '}
            <span className="font-bold">
              {selectedBatchForAdjust?.current_quantity} {selectedBatchForAdjust?.product_unit}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="SPOILAGE_WASTE">Spoilage / Curdled / Leak</option>
                <option value="ADJUSTMENT">Inventory Count Audit Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Deduct</label>
              <input
                required
                type="number"
                min="0.1"
                max={selectedBatchForAdjust?.current_quantity || 1}
                step="0.5"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Reason</label>
            <input
              required
              type="text"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAdjustModalOpen(false);
                setSelectedBatchForAdjust(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold shadow-xs"
            >
              Confirm Deduction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
