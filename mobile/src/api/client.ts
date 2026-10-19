import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Product, Sale, CashFlowSummary, DashboardStats, Expense, StaffMember, Supplier, Customer } from '../types';

const STORAGE_KEY_SERVER_URL = '@wy_argo_server_url';
const STORAGE_KEY_TOKEN = '@wy_argo_auth_token';

// Automatically pick sensible initial default: live production server with HTTPS
const getInitialDefaultUrl = (): string => {
  return 'https://84.247.131.118.sslip.io/api';
};

let currentServerUrl = getInitialDefaultUrl();
let currentAuthToken: string | null = null;

export const initApiClient = async (): Promise<string> => {
  try {
    let savedUrl = await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (savedUrl) {
      if (savedUrl.startsWith('http://84.247.131.118')) {
        savedUrl = 'https://84.247.131.118.sslip.io/api';
        await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, savedUrl);
      }
      currentServerUrl = savedUrl;
    }
    const savedToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken) {
      currentAuthToken = savedToken;
    }
  } catch (e) {
    console.warn('Error initializing api client from storage:', e);
  }
  return currentServerUrl;
};

export const getServerUrl = () => currentServerUrl;

export const setServerUrl = async (url: string) => {
  // Normalize URL - remove trailing slash
  const cleaned = url.trim().replace(/\/+$/, '');
  currentServerUrl = cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, currentServerUrl);
};

export const setAuthToken = async (token: string | null) => {
  currentAuthToken = token;
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
  }
};

export const getAuthToken = () => currentAuthToken;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${currentServerUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = (data && typeof data === 'object' && (data.error || data.message))
      ? (data.error || data.message)
      : `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// API Endpoints
export const api = {
  // Health
  checkHealth: async () => {
    return request<{ status: string; service: string }>('/health');
  },

  // Auth
  getStaffList: async (): Promise<StaffMember[]> => {
    const res = await request<{ staff: StaffMember[] }>('/auth/staff-list');
    return res.staff;
  },

  loginWithPin: async (pin: string, userId?: number) => {
    return request<{
      token: string;
      user: import('../types').User;
    }>('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ pin, user_id: userId }),
    });
  },

  // Products & Inventory
  getProducts: async (): Promise<Product[]> => {
    const res = await request<{ products: Product[] }>('/inventory/products');
    return res.products;
  },

  stockIn: async (payload: {
    product_id: number;
    quantity: number;
    unit_cost?: number;
    supplier?: string;
    supplier_id?: number;
    supplier_name?: string;
    expiry_date?: string;
    notes?: string;
  }) => {
    return request<{ message: string; product: Product }>('/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await request<{ suppliers: Supplier[] }>('/suppliers');
    return res.suppliers;
  },

  // Customers & Receivables
  getCustomers: async (search?: string): Promise<Customer[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await request<{ customers: Customer[] }>(`/customers${query}`);
    return res.customers;
  },

  recordCustomerPayment: async (
    customerId: number,
    payload: {
      amount: number;
      payment_method: string;
      receipt_ref?: string;
      sale_id?: number;
      notes?: string;
    }
  ) => {
    return request<{ message: string; balance_settled: number; remaining_balance: number }>(
      `/customers/${customerId}/payments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // Sales
  getSales: async (params?: { search?: string; category?: string; date?: string; status?: string }): Promise<Sale[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    if (params?.date) query.append('date', params.date);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{ sales: Sale[] }>(`/sales${queryString}`);
    return res.sales;
  },

  createSale: async (payload: {
    customer_id?: number;
    customer_name?: string;
    customer_phone?: string;
    sale_category: string;
    payment_method: string;
    upfront_payment_method?: string;
    paid_amount?: number;
    due_amount?: number;
    due_date?: string;
    discount?: number;
    notes?: string;
    items: { product_id: number; quantity: number; unit_price: number }[];
  }): Promise<{ message: string; sale: Sale }> => {
    return request<{ message: string; sale: Sale }>('/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateSale: async (
    id: number,
    payload: {
      customer_name?: string;
      customer_phone?: string;
      sale_category?: string;
      payment_method?: string;
      notes?: string;
    }
  ): Promise<{ message: string; sale: Sale }> => {
    return request<{ message: string; sale: Sale }>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    const res = await request<{ expenses: Expense[] }>('/expenses');
    return res.expenses;
  },

  createExpense: async (payload: {
    category: string;
    title: string;
    amount: number;
    payment_method: string;
    paid_to?: string;
    receipt_number?: string;
    notes?: string;
  }): Promise<{ message: string; expense: Expense }> => {
    return request<{ message: string; expense: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Cashflow & Dashboard
  getCashFlowSummary: async (): Promise<CashFlowSummary> => {
    const res = await request<any>('/cashflow/summary');
    return res;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await request<any>('/dashboard/stats');
    return res;
  },
};

