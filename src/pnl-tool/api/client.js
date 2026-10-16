/**
 * Standalone P&L Analyzer API Client
 * Connects to MongoDB backend for Auth, Razorpay Subscriptions, Batches, Products, and Admin
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '') + '/pnl';

export function getPnlToken() {
  return localStorage.getItem('pnl_token') || '';
}

export function setPnlSession(token, user) {
  if (token) localStorage.setItem('pnl_token', token);
  if (user) {
    localStorage.setItem('pnl_user', JSON.stringify(user));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pnl_user_changed', { detail: user }));
    }
  }
}

export function getPnlUser() {
  try {
    const raw = localStorage.getItem('pnl_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPnlSession() {
  localStorage.removeItem('pnl_token');
  localStorage.removeItem('pnl_user');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pnl_user_changed', { detail: null }));
  }
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const token = getPnlToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    // If backend isn't running or MongoDB is unreachable in local-dev preview, handle gracefully
    console.warn(`[PnlApi] ${endpoint}:`, err.message);
    throw err;
  }
}

export const pnlApi = {
  // Auth
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/auth/me'),

  // Subscriptions & Razorpay
  getPlans: () => apiRequest('/billing/plans'),
  createOrder: (planId) => apiRequest('/billing/create-order', { method: 'POST', body: JSON.stringify({ planId }) }),
  verifyPayment: (payload) => apiRequest('/billing/verify-payment', { method: 'POST', body: JSON.stringify(payload) }),

  // Batches & Rows
  createBatch: (payload) => apiRequest('/batches', { method: 'POST', body: JSON.stringify(payload) }),
  getBatches: () => apiRequest('/batches'),
  getBatchRows: (batchId, page = 1, limit = 50) => apiRequest(`/batches/${batchId}/rows?page=${page}&limit=${limit}`),

  // Orders
  saveOrders: (batchId, orderLines) => apiRequest('/orders/bulk', { method: 'POST', body: JSON.stringify({ batchId, orderLines }) }),
  getOrders: (params = {}) => {
    const qry = new URLSearchParams(params).toString();
    return apiRequest(`/orders?${qry}`);
  },

  // Products
  getProducts: () => apiRequest('/products'),
  saveProduct: (product) => apiRequest('/products', { method: 'POST', body: JSON.stringify(product) }),
  saveBulkProducts: (products) => apiRequest('/products/bulk', { method: 'POST', body: JSON.stringify({ products }) }),

  // Templates & Rules
  getTemplates: () => apiRequest('/templates'),
  saveTemplate: (template) => apiRequest('/templates', { method: 'POST', body: JSON.stringify(template) }),
  getRules: () => apiRequest('/rules'),
  saveRule: (rule) => apiRequest('/rules', { method: 'POST', body: JSON.stringify(rule) }),

  // Admin Dashboard
  getAdminStats: () => apiRequest('/admin/stats'),
  getAdminUsers: () => apiRequest('/admin/users'),
  updateUserPlan: (userId, payload) => apiRequest(`/admin/users/${userId}/plan`, { method: 'PUT', body: JSON.stringify(payload) }),
  getAdminPayments: () => apiRequest('/admin/payments'),
  seedTemplates: () => apiRequest('/admin/seed-templates', { method: 'POST' }),
};
