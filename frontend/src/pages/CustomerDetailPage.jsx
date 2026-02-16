import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Database, Palette, Package, ExternalLink,
  DollarSign, CreditCard, Calendar, Save, Trash2, Download,
  CheckCircle2, Clock, AlertCircle, XCircle, Edit3, Copy,
  Rocket, RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [stripeConfig, setStripeConfig] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [deployConfig, setDeployConfig] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState(null);

  useEffect(() => { fetchCustomer(); fetchStripeConfig(); fetchDeployConfig(); }, [id]);

  async function fetchCustomer() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
        setForm({
          status: data.status,
          billingType: data.billingType || '',
          billingStatus: data.billingStatus || 'pending',
          planId: data.planId || '',
          monthlyAmount: data.monthlyAmount || '',
          oneTimeAmount: data.oneTimeAmount || '',
          paidAt: data.paidAt ? data.paidAt.split('T')[0] : '',
          nextBillingDate: data.nextBillingDate ? data.nextBillingDate.split('T')[0] : '',
          deployedUrl: data.deployedUrl || '',
          apiUrl: data.apiUrl || '',
          siteUrl: data.siteUrl || '',
          notes: data.notes || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStripeConfig() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/stripe/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStripeConfig(await res.json());
    } catch (err) {
      console.error('Failed to fetch stripe config:', err);
    }
  }

  async function fetchDeployConfig() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/deploy/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDeployConfig(await res.json());
    } catch (err) {
      console.error('Failed to fetch deploy config:', err);
    }
  }

  async function handleDeploy() {
    if (!confirm('Deploy this customer to Render? This will create a GitHub repo, database, and web services.')) return;
    setDeploying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}/deploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: 'ohio', plan: 'free' }),
      });
      if (res.ok) {
        showToast('Deployment started! Services will be live in a few minutes.');
        // Poll for status
        setTimeout(() => fetchDeployStatus(), 15000);
        setTimeout(() => { fetchCustomer(); fetchDeployStatus(); }, 30000);
        setTimeout(() => { fetchCustomer(); fetchDeployStatus(); }, 60000);
      } else {
        const err = await res.json();
        showToast(err.error || 'Deploy failed', 'error');
      }
    } catch (err) {
      showToast('Deploy request failed', 'error');
    } finally {
      setDeploying(false);
    }
  }

  async function handleRedeploy() {
    if (!confirm('Redeploy all services for this customer?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}/redeploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Redeploy triggered');
      } else {
        const err = await res.json();
        showToast(err.error || 'Redeploy failed', 'error');
      }
    } catch (err) {
      showToast('Redeploy failed', 'error');
    }
  }

  async function fetchDeployStatus() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}/deploy/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDeployStatus(await res.json());
    } catch (err) { /* ignore */ }
  }

  async function handleCheckout(type) {
    setCheckoutLoading(type);
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'subscription'
        ? `${API_URL}/factory/customers/${id}/checkout/subscription`
        : `${API_URL}/factory/customers/${id}/checkout/license`;
      
      const body = type === 'subscription'
        ? { planId: form.planId || 'custom', monthlyAmount: parseFloat(form.monthlyAmount) || 149 }
        : { planId: form.planId || 'custom', amount: parseFloat(form.oneTimeAmount) || 2497 };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Copy checkout URL for sending to customer
          await navigator.clipboard.writeText(data.url);
          showToast('Checkout link copied to clipboard!');
          // Also open in new tab so you can preview it
          window.open(data.url, '_blank');
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create checkout', 'error');
      }
    } catch (err) {
      showToast('Failed to create checkout link', 'error');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleOpenPortal() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to open portal', 'error');
      }
    } catch (err) {
      showToast('Failed to open billing portal', 'error');
    }
  }

  async function handleCancelSubscription() {
    if (!confirm('Cancel this customer\'s subscription? They will retain access until the end of the billing period.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }),
      });
      if (res.ok) {
        showToast('Subscription will cancel at period end');
        fetchCustomer();
      }
    } catch (err) {
      showToast('Failed to cancel subscription', 'error');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/factory/customers/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          monthlyAmount: form.monthlyAmount ? parseFloat(form.monthlyAmount) : null,
          oneTimeAmount: form.oneTimeAmount ? parseFloat(form.oneTimeAmount) : null,
          paidAt: form.paidAt || null,
          nextBillingDate: form.nextBillingDate || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomer({ ...customer, ...updated });
        setEditMode(false);
        showToast('Customer updated');
      }
    } catch (err) {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this customer record? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/factory/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      navigate('/customers');
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Copied');
  }

  const productIcon = (type) => {
    switch(type) {
      case 'website': return <Globe className="w-4 h-4 text-emerald-500" />;
      case 'cms': return <Palette className="w-4 h-4 text-purple-500" />;
      case 'crm': return <Database className="w-4 h-4 text-blue-500" />;
      default: return <Package className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="mt-4 text-orange-500 hover:underline text-sm">
          Back to customers
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: customer.primaryColor || '#f97316' }}
            >
              {customer.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
              <p className="text-sm text-slate-500">{customer.email} · {customer.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Products */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Deployment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500">Status</label>
                {editMode ? (
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="generated">Generated</option>
                    <option value="deploying">Deploying</option>
                    <option value="deployed">Deployed</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="canceled">Canceled</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{customer.status}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Products</label>
                <div className="flex gap-2 mt-1">
                  {(customer.products || []).map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200">
                      {productIcon(p)} {p.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* URLs */}
            <div className="mt-4 space-y-3">
              {['deployedUrl', 'apiUrl', 'siteUrl'].map((field) => (
                <div key={field}>
                  <label className="text-xs text-slate-500">
                    {field === 'deployedUrl' ? 'CRM URL' : field === 'apiUrl' ? 'API URL' : 'Website URL'}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      placeholder="https://..."
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  ) : form[field] ? (
                    <div className="flex items-center gap-2 mt-1">
                      <a href={form[field]} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                        {form[field]}
                      </a>
                      <button onClick={() => copyToClipboard(form[field])} className="text-slate-400 hover:text-slate-600">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">Not set</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deploy to Render */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-slate-400" /> Auto-Deploy
            </h3>

            {deployConfig?.configured ? (
              <div className="space-y-3">
                {customer.status === 'generated' && (
                  <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full justify-center"
                  >
                    <Rocket className="w-4 h-4" />
                    {deploying ? 'Deploying...' : 'Deploy to Render'}
                  </button>
                )}
                {customer.status === 'deploying' && (
                  <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg w-full justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Deploying...
                  </div>
                )}
                {(customer.status === 'deployed' || customer.status === 'active') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Deployed
                    </div>
                    <button
                      onClick={handleRedeploy}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 w-full justify-center"
                    >
                      <RefreshCw className="w-4 h-4" /> Redeploy
                    </button>
                  </div>
                )}

                {deployStatus?.services && (
                  <div className="mt-3 space-y-1">
                    {Object.entries(deployStatus.services).map(([role, info]) => (
                      <div key={role} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 capitalize">{role}</span>
                        <span className={`font-medium ${
                          info.status === 'live' ? 'text-emerald-600'
                          : info.status === 'build_in_progress' ? 'text-amber-600'
                          : 'text-slate-400'
                        }`}>
                          {info.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  Creates GitHub repo + Render services automatically.
                </p>
              </div>
            ) : (
              <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Add RENDER_API_KEY, RENDER_OWNER_ID, GITHUB_TOKEN, and GITHUB_ORG to enable.</span>
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" /> Billing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500">Billing Type</label>
                {editMode ? (
                  <select
                    value={form.billingType}
                    onChange={(e) => setForm({ ...form, billingType: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Not set</option>
                    <option value="subscription">Subscription (monthly)</option>
                    <option value="one_time">One-time license</option>
                    <option value="free">Free / demo</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{customer.billingType || 'Not set'}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Payment Status</label>
                {editMode ? (
                  <select
                    value={form.billingStatus}
                    onChange={(e) => setForm({ ...form, billingStatus: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active / Paid</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{customer.billingStatus}</p>
                )}
              </div>

              {(form.billingType === 'subscription' || customer.billingType === 'subscription') && (
                <>
                  <div>
                    <label className="text-xs text-slate-500">Monthly Amount ($)</label>
                    {editMode ? (
                      <input
                        type="number"
                        value={form.monthlyAmount}
                        onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
                        placeholder="149.00"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {customer.monthlyAmount ? `$${parseFloat(customer.monthlyAmount).toFixed(2)}` : '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Next Billing Date</label>
                    {editMode ? (
                      <input
                        type="date"
                        value={form.nextBillingDate}
                        onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {customer.nextBillingDate ? new Date(customer.nextBillingDate).toLocaleDateString() : '—'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {(form.billingType === 'one_time' || customer.billingType === 'one_time') && (
                <>
                  <div>
                    <label className="text-xs text-slate-500">License Amount ($)</label>
                    {editMode ? (
                      <input
                        type="number"
                        value={form.oneTimeAmount}
                        onChange={(e) => setForm({ ...form, oneTimeAmount: e.target.value })}
                        placeholder="2497.00"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {customer.oneTimeAmount ? `$${parseFloat(customer.oneTimeAmount).toFixed(2)}` : '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Paid Date</label>
                    {editMode ? (
                      <input
                        type="date"
                        value={form.paidAt}
                        onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {customer.paidAt ? new Date(customer.paidAt).toLocaleDateString() : '—'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4">
              <label className="text-xs text-slate-500">Plan</label>
              {editMode ? (
                <select
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Custom</option>
                  <option value="starter">Starter ($49/mo | $997)</option>
                  <option value="pro">Pro ($149/mo | $2,497)</option>
                  <option value="business">Business ($299/mo | $4,997)</option>
                  <option value="construction">Construction ($599/mo | $9,997)</option>
                  <option value="enterprise">Enterprise (custom)</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{customer.planId || 'Custom'}</p>
              )}
            </div>

            {/* Stripe Actions */}
            {stripeConfig?.configured && !editMode && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <label className="text-xs text-slate-500 mb-2 block">Payment Actions</label>
                <div className="flex flex-wrap gap-2">
                  {(!customer.billingStatus || customer.billingStatus === 'pending') && (
                    <>
                      <button
                        onClick={() => handleCheckout('subscription')}
                        disabled={checkoutLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <CreditCard className="w-4 h-4" />
                        {checkoutLoading === 'subscription' ? 'Creating...' : 'Subscription Checkout'}
                      </button>
                      <button
                        onClick={() => handleCheckout('license')}
                        disabled={checkoutLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <DollarSign className="w-4 h-4" />
                        {checkoutLoading === 'license' ? 'Creating...' : 'License Checkout'}
                      </button>
                    </>
                  )}
                  {customer.stripeCustomerId && (
                    <button
                      onClick={handleOpenPortal}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <ExternalLink className="w-4 h-4" /> Stripe Portal
                    </button>
                  )}
                  {customer.stripeSubscriptionId && customer.billingStatus === 'active' && (
                    <button
                      onClick={handleCancelSubscription}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Subscription
                    </button>
                  )}
                </div>
                {(!customer.billingStatus || customer.billingStatus === 'pending') && (
                  <p className="text-xs text-slate-400 mt-2">
                    Creates a Stripe checkout link you can send to the customer. Link is also copied to clipboard.
                  </p>
                )}
                {customer.stripeCustomerId && (
                  <p className="text-xs text-slate-400 mt-1">
                    Stripe ID: {customer.stripeCustomerId}
                  </p>
                )}
              </div>
            )}
            {!stripeConfig?.configured && !editMode && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to enable payments.
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Notes</h3>
            {editMode ? (
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                placeholder="Internal notes about this customer..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            ) : (
              <p className="text-sm text-slate-600">{customer.notes || 'No notes'}</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Features */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Enabled Features ({customer.features?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(customer.features || []).map((f) => (
                <span key={f} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Admin Credentials */}
          {customer.adminEmail && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Admin Login</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500">Email</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-900">{customer.adminEmail}</p>
                    <button onClick={() => copyToClipboard(customer.adminEmail)} className="text-slate-400 hover:text-slate-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {customer.adminPassword && (
                  <div>
                    <label className="text-xs text-slate-500">Temp Password</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-900 font-mono">{customer.adminPassword}</p>
                      <button onClick={() => copyToClipboard(customer.adminPassword)} className="text-slate-400 hover:text-slate-600">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Build History */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Build History</h3>
            {customer.builds?.length > 0 ? (
              <div className="space-y-3">
                {customer.builds.map((build) => (
                  <div key={build.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Download className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">{build.zipName}</p>
                      <p className="text-xs text-slate-500">{new Date(build.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No builds</p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 w-full justify-center"
            >
              <Trash2 className="w-4 h-4" /> Delete Customer Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
