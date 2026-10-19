export type UserRole = string;

export interface User {
  id: number;
  full_name?: string;
  name?: string;
  username?: string;
  email?: string;
  role: string;
  phone?: string;
}

export interface StaffMember {
  id: number;
  full_name?: string;
  name?: string;
  username?: string;
  role: string;
  phone?: string;
  is_active?: number;
}

export interface Product {
  id: number;
  sku?: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  unit_price?: number;
  selling_price?: number;
  current_stock: number;
  min_stock_level?: number;
  min_threshold?: number;
  description?: string;
}

export interface SaleItem {
  id?: number;
  product_id: number;
  product_name?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
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
  created_at: string;
}

export interface Sale {
  id: number;
  sale_code?: string;
  receipt_number: string;
  cashier_name: string;
  cashier_id: number;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method: string;
  payment_status?: string;
  paid_amount?: number;
  due_amount?: number;
  due_date?: string;
  sale_category: string;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface Expense {
  id: number;
  category: string;
  title: string;
  amount: number;
  payment_method: string;
  paid_to?: string;
  receipt_number?: string;
  notes?: string;
  recorded_by_name: string;
  created_at: string;
}

export interface CashFlowSummary {
  summary?: {
    total_in: number;
    total_out: number;
    net_balance: number;
  };
  by_method?: Array<{
    payment_method: string;
    in_amount?: number;
    out_amount?: number;
    balance: number;
  }>;
  balance?: number;
  total_inflow?: number;
  total_outflow?: number;
  cash_in_hand?: number;
  bank_balance?: number;
  telebirr_balance?: number;
}

export interface DashboardStats {
  salesToday?: { total: number; count: number };
  salesThisMonth?: { total: number; count: number };
  expensesThisMonth?: { total: number; count: number };
  cashTotals?: { total_in: number; total_out: number; net_cash: number };
  inventory?: {
    activeProductsCount: number;
    totalStockQty: number;
    lowStockProductsCount: number;
    lowStockProducts: any[];
  };
  recentSales?: Array<{
    id: number;
    sale_code?: string;
    receipt_number?: string;
    customer_name?: string;
    customer_phone?: string;
    payment_method: string;
    payment_status?: string;
    subtotal?: number;
    total_amount: number;
    created_at: string;
    cashier_name?: string;
    sale_category?: string;
  }>;
  recentExpenses?: any[];

  // Fallbacks
  today_sales?: number;
  today_transactions?: number;
  monthly_revenue?: number;
  low_stock_count?: number;
  cash_in_hand?: number;
  recent_sales?: any[];
}

