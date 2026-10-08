const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('gst_token') || '';
}

export function setAuthSession(token, user, business) {
  if (token) localStorage.setItem('gst_token', token);
  if (user) localStorage.setItem('gst_user', JSON.stringify(user));
  if (business) localStorage.setItem('gst_active_business', JSON.stringify(business));
}

export function clearAuthSession() {
  localStorage.removeItem('gst_token');
  localStorage.removeItem('gst_user');
  localStorage.removeItem('gst_active_business');
}

export function getActiveUser() {
  try {
    const raw = localStorage.getItem('gst_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getActiveBusiness() {
  try {
    const raw = localStorage.getItem('gst_active_business');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveBusiness(business) {
  if (business) {
    localStorage.setItem('gst_active_business', JSON.stringify(business));
  }
}

async function request(endpoint, options = {}) {
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'API Request Failed');
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const gstApi = {
  // --- Auth Endpoints ---
  async signup(payload) {
    const res = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthSession(res.token, res.user, res.business);
    return res;
  },

  async login(payload) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthSession(res.token, res.user, res.business);
    return res;
  },

  async getMe() {
    return request('/auth/me');
  },

  logout() {
    clearAuthSession();
  },

  // --- Business Endpoints ---
  async validateGstin(gstin) {
    return request('/businesses/validate-gstin', {
      method: 'POST',
      body: JSON.stringify({ gstin }),
    });
  },

  async getBusinesses() {
    return request('/businesses');
  },

  async createBusiness(payload) {
    return request('/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateBusiness(id, payload) {
    return request(`/businesses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteBusiness(id) {
    return request(`/businesses/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Upload Endpoints ---
  async uploadFile({ file, platform, businessId, period }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', platform);
    formData.append('businessId', businessId);
    formData.append('period', period);

    return request('/uploads', {
      method: 'POST',
      body: formData,
    });
  },

  async getUploads(businessId, period) {
    const params = new URLSearchParams();
    if (businessId) params.append('businessId', businessId);
    if (period) params.append('period', period);
    return request(`/uploads?${params.toString()}`);
  },

  async deleteUpload(id) {
    return request(`/uploads/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Return Endpoints ---
  async generateReturn({ businessId, period }) {
    return request('/returns/generate', {
      method: 'POST',
      body: JSON.stringify({ businessId, period }),
    });
  },

  async getReturnSummary(reportId) {
    return request(`/returns/${reportId}/summary`);
  },

  async getReturnHistory() {
    return request('/returns/history');
  },

  getJsonDownloadUrl(reportId) {
    const token = getToken();
    return `${API_BASE}/returns/${reportId}/download/json?token=${encodeURIComponent(token)}`;
  },

  getExcelDownloadUrl(reportId) {
    const token = getToken();
    return `${API_BASE}/returns/${reportId}/download/excel?token=${encodeURIComponent(token)}`;
  },

  async downloadReturnFile(reportId, type) {
    const token = getToken();
    const url = `${API_BASE}/returns/${reportId}/download/${type}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Failed to download file');
    }

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = type === 'json' ? `GSTR1_${reportId}.json` : `GSTR1_${reportId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
  },

  // --- Billing Endpoints ---
  async getBillingPlans() {
    return request('/billing/plans');
  },

  async createBillingOrder(planId) {
    return request('/billing/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  },

  async verifyPayment(details) {
    return request('/billing/verify', {
      method: 'POST',
      body: JSON.stringify(details),
    });
  },

  async getInvoices() {
    return request('/billing/invoices');
  },

  // --- Admin Endpoints ---
  async getAdminStats() {
    return request('/admin/stats');
  },

  async getAdminCustomers() {
    return request('/admin/customers');
  },

  async updateCustomerPlan(userId, payload) {
    return request(`/admin/customers/${userId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomer(userId) {
    return request(`/admin/customers/${userId}`, {
      method: 'DELETE',
    });
  },
};
