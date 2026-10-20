import {
  User,
  Product,
  Batch,
  InventoryLog,
  Sale,
  Expense,
  CashTransaction,
  CashSummary,
  DashboardStats,
  Role,
} from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('wy_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('wy_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('wy_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (login: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  getStaffList: () => request<{ staff: import('../types').StaffMember[] }>('/auth/staff-list'),
  pinLogin: (pin: string, user_id?: number) =>
    request<{ token: string; user: User; message: string }>('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ pin, user_id }),
    }),
  getMe: () => request<{ user: User }>('/auth/me'),

  // Users & Roles
  getUsers: () => request<{ users: User[] }>('/users'),
  createUser: (userData: {
    username: string;
    email: string;
    password?: string;
    pin?: string;
    full_name: string;
    role: Role;
  }) =>
    request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  updateUser: (id: number, data: Partial<User> & { password?: string; pin?: string }) =>
    request<{ message: string; user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: number) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Suppliers
  getSuppliers: () => request<{ suppliers: import('../types').Supplier[] }>('/suppliers'),
  getSupplierDetails: (id: number) =>
    request<{ supplier: import('../types').Supplier; batches: Batch[] }>(`/suppliers/${id}`),
  createSupplier: (data: Partial<import('../types').Supplier>) =>
    request<{ message: string; supplier: import('../types').Supplier }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: number, data: Partial<import('../types').Supplier>) =>
    request<{ message: string; supplier: import('../types').Supplier }>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: number) =>
    request<{ message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // Customers & Accounts Receivable
  getCustomers: (params?: { search?: string; type?: string; has_debt?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);
    if (params?.has_debt) query.append('has_debt', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ customers: import('../types').Customer[] }>(`/customers${qs}`);
  },
  getCustomerDetails: (id: number) =>
    request<{
      customer: import('../types').Customer;
      sales: Sale[];
      payments: import('../types').CustomerPayment[];
    }>(`/customers/${id}`),
  createCustomer: (data: Partial<import('../types').Customer>) =>
    request<{ message: string; customer: import('../types').Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: number, data: Partial<import('../types').Customer>) =>
    request<{ message: string; customer: import('../types').Customer }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  recordCustomerPayment: (
    customerId: number,
    data: {
      amount: number;
      payment_method: string;
      receipt_ref?: string;
      notes?: string;
      sale_id?: number;
    }
  ) =>
    request<{ message: string; payment_id: number; new_balance: number }>(`/customers/${customerId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReceivablesSummary: () =>
    request<{
      summary: { total_receivables: number; debtor_count: number; over_limit_count: number };
      top_debtors: import('../types').Customer[];
      pending_credit_sales: Sale[];
    }>('/customers/receivables/summary'),

  // Inventory
  getProducts: () => request<{ products: Product[] }>('/inventory/products'),
  getBatches: () => request<{ batches: Batch[] }>('/inventory/batches'),
  createProduct: (data: Partial<Product> & { initial_stock?: number }) =>
    request<{ message: string; product: Product }>('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id: number, data: Partial<Product>) =>
    request<{ message: string; product: Product }>(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: number) =>
    request<{ message: string; archived?: boolean; deleted?: boolean }>(`/inventory/products/${id}`, {
      method: 'DELETE',
    }),
  stockIn: (data: {
    product_id: number;
    quantity: number;
    cost_per_unit?: number;
    reference_note?: string;
    supplier_id?: number;
    supplier_name?: string;
    expiry_date?: string;
  }) =>
    request<{ message: string; batch_id?: number }>('/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adjustStock: (data: {
    product_id: number;
    quantity: number;
    reason: string;
  }) =>
    request<{ message: string }>('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getInventoryLogs: () => request<{ logs: InventoryLog[] }>('/inventory/logs'),

  // Sales
  getSales: (params?: { search?: string; date?: string; category?: string; status?: string; finance_status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.date) query.append('date', params.date);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.finance_status) query.append('finance_status', params.finance_status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ sales: Sale[] }>(`/sales${qs}`);
  },
  getSaleDetails: (id: number) => request<{ sale: Sale; items: any[] }>(`/sales/${id}`),
  createSale: (saleData: {
    customer_id?: number;
    customer_name?: string;
    customer_phone?: string;
    sale_category?: string;
    payment_method: string;
    upfront_payment_method?: string;
    paid_amount?: number;
    due_amount?: number;
    due_date?: string;
    discount?: number;
    notes?: string;
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>;
  }) =>
    request<{ message: string; sale: Sale }>('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    }),
  updateSale: (id: number, saleData: {
    customer_name?: string;
    customer_phone?: string;
    sale_category?: string;
    payment_method?: string;
    discount?: number;
    notes?: string;
    items?: Array<{ product_id: number; quantity: number; unit_price?: number }>;
  }) =>
    request<{ message: string; sale: Sale }>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(saleData),
    }),
  toggleFinanceVerify: (id: number) =>
    request<{ message: string; is_finance_verified: number; finance_verified_at: string; finance_verified_by_name: string }>(
      `/sales/${id}/finance-verify`,
      { method: 'PATCH' }
    ),
  bulkFinanceVerify: (sale_ids: number[]) =>
    request<{ message: string; count: number }>('/sales/finance-verify-bulk', {
      method: 'POST',
      body: JSON.stringify({ sale_ids }),
    }),

  // Expenses
  getExpenses: () => request<{ expenses: Expense[] }>('/expenses'),
  createExpense: (data: {
    title: string;
    category: string;
    amount: number;
    expense_date: string;
    payment_method: string;
    vendor_name?: string;
    receipt_ref?: string;
    notes?: string;
  }) =>
    request<{ message: string; expense: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteExpense: (id: number) =>
    request<{ message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Cash Flow
  getCashFlowSummary: () => request<CashSummary>('/cashflow/summary'),
  getCashTransactions: () => request<{ transactions: CashTransaction[] }>('/cashflow/transactions'),
  createCashTransaction: (data: {
    type: 'IN' | 'OUT';
    source: string;
    amount: number;
    payment_method: string;
    description: string;
  }) =>
    request<{ message: string; transaction: CashTransaction }>('/cashflow/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard Stats
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
};

