import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Search, ExternalLink, Package, 
  Globe, Database, Palette, Factory, DollarSign,
  ChevronRight, AlertCircle, CheckCircle2, Clock, XCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billingFilter, setBillingFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, billingFilter]);

  async function fetchCustomers() {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (billingFilter) params.set('billing', billingFilter);
      const res = await fetch(`${API_URL}/factory/customers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter(c => 
    !search || 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  );

  const productIcon = (type) => {
    switch(type) {
      case 'website': return <Globe className="w-3.5 h-3.5" />;
      case 'cms': return <Palette className="w-3.5 h-3.5" />;
      case 'crm': return <Database className="w-3.5 h-3.5" />;
      default: return <Package className="w-3.5 h-3.5" />;
    }
  };

  const billingBadge = (customer) => {
    const type = customer.billingType;
    const status = customer.billingStatus;
    if (!type || type === 'pending') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full"><Clock className="w-3 h-3" /> Not set</span>;
    }
    if (status === 'active') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full"><CheckCircle2 className="w-3 h-3" /> {type === 'subscription' ? `$${customer.monthlyAmount}/mo` : `$${customer.oneTimeAmount} paid`}</span>;
    }
    if (status === 'past_due') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full"><AlertCircle className="w-3 h-3" /> Past due</span>;
    }
    if (status === 'canceled') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full"><XCircle className="w-3 h-3" /> Canceled</span>;
    }
    return <span className="text-xs text-slate-400">{status}</span>;
  };

  const statusBadge = (status) => {
    const colors = {
      generated: 'bg-amber-50 text-amber-700',
      deployed: 'bg-blue-50 text-blue-700',
      active: 'bg-emerald-50 text-emerald-700',
      suspended: 'bg-red-50 text-red-700',
      canceled: 'bg-slate-100 text-slate-500',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${colors[status] || 'bg-slate-100 text-slate-500'}`}>
        {status || 'Generated'}
      </span>
    );
  };

  // Revenue summary
  const totalMRR = customers
    .filter(c => c.billingType === 'subscription' && c.billingStatus === 'active')
    .reduce((sum, c) => sum + (parseFloat(c.monthlyAmount) || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
            {totalMRR > 0 && <> · <span className="text-emerald-600 font-medium">${totalMRR.toLocaleString()}/mo MRR</span></>}
          </p>
        </div>
        <button
          onClick={() => navigate('/factory')}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
        >
          <option value="">All statuses</option>
          <option value="generated">Generated</option>
          <option value="deployed">Deployed</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select 
          value={billingFilter} 
          onChange={(e) => setBillingFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
        >
          <option value="">All billing</option>
          <option value="active">Paid</option>
          <option value="pending">Pending</option>
          <option value="past_due">Past due</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No customers yet</h3>
            <p className="text-slate-500 text-sm mb-6">Generate your first customer package to get started</p>
            <button
              onClick={() => navigate('/factory')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
            >
              <Factory className="w-4 h-4" />
              Open Factory
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Products</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Billing</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map((customer) => (
                <div 
                  key={customer.id} 
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.email}</p>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {(customer.products || []).map((p, j) => (
                      <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                        {productIcon(p)}
                        {p.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <div className="col-span-2">
                    {statusBadge(customer.status)}
                  </div>
                  <div className="col-span-2">
                    {billingBadge(customer)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
