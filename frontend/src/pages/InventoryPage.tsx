import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Product, InventoryLog, DairyCategory, DairyUnit, Supplier, Batch, SupplierCategory } from '../types';
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
  Truck,
  Layers,
  Factory,
  Phone,
  MapPin,
  Edit2,
  Trash2,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN', 'MANAGER', 'INVENTORY_CLERK');
  const canManageProducts = hasRole('ADMIN', 'MANAGER');

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'batches' | 'logs' | 'suppliers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

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
    supplier_id: '' as number | '',
    custom_supplier_name: '',
    expiry_date: '',
    reference_note: 'Daily milk / product intake',
  });

  const [adjustForm, setAdjustForm] = useState({
    product_id: 0,
    quantity: 1,
    reason: 'Damaged packaging / spillage',
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    contact_person: '',
    category: 'RAW_MILK' as SupplierCategory,
    address: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, logRes, supRes, batchRes] = await Promise.all([
        api.getProducts(),
        api.getInventoryLogs(),
        api.getSuppliers(),
        api.getBatches(),
      ]);
      setProducts(prodRes.products);
      setLogs(logRes.logs);
      setSuppliers(supRes.suppliers || []);
      setBatches(batchRes.batches || []);
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

  // Open modal for Create Product
  const openCreateProduct = () => {
    setEditingProduct(null);
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
    setIsProductModalOpen(true);
  };

  // Open modal for Edit Product
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      sku: p.sku || '',
      name: p.name,
      category: p.category,
      unit: p.unit,
      min_stock_level: p.min_stock_level,
      unit_cost: p.unit_cost,
      unit_price: p.unit_price,
      description: p.description || '',
      initial_stock: 0,
    });
    setIsProductModalOpen(true);
  };

  // Handle Save (Create or Update) Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          sku: productForm.sku,
          name: productForm.name,
          category: productForm.category,
          unit: productForm.unit,
          min_stock_level: productForm.min_stock_level,
          unit_cost: productForm.unit_cost,
          unit_price: productForm.unit_price,
          description: productForm.description,
        });
      } else {
        await api.createProduct(productForm);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
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

  // Handle Delete / Archive Product
  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to delete product "${p.name}" (${p.sku})?\n\nIf this product has historical sales receipts, it will be safely archived to protect receipt records. If it has no sales history, it will be permanently deleted.`)) {
      return;
    }
    try {
      const res = await api.deleteProduct(p.id);
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message}`);
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
        supplier_id: stockInForm.supplier_id ? Number(stockInForm.supplier_id) : undefined,
        supplier_name: stockInForm.custom_supplier_name || undefined,
        expiry_date: stockInForm.expiry_date || undefined,
        reference_note: stockInForm.reference_note,
      });
      setIsStockInModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle Add Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;
    try {
      await api.createSupplier(supplierForm);
      setIsSupplierModalOpen(false);
      setSupplierForm({
        name: '',
        phone: '',
        contact_person: '',
        category: 'RAW_MILK',
        address: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      alert(`Error registering supplier: ${err.message}`);
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
      supplier_id: '',
      custom_supplier_name: '',
      expiry_date: '',
      reference_note: `Restock ${p.name}`,
    });
    setIsStockInModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Industrial Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider">
              COLD CHAIN LOGISTICS
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-emerald-600 font-semibold">Physical Stock Registry</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Dairy Inventory & Batch Stock Control
          </h2>
          <p className="text-xs text-slate-500">
            Monitor real-time warehouse stock on hand, record supplier intakes, and audit count adjustments.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsStockInModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs transition-colors"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Stock-In Intake</span>
            </button>
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold text-xs border border-slate-200 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Adjust</span>
            </button>
            <button
              onClick={openCreateProduct}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Product</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Enterprise Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 rounded-t-xl overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-3 font-mono font-bold text-xs border-b-2 transition-all shrink-0 ${
            activeSubTab === 'products'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products & Physical Stock ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('batches')}
          className={`flex items-center gap-2 px-4 py-3 font-mono font-bold text-xs border-b-2 transition-all shrink-0 ${
            activeSubTab === 'batches'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Intake Batches & Traceability ({batches.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-3 font-mono font-bold text-xs border-b-2 transition-all shrink-0 ${
            activeSubTab === 'suppliers'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Suppliers Directory ({suppliers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 font-mono font-bold text-xs border-b-2 transition-all shrink-0 ${
            activeSubTab === 'logs'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movement Audit Log</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS & STOCK */}
      {activeSubTab === 'products' && (
        <div className="space-y-3.5">
          {/* Integrated Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or SKU code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {['ALL', 'Milk', 'Cheese', 'Butter', 'Yogurt', 'Cream'].map((cat) => {
                const count = cat === 'ALL' ? products.length : products.filter((p) => p.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Data Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5 font-mono">SKU / Code</th>
                    <th className="py-2.5 px-3.5">Product Name</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">Unit Cost</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">Selling Price</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">Safety Point</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">On Hand Stock</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                    {canEdit && <th className="py-2.5 px-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const isLow = (p.current_stock ?? 0) <= p.min_stock_level;
                    const isOut = (p.current_stock ?? 0) === 0;

                    return (
                      <tr key={p.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-1.5 py-0.5 rounded">
                            {p.sku}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                          {p.description && <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.description}</div>}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 font-semibold tabular-nums">
                          {p.unit_cost.toFixed(2)} ETB
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {p.unit_price.toFixed(2)} ETB
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-slate-500 font-mono tabular-nums">
                          {p.min_stock_level} {p.unit}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <div className={`text-sm font-black font-mono tabular-nums ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {p.current_stock ?? 0} <span className="text-[10px] font-normal text-slate-500 font-sans">{p.unit}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Stockout
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Nominal
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openStockInForProduct(p)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                title="Restock Item"
                              >
                                + Restock
                              </button>
                              {canManageProducts && (
                                <>
                                  <button
                                    onClick={() => openEditProduct(p)}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors"
                                    title="Edit Product"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors"
                                    title="Delete or Archive Product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* TAB 2: FRESH BATCHES & TRACEABILITY */}
      {activeSubTab === 'batches' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 font-mono">Batch Number</th>
                  <th className="py-2.5 px-3.5">Product Name</th>
                  <th className="py-2.5 px-3.5">Producer / Supplier</th>
                  <th className="py-2.5 px-3.5">Intake Date</th>
                  <th className="py-2.5 px-3.5">Shelf Expiry</th>
                  <th className="py-2.5 px-3.5 text-right font-mono">Available Units</th>
                  <th className="py-2.5 px-3.5 text-right font-mono">Unit Cost</th>
                  <th className="py-2.5 px-3.5 text-center">Batch Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-mono text-xs">
                      No batch intakes recorded in the system yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-xs font-bold text-blue-700">
                        {b.batch_number}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-slate-900">{b.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.product_sku}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-slate-800">
                          {b.supplier_full_name || b.supplier_name || 'In-House Plant Chiller'}
                        </div>
                        {b.supplier_phone && (
                          <div className="text-[10px] text-slate-400 font-mono">{b.supplier_phone}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-slate-600 font-mono">{b.production_date}</td>
                      <td className="py-2.5 px-3.5 text-xs text-slate-600 font-mono">
                        {b.expiry_date === '2099-12-31' ? 'Standard Storage' : b.expiry_date}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-mono tabular-nums">
                        {b.current_quantity} / {b.initial_quantity} <span className="text-[10px] text-slate-500 font-sans">{b.product_unit}</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-700 font-mono text-xs tabular-nums font-semibold">
                        {b.cost_per_unit.toFixed(2)} ETB
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : b.status === 'DEPLETED'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-3.5">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">Raw Milk Producers & Vendor Directory</h3>
              <p className="text-xs text-slate-500">Farmers, collection centers, and dairy packaging suppliers.</p>
            </div>
            {canEdit && (
              <button
                onClick={() => setIsSupplierModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Supplier</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Supplier / Business</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5">Contact Person & Phone</th>
                    <th className="py-2.5 px-3.5">Facility Location</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">Batches</th>
                    <th className="py-2.5 px-3.5 text-right font-mono">Total Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {s.name}
                        {s.notes && <div className="text-[10px] text-slate-400 font-normal">{s.notes}</div>}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs">
                        <div className="font-semibold text-slate-800">{s.contact_person || 'Direct'}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{s.phone || '-'}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-slate-600">{s.address || '-'}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-700 tabular-nums">
                        {s.batches_supplied_count || 0} batches
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {(s.total_units_supplied || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 font-mono">Timestamp</th>
                  <th className="py-2.5 px-3.5">Movement Type</th>
                  <th className="py-2.5 px-3.5">Dairy Product</th>
                  <th className="py-2.5 px-3.5 text-right font-mono">Quantity</th>
                  <th className="py-2.5 px-3.5">Audit Reason / Voucher</th>
                  <th className="py-2.5 px-3.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((l) => (
                  <tr key={l.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">{l.created_at}</td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          l.type === 'STOCK_IN'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : l.type === 'SALE'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {l.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">
                      {l.product_name}
                    </td>
                    <td className={`py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-xs ${l.type === 'STOCK_IN' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {l.type === 'STOCK_IN' ? '+' : '-'}
                      {l.quantity} {l.product_unit}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 text-xs">{l.reason || '-'}</td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-800">{l.user_name || 'System Auto'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE OR EDIT PRODUCT */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Dairy Product: ${editingProduct.name}` : 'Add New Dairy Product'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-sm">
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

          <div className={`grid ${editingProduct ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
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
            {!editingProduct && (
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
            )}
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
              {editingProduct ? 'Save Product Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: STOCK-IN WITH SUPPLIER TRACKING */}
      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title="Stock In / Restock Inventory with Supplier Origin"
      >
        <form onSubmit={handleStockIn} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Dairy Product *</label>
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

          {/* Supplier origin selector */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Supplier / Outgrower Source
              </label>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Supplier
              </button>
            </div>
            <select
              value={stockInForm.supplier_id}
              onChange={(e) =>
                setStockInForm({ ...stockInForm, supplier_id: e.target.value ? Number(e.target.value) : '' })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
            >
              <option value="">-- In-House Dairy Farm (Own Production) --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            {!stockInForm.supplier_id && (
              <input
                type="text"
                placeholder="Or type custom producer / cooperative name (optional)"
                value={stockInForm.custom_supplier_name}
                onChange={(e) => setStockInForm({ ...stockInForm, custom_supplier_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Add *</label>
              <input
                required
                type="number"
                min="0.01"
                step="any"
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
                step="any"
                value={stockInForm.cost_per_unit}
                onChange={(e) => setStockInForm({ ...stockInForm, cost_per_unit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={stockInForm.expiry_date}
                onChange={(e) => setStockInForm({ ...stockInForm, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Note</label>
              <input
                type="text"
                placeholder="e.g. Morning chilled batch #12"
                value={stockInForm.reference_note}
                onChange={(e) => setStockInForm({ ...stockInForm, reference_note: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
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

      {/* MODAL 4: ADD SUPPLIER */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="Register Supplier / Outgrower"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Sululta Dairy Co-op or Ethio Pack"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Category</label>
              <select
                value={supplierForm.category}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, category: e.target.value as SupplierCategory })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="RAW_MILK">Raw Milk Farm / Outgrower</option>
                <option value="PACKAGING">Packaging Materials</option>
                <option value="FEED_FODDER">Feed & Fodder</option>
                <option value="EQUIPMENT_INGREDIENTS">Equipment & Cultures</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="0911..."
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="Representative name"
                value={supplierForm.contact_person}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Farm / Address Location</label>
              <input
                type="text"
                placeholder="Town / Region"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Delivery terms, collection time..."
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
            >
              Register Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
