export type Role = 'ADMIN' | 'MANAGER' | 'SALES_CASHIER' | 'INVENTORY_CLERK' | 'FINANCE';

export interface StaffMember {
  id: number;
  username: string;
  full_name: string;
  role: Role;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: number;
  has_pin?: number;
  created_at: string;
}

export type DairyCategory = 'Milk' | 'Cheese' | 'Butter' | 'Yogurt' | 'Cream' | 'Other';
export type DairyUnit = 'Liter' | 'Kg' | 'Pack' | 'Bottle' | 'Pcs';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: DairyCategory;
  unit: DairyUnit;
  min_stock_level: number;
  unit_cost: number;
  unit_price: number;
  description?: string;
  is_active: number;
  current_stock?: number;
  active_batches_count?: number;
  expired_stock?: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  product_id: number;
  batch_number: string;
  initial_quantity: number;
  current_quantity: number;
  production_date: string;
  expiry_date: string;
  cost_per_unit: number;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
  supplier_id?: number;
  supplier_name?: string;
  supplier_full_name?: string;
  supplier_phone?: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  product_unit?: string;
  unit?: string;
  days_to_expiry?: number;
  days_left?: number;
}

export interface InventoryLog {
  id: number;
  product_id: number;
  batch_id?: number;
  type: 'STOCK_IN' | 'SALE' | 'SPOILAGE_WASTE' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  supplier_id?: number;
  supplier_name?: string;
  user_name?: string;
  product_name?: string;
  product_unit?: string;
  batch_number?: string;
  created_at: string;
}

export type SupplierCategory = 'RAW_MILK' | 'PACKAGING' | 'FEED_FODDER' | 'EQUIPMENT_INGREDIENTS' | 'OTHER';

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  category: SupplierCategory;
  address?: string;
  notes?: string;
  is_active: number;
  batches_supplied_count?: number;
  total_units_supplied?: number;
  created_at: string;
}

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'HOTEL_CAFE' | 'DISTRIBUTOR' | 'STAFF';

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: CustomerType;
  credit_limit: number;
  current_balance: number;
  notes?: string;
  is_active: number;
  total_orders_count?: number;
  total_spent?: number;
  created_at: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  sale_id?: number;
  amount: number;
  payment_method: PaymentMethod;
  receipt_ref?: string;
  notes?: string;
  collected_by_name?: string;
  created_at: string;
}

export type PaymentMethod = 'CASH' | 'TELEBIRR' | 'BANK_TRANSFER' | 'CREDIT';

export interface SaleItem {
  id?: number;
  product_id: number;
  batch_id?: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name?: string;
  product_unit?: string;
  batch_number?: string;
}

export interface Sale {
  id: number;
  sale_code: string;
  customer_id?: number;
  customer_name: string;
  customer_phone?: string;
  registered_customer_name?: string;
  customer_type?: CustomerType;
  customer_balance?: number;
  sale_category?: string;
  payment_method: PaymentMethod;
  payment_status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount?: number;
  due_amount?: number;
  due_date?: string;
  recorded_by_user_id?: number;
  cashier_name?: string;
  item_count?: number;
  items_summary?: string;
  is_finance_verified?: number;
  finance_verified_at?: string;
  finance_verified_by_user_id?: number;
  finance_verified_by_name?: string;
  notes?: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'RAW_MILK_PROCUREMENT'
  | 'FEED_FODDER'
  | 'PACKAGING_MATERIALS'
  | 'COLD_CHAIN_ELECTRICITY'
  | 'TRANSPORT_LOGISTICS'
  | 'STAFF_WAGES'
  | 'EQUIPMENT_MAINTENANCE'
  | 'SUPPLIES_OTHER';

export interface Expense {
  id: number;
  expense_code: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  vendor_name?: string;
  recorded_by_name?: string;
  receipt_ref?: string;
  notes?: string;
  created_at: string;
}

export interface CashTransaction {
  id: number;
  type: 'IN' | 'OUT';
  source: 'SALE' | 'EXPENSE' | 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAWAL' | 'CAPITAL';
  reference_id?: number;
  amount: number;
  payment_method: PaymentMethod;
  description: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface CashSummary {
  summary: {
    total_in: number;
    total_out: number;
    net_balance: number;
  };
  by_method: Array<{
    payment_method: string;
    in_amount: number;
    out_amount: number;
    balance: number;
  }>;
  in_by_source: Array<{
    source: string;
    amount: number;
  }>;
  out_by_category: Array<{
    category: string;
    amount: number;
  }>;
}

export interface DashboardStats {
  salesToday: { total: number; count: number };
  salesThisMonth: { total: number; count: number };
  expensesThisMonth: { total: number; count: number };
  cashTotals: { total_in: number; total_out: number; net_cash: number };
  inventory: {
    activeProductsCount: number;
    totalStockQty?: number;
    lowStockProductsCount: number;
    lowStockProducts: Product[];
  };
  recentSales: Sale[];
  recentExpenses: Expense[];
}
