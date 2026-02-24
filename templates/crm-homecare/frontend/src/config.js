// config.js — API shim for Twomiah Care template
// Maps CVHC's config.js function signatures to the new api service
// This lets all CVHC components work without modification.

export const API_BASE_URL = import.meta.env.VITE_API_URL || '{{BACKEND_URL}}';

import { api } from './services/api.js';

// No-op callbacks (session handling done by api service)
export const setSessionExpiredCallback = () => {};
export const isTokenExpired = () => false;

// Core apiCall - token param ignored (handled by api service interceptor)
export const apiCall = (endpoint, options = {}, _token) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : undefined;
  return api.request(method, endpoint.replace('/api', ''), body);
};

// ── Clients ───────────────────────────────────────────────────────
export const getClients = (_t) => api.get('/clients?limit=200');
export const createClient = (data, _t) => api.post('/clients', data);
export const getClientDetails = (id, _t) => api.get(`/clients/${id}`);
export const updateClient = (id, data, _t) => api.put(`/clients/${id}`, data);

// ── Referral Sources / Payers ─────────────────────────────────────
export const getReferralSources = (_t) => api.get('/payers');
export const createReferralSource = (data, _t) => api.post('/payers', data);
export const updateReferralSource = (id, data, _t) => api.put(`/payers/${id}`, data);

// ── Caregivers ────────────────────────────────────────────────────
export const getCaregivers = (_t) => api.get('/caregivers?limit=200').then(r => r.caregivers || r);
export const getCaregiverDetails = (id, _t) => api.get(`/caregivers/${id}`);
export const createCaregiver = (data, _t) => api.post('/caregivers', data);
export const updateCaregiver = (id, data, _t) => api.put(`/caregivers/${id}`, data);
export const convertToAdmin = (userId, _t) => api.patch(`/company/users/${userId}/role`, { role: 'admin' });

// ── Schedules ─────────────────────────────────────────────────────
export const getSchedules = (caregiverId, _t) => api.get(`/scheduling/schedules?caregiverId=${caregiverId}`);
export const createSchedule = (data, _t) => api.post('/scheduling/schedules', data);
export const updateSchedule = (id, data, _t) => api.put(`/scheduling/schedules/${id}`, data);
export const deleteSchedule = (id, _t) => api.delete(`/scheduling/schedules/${id}`);

// ── Time Tracking ─────────────────────────────────────────────────
export const getTimeEntries = (_t, params = '') => api.get(`/time-tracking?${params}`);
export const clockIn = (data, _t) => api.post('/time-tracking/clock-in', data);
export const clockOut = (id, data, _t) => api.post('/time-tracking/clock-out', { timeEntryId: id, ...data });
export const trackGPS = (id, data, _t) => api.post('/time-tracking/gps', { timeEntryId: id, ...data });

// ── Billing ───────────────────────────────────────────────────────
export const getInvoices = (_t) => api.get('/billing/invoices?limit=100').then(r => r.invoices || r);
export const getInvoiceDetails = (id, _t) => api.get(`/billing/invoices/${id}`);
export const generateInvoice = (data, _t) => api.post('/billing/invoices/generate', data);
export const createInvoice = (data, _t) => api.post('/billing/invoices', data);
export const updateInvoiceStatus = (id, data, _t) => api.patch(`/billing/invoices/${id}/status`, data);

// ── Authorizations ────────────────────────────────────────────────
export const getAuthorizations = (_t, clientId) => api.get(`/authorizations${clientId ? `?clientId=${clientId}` : ''}`);
export const createAuthorization = (data, _t) => api.post('/authorizations', data);
export const updateAuthorization = (id, data, _t) => api.put(`/authorizations/${id}`, data);

// ── EVV / Claims ──────────────────────────────────────────────────
export const getEVVVisits = (_t) => api.get('/evv?limit=100').then(r => r.visits || r);
export const getClaims = (_t) => api.get('/claims?limit=100').then(r => r.claims || r);
export const getEdiBatches = (_t) => api.get('/edi/batches');
export const createEdiBatch = (data, _t) => api.post('/edi/batches', data);
export const submitEdiBatch = (id, _t) => api.patch(`/edi/batches/${id}/submit`, {});

// ── Payroll ───────────────────────────────────────────────────────
export const getPayrollSummary = (start, end, _t) => api.get(`/payroll/summary?startDate=${start}&endDate=${end}`);
export const getExpenses = (_t) => api.get('/payroll/expenses');
export const createExpense = (data, _t) => api.post('/payroll/expenses', data);
export const updateExpenseStatus = (id, status, _t) => api.patch(`/payroll/expenses/${id}/status`, { status });

// ── Scheduling ────────────────────────────────────────────────────
export const getTimeOff = (_t) => api.get('/scheduling/time-off');
export const createTimeOff = (data, _t) => api.post('/scheduling/time-off', data);
export const approveTimeOff = (id, _t) => api.patch(`/scheduling/time-off/${id}/approve`, {});
export const rejectTimeOff = (id, _t) => api.patch(`/scheduling/time-off/${id}/reject`, {});
export const getOpenShifts = (_t) => api.get('/scheduling/open-shifts');
export const createOpenShift = (data, _t) => api.post('/scheduling/open-shifts', data);
export const updateOpenShift = (id, data, _t) => api.patch(`/scheduling/open-shifts/${id}`, data);
export const getAbsences = (_t) => api.get('/scheduling/absences');
export const createAbsence = (data, _t) => api.post('/scheduling/absences', data);
export const getNoshowAlerts = (_t) => api.get('/scheduling/noshow-alerts');
export const resolveNoshowAlert = (id, data, _t) => api.patch(`/scheduling/noshow-alerts/${id}/resolve`, data);

// ── Communication ─────────────────────────────────────────────────
export const getCommunicationLog = (entityType, entityId, _t) => api.get(`/communication/log?entityType=${entityType}&entityId=${entityId}`);
export const createCommunicationLog = (data, _t) => api.post('/communication/log', data);
export const getMessageThreads = (_t) => api.get('/communication/threads');
export const createMessageThread = (data, _t) => api.post('/communication/threads', data);
export const getMessages = (threadId, _t) => api.get(`/communication/threads/${threadId}/messages`);
export const sendMessage = (threadId, body, _t) => api.post(`/communication/threads/${threadId}/messages`, { body });

// ── Forms ─────────────────────────────────────────────────────────
export const getFormTemplates = (_t) => api.get('/forms/templates');
export const createFormTemplate = (data, _t) => api.post('/forms/templates', data);
export const updateFormTemplate = (id, data, _t) => api.put(`/forms/templates/${id}`, data);
export const getFormSubmissions = (params, _t) => api.get(`/forms/submissions?${params}`);
export const submitForm = (data, _t) => api.post('/forms/submissions', data);

// ── Compliance ────────────────────────────────────────────────────
export const getComplianceDashboard = (_t) => api.get('/compliance/dashboard');
export const getPerformanceRatings = (caregiverId, _t) => api.get(`/compliance/ratings${caregiverId ? `?caregiverId=${caregiverId}` : ''}`);
export const createPerformanceRating = (data, _t) => api.post('/compliance/ratings', data);
export const getLoginActivity = (_t) => api.get('/compliance/login-activity');
export const getBackgroundChecks = (caregiverId, _t) => api.get(`/caregivers/${caregiverId}/background-checks`);
export const createBackgroundCheck = (caregiverId, data, _t) => api.post(`/caregivers/${caregiverId}/background-checks`, data);

// ── Notifications ─────────────────────────────────────────────────
export const getNotifications = (_t) => api.get('/notifications');
export const markNotificationsRead = (ids, _t) => api.patch('/notifications/mark-read', { ids });
export const getNotificationPrefs = (_t) => api.get('/notifications/preferences');
export const updateNotificationPrefs = (data, _t) => api.put('/notifications/preferences', data);

// ── Reports ───────────────────────────────────────────────────────
export const getHoursByCaregiver = (start, end, _t) => api.get(`/reports/hours-by-caregiver?startDate=${start}&endDate=${end}`);
export const getRevenue = (start, end, _t) => api.get(`/reports/revenue?startDate=${start}&endDate=${end}`);
export const getClientCensus = (_t) => api.get('/reports/census');
export const getPayerMix = (_t) => api.get('/reports/payer-mix');
export const getRevenueForecast = (_t) => api.get('/reports/forecast');
export const getNoshowRate = (start, end, _t) => api.get(`/reports/noshow-rate?startDate=${start}&endDate=${end}`);

// ── Dashboard ─────────────────────────────────────────────────────
export const getDashboardSummary = (_t) => api.get('/dashboard/stats');
export const getDashboardReferrals = (_t) => api.get('/reports/payer-mix');
export const getDashboardHours = (_t) => api.get('/reports/hours-by-caregiver');

// ── Optimizer ─────────────────────────────────────────────────────
export const getCompanyOptimizer = (_t) => api.get('/optimizer/company');
export const getRouteOptimizer = (caregiverId, date, _t) => api.get(`/optimizer/routes?caregiverId=${caregiverId}&date=${date}`);

// ── Audit ─────────────────────────────────────────────────────────
export const getAuditLogs = (_t) => api.get('/audit?limit=100').then(r => r.logs || r);

// ── Company / Portal ─────────────────────────────────────────────
export const getCompanyInfo = (_t) => api.get('/company');
export const updateCompanyInfo = (data, _t) => api.put('/company', data);
export const generatePortalLink = (clientId, _t) => api.post('/portal/generate-link', { clientId });

// Export for CSV (browser download)
export const exportInvoicesCSV = async (_t) => {
  const invoices = await getInvoices(_t);
  const rows = [['Invoice #', 'Client', 'Period Start', 'Period End', 'Total', 'Status']];
  (invoices || []).forEach(i => rows.push([i.invoiceNumber, `${i.client?.firstName} ${i.client?.lastName}`, i.billingPeriodStart, i.billingPeriodEnd, i.total, i.paymentStatus]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
  URL.revokeObjectURL(url);
};
