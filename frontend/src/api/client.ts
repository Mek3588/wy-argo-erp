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
  getMe: () => request<{ user: User }>('/auth/me'),

  // Users & Roles
  getUsers: () => request<{ users: User[] }>('/users'),
  createUser: (userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role: Role;
  }) =>
    request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  updateUser: (id: number, data: Partial<User> & { password?: string }) =>
    request<{ message: string; user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: number) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Inventory
  getProducts: () => request<{ products: Product[] }>('/inventory/products'),
  createProduct: (data: Partial<Product>) =>
    request<{ message: string; product: Product }>('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id: number, data: Partial<Product>) =>
    request<{ message: string; product: Product }>(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getBatches: () => request<{ batches: Batch[] }>('/inventory/batches'),
  createBatch: (data: {
    product_id: number;
    batch_number: string;
    quantity: number;
    production_date: string;
    expiry_date: string;
    cost_per_unit: number;
  }) =>
    request<{ message: string; batch: Batch }>('/inventory/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adjustInventory: (data: {
    batch_id: number;
    quantity: number;
    type: 'SPOILAGE_WASTE' | 'ADJUSTMENT';
    reason: string;
  }) =>
    request<{ message: string }>('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getInventoryLogs: () => request<{ logs: InventoryLog[] }>('/inventory/logs'),

  // Sales
  getSales: () => request<{ sales: Sale[] }>('/sales'),
  getSaleDetails: (id: number) => request<{ sale: Sale; items: any[] }>(`/sales/${id}`),
  createSale: (saleData: {
    customer_name?: string;
    customer_phone?: string;
    payment_method: string;
    discount?: number;
    notes?: string;
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>;
  }) =>
    request<{ message: string; sale: Sale }>('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
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
