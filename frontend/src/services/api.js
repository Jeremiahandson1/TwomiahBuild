import { API_BASE_URL } from '../config/api.js';
const API_URL = API_BASE_URL;

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
    // accessToken is kept in memory only — never stored in localStorage.
    // refreshToken is stored in an httpOnly cookie (invisible to JS).
    this.accessToken = null;
  }

  setTokens(accessToken) {
    this.accessToken = accessToken;
  }

  clearTokens() {
    this.accessToken = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Send httpOnly cookies (refreshToken) automatically
      });

      // Handle 401 - try to refresh using httpOnly cookie
      if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.accessToken}`;
          return fetch(url, { ...options, headers, credentials: 'include' }).then(r => this.handleResponse(r));
        } else {
          this.clearTokens();
          // Only redirect if not already on an auth page
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.href = '/login';
          }
          throw new Error('Session expired');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    if (response.status === 204) return null;
    
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      const error = new Error(data?.error || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  }

  async refreshAccessToken() {
    try {
      // No body needed — refreshToken is sent automatically as httpOnly cookie
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      this.setTokens(data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  async register(data) {
    const result = await this.request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) });
    this.setTokens(result.accessToken);
    return result;
  }

  async login(email, password) {
    const result = await this.request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.setTokens(result.accessToken);
    return result;
  }

  async logout() {
    await this.request('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    this.clearTokens();
  }

  async getMe() {
    return this.request('/api/v1/auth/me');
  }

  async forgotPassword(email) {
    return this.request('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  }

  async resetPassword(token, password) {
    return this.request('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
  }

  // Generic CRUD
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`${endpoint}${query ? '?' + query : ''}`);
  }

  async getOne(endpoint, id) {
    return this.request(`${endpoint}/${id}`);
  }

  async create(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  async update(endpoint, id, data) {
    return this.request(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async delete(endpoint, id) {
    return this.request(`${endpoint}/${id}`, { method: 'DELETE' });
  }

  async action(endpoint, id, action, data = {}) {
    return this.request(`${endpoint}/${id}/${action}`, { method: 'POST', body: JSON.stringify(data) });
  }

  async post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  async put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Contacts
  contacts = {
    list: (params) => this.get('/api/v1/contacts', params),
    stats: () => this.get('/api/v1/contacts/stats'),
    get: (id) => this.getOne('/api/v1/contacts', id),
    create: (data) => this.create('/api/v1/contacts', data),
    update: (id, data) => this.update('/api/v1/contacts', id, data),
    delete: (id) => this.delete('/api/v1/contacts', id),
    convert: (id) => this.action('/api/v1/contacts', id, 'convert'),
  };

  // Projects
  projects = {
    list: (params) => this.get('/api/v1/projects', params),
    stats: () => this.get('/api/v1/projects/stats'),
    get: (id) => this.getOne('/api/v1/projects', id),
    create: (data) => this.create('/api/v1/projects', data),
    update: (id, data) => this.update('/api/v1/projects', id, data),
    delete: (id) => this.delete('/api/v1/projects', id),
  };

  // Jobs
  jobs = {
    list: (params) => this.get('/api/v1/jobs', params),
    today: () => this.get('/api/v1/jobs/today'),
    get: (id) => this.getOne('/api/v1/jobs', id),
    create: (data) => this.create('/api/v1/jobs', data),
    update: (id, data) => this.update('/api/v1/jobs', id, data),
    delete: (id) => this.delete('/api/v1/jobs', id),
    dispatch: (id) => this.action('/api/v1/jobs', id, 'dispatch'),
    start: (id) => this.action('/api/v1/jobs', id, 'start'),
    complete: (id) => this.action('/api/v1/jobs', id, 'complete'),
  };

  // Quotes
  quotes = {
    list: (params) => this.get('/api/v1/quotes', params),
    stats: () => this.get('/api/v1/quotes/stats'),
    get: (id) => this.getOne('/api/v1/quotes', id),
    create: (data) => this.create('/api/v1/quotes', data),
    update: (id, data) => this.update('/api/v1/quotes', id, data),
    delete: (id) => this.delete('/api/v1/quotes', id),
    send: (id) => this.action('/api/v1/quotes', id, 'send'),
    approve: (id) => this.action('/api/v1/quotes', id, 'approve'),
    reject: (id) => this.action('/api/v1/quotes', id, 'reject'),
    convertToInvoice: (id) => this.action('/api/v1/quotes', id, 'convert-to-invoice'),
    downloadPdf: (id) => `${this.baseUrl}/api/v1/quotes/${id}/pdf`,
  };

  // Invoices
  invoices = {
    list: (params) => this.get('/api/v1/invoices', params),
    stats: () => this.get('/api/v1/invoices/stats'),
    get: (id) => this.getOne('/api/v1/invoices', id),
    create: (data) => this.create('/api/v1/invoices', data),
    update: (id, data) => this.update('/api/v1/invoices', id, data),
    delete: (id) => this.delete('/api/v1/invoices', id),
    send: (id) => this.action('/api/v1/invoices', id, 'send'),
    recordPayment: (id, data) => this.request(`/api/v1/invoices/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    downloadPdf: (id) => `${this.baseUrl}/api/v1/invoices/${id}/pdf`,
  };

  // Documents
  documents = {
    list: (params) => this.get('/api/v1/documents', params),
    get: (id) => this.getOne('/api/v1/documents', id),
    upload: (formData) => this.request('/api/v1/documents', { method: 'POST', body: formData }),
    uploadMultiple: (formData) => this.request('/api/v1/documents/bulk', { method: 'POST', body: formData }),
    update: (id, data) => this.update('/api/v1/documents', id, data),
    delete: (id) => this.delete('/api/v1/documents', id),
  };

  // Time
  time = {
    list: (params) => this.get('/api/v1/time', params),
    summary: (params) => this.get('/api/v1/time/summary', params),
    create: (data) => this.create('/api/v1/time', data),
    update: (id, data) => this.update('/api/v1/time', id, data),
    delete: (id) => this.delete('/api/v1/time', id),
    approve: (id) => this.action('/api/v1/time', id, 'approve'),
  };

  // Expenses
  expenses = {
    list: (params) => this.get('/api/v1/expenses', params),
    summary: (params) => this.get('/api/v1/expenses/summary', params),
    create: (data) => this.create('/api/v1/expenses', data),
    update: (id, data) => this.update('/api/v1/expenses', id, data),
    delete: (id) => this.delete('/api/v1/expenses', id),
    reimburse: (id) => this.action('/api/v1/expenses', id, 'reimburse'),
  };

  // RFIs
  rfis = {
    list: (params) => this.get('/api/v1/rfis', params),
    get: (id) => this.getOne('/api/v1/rfis', id),
    create: (data) => this.create('/api/v1/rfis', data),
    update: (id, data) => this.update('/api/v1/rfis', id, data),
    delete: (id) => this.delete('/api/v1/rfis', id),
    respond: (id, data) => this.action('/api/v1/rfis', id, 'respond', data),
    close: (id) => this.action('/api/v1/rfis', id, 'close'),
  };

  // Change Orders
  changeOrders = {
    list: (params) => this.get('/api/v1/change-orders', params),
    get: (id) => this.getOne('/api/v1/change-orders', id),
    create: (data) => this.create('/api/v1/change-orders', data),
    update: (id, data) => this.update('/api/v1/change-orders', id, data),
    delete: (id) => this.delete('/api/v1/change-orders', id),
    submit: (id) => this.action('/api/v1/change-orders', id, 'submit'),
    approve: (id, data) => this.action('/api/v1/change-orders', id, 'approve', data),
    reject: (id) => this.action('/api/v1/change-orders', id, 'reject'),
  };

  // Punch Lists
  punchLists = {
    list: (params) => this.get('/api/v1/punch-lists', params),
    get: (id) => this.getOne('/api/v1/punch-lists', id),
    create: (data) => this.create('/api/v1/punch-lists', data),
    update: (id, data) => this.update('/api/v1/punch-lists', id, data),
    delete: (id) => this.delete('/api/v1/punch-lists', id),
    complete: (id) => this.action('/api/v1/punch-lists', id, 'complete'),
    verify: (id, data) => this.action('/api/v1/punch-lists', id, 'verify', data),
  };

  // Daily Logs
  dailyLogs = {
    list: (params) => this.get('/api/v1/daily-logs', params),
    get: (id) => this.getOne('/api/v1/daily-logs', id),
    create: (data) => this.create('/api/v1/daily-logs', data),
    update: (id, data) => this.update('/api/v1/daily-logs', id, data),
    delete: (id) => this.delete('/api/v1/daily-logs', id),
  };

  // Inspections
  inspections = {
    list: (params) => this.get('/api/v1/inspections', params),
    create: (data) => this.create('/api/v1/inspections', data),
    update: (id, data) => this.update('/api/v1/inspections', id, data),
    delete: (id) => this.delete('/api/v1/inspections', id),
    pass: (id) => this.action('/api/v1/inspections', id, 'pass'),
    fail: (id, data) => this.action('/api/v1/inspections', id, 'fail', data),
  };

  // Bids
  bids = {
    list: (params) => this.get('/api/v1/bids', params),
    stats: () => this.get('/api/v1/bids/stats'),
    get: (id) => this.getOne('/api/v1/bids', id),
    create: (data) => this.create('/api/v1/bids', data),
    update: (id, data) => this.update('/api/v1/bids', id, data),
    delete: (id) => this.delete('/api/v1/bids', id),
    submit: (id) => this.action('/api/v1/bids', id, 'submit'),
    won: (id) => this.action('/api/v1/bids', id, 'won'),
    lost: (id) => this.action('/api/v1/bids', id, 'lost'),
  };

  // Team
  team = {
    list: (params) => this.get('/api/v1/team', params),
    get: (id) => this.getOne('/api/v1/team', id),
    create: (data) => this.create('/api/v1/team', data),
    update: (id, data) => this.update('/api/v1/team', id, data),
    delete: (id) => this.delete('/api/v1/team', id),
  };

  // Company
  company = {
    get: () => this.get('/api/v1/company'),
    update: (data) => this.request('/api/v1/company', { method: 'PUT', body: JSON.stringify(data) }),
    updateFeatures: (features) => this.request('/api/v1/company/features', { method: 'PUT', body: JSON.stringify({ features }) }),
    users: () => this.get('/api/v1/company/users'),
    createUser: (data) => this.request('/api/v1/company/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id, data) => this.request(`/api/v1/company/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) => this.request(`/api/v1/company/users/${id}`, { method: 'DELETE' }),
  };

  // Dashboard
  dashboard = {
    stats: () => this.get('/api/v1/dashboard/stats'),
    recentActivity: () => this.get('/api/v1/dashboard/recent-activity'),
  };

  // Job Costing
  jobCosting = {
    forJob: (jobId) => this.get(`/api/v1/job-costing/job/${jobId}`),
    report: (params) => this.get('/api/v1/job-costing/report', params),
    trends: (params) => this.get('/api/v1/job-costing/trends', params),
  };

  // Reports
  reports = {
    summary: (params) => this.get('/api/v1/reports/summary', params),
    revenue: (params) => this.get('/api/v1/reports/revenue', params),
    expenses: (params) => this.get('/api/v1/reports/expenses', params),
    profitability: (params) => this.get('/api/v1/reports/profitability', params),
  };

  // Online Booking
  booking = {
    getSettings: (companySlug) => this.get(`/api/v1/booking/${companySlug}`),
    create: (companySlug, data) => this.request(`/api/v1/booking/${companySlug}`, { method: 'POST', body: JSON.stringify(data) }),
    list: (params) => this.get('/api/v1/gap/booking/requests', params),
    confirm: (id) => this.action('/api/v1/gap/booking/requests', id, 'confirm'),
    cancel: (id, data) => this.action('/api/v1/gap/booking/requests', id, 'cancel', data),
  };

  // Job Costing — extend with gap routes
  jobCostingGap = {
    forJob: (jobId) => this.get(`/api/v1/gap/job-costing/jobs/${jobId}`),
    updateBudget: (jobId, data) => this.request(`/api/v1/gap/job-costing/jobs/${jobId}/budget`, { method: 'PUT', body: JSON.stringify(data) }),
    report: (params) => this.get('/api/v1/gap/job-costing/report', params),
  };

  // Custom Forms
  customForms = {
    list: (params) => this.get('/api/v1/gap/forms', params),
    get: (id) => this.getOne('/api/v1/gap/forms', id),
    create: (data) => this.create('/api/v1/gap/forms', data),
    update: (id, data) => this.update('/api/v1/gap/forms', id, data),
    delete: (id) => this.delete('/api/v1/gap/forms', id),
    submit: (id, data) => this.request(`/api/v1/gap/forms/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  };

  // Lien Waivers
  lienWaivers = {
    list: (params) => this.get('/api/v1/gap/lien-waivers', params),
    get: (id) => this.getOne('/api/v1/gap/lien-waivers', id),
    create: (data) => this.create('/api/v1/gap/lien-waivers', data),
    send: (id) => this.action('/api/v1/gap/lien-waivers', id, 'send'),
    sign: (id, data) => this.action('/api/v1/gap/lien-waivers', id, 'sign', data),
  };

  // Draw Schedules
  drawSchedules = {
    list: (params) => this.get('/api/v1/gap/draw-schedules', params),
    get: (id) => this.getOne('/api/v1/gap/draw-schedules', id),
    create: (data) => this.create('/api/v1/gap/draw-schedules', data),
    update: (id, data) => this.update('/api/v1/gap/draw-schedules', id, data),
    requestDraw: (id, data) => this.action('/api/v1/gap/draw-schedules', id, 'request-draw', data),
    approveDraw: (id, drawId) => this.request(`/api/v1/gap/draw-schedules/${id}/draws/${drawId}/approve`, { method: 'POST' }),
  };
}

export const api = new ApiClient();
export default api;
