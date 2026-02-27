import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Package, DollarSign, ArrowRight, Factory,
  TrendingUp, Clock, CheckCircle2, AlertCircle, Globe,
  Mail, RefreshCw, ExternalLink, Activity, XCircle
} from 'lucide-react';
import api from '../services/api';
import { API_BASE_URL as API_URL } from '../config/api.js';

const statusIcon = (s) => {
  if (s === 'deployed' || s === 'live') return <CheckCircle2 size={14} style={{ color: '#16a34a' }} />;
  if (s === 'deploying') return <RefreshCw size={14} style={{ color: '#d97706', animation: 'spin 1s linear infinite' }} />;
  if (s === 'failed') return <XCircle size={14} style={{ color: '#dc2626' }} />;
  return <Clock size={14} style={{ color: '#6b7280' }} />;
};

const statusColor = (s) => {
  if (s === 'deployed' || s === 'live') return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  if (s === 'deploying') return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  if (s === 'failed') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  return { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' };
};

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalCustomers: 0, totalBuilds: 0, monthlyRevenue: 0, recentBuilds: [] });
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    try {
      const token = api.accessToken;
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, customersRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/factory/stats`, { headers }),
        fetch(`${API_URL}/api/v1/factory/customers?limit=20`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }
    } catch (err) {
      console.error('Dashboard load failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const deployed = customers.filter(c => c.deployStatus === 'deployed' || c.deployStatus === 'live').length;
  const needsAttention = customers.filter(c => c.deployStatus === 'failed').length;
  const totalLeads = customers.reduce((sum, c) => sum + (c.leadsCount || 0), 0);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Twomiah Ops Dashboard</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>All clients, live status, at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => load(true)} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14, color: '#374151' }}>
            <RefreshCw size={15} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
          <button onClick={() => navigate('/factory')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <Factory size={15} /> New Build
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Clients', value: stats.totalCustomers, icon: Users, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Live & Deployed', value: deployed, icon: Globe, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Packages Built', value: stats.totalBuilds, icon: Package, color: '#7c3aed', bg: '#faf5ff' },
          { label: 'Total Leads', value: totalLeads, icon: Mail, color: '#ea580c', bg: '#fff7ed' },
          { label: 'MRR', value: `$${(stats.monthlyRevenue || 0).toLocaleString()}`, icon: DollarSign, color: '#0891b2', bg: '#ecfeff' },
          { label: 'Needs Attention', value: needsAttention, icon: AlertCircle, color: '#dc2626', bg: '#fef2f2' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{loading ? '—' : card.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Client Table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} style={{ color: '#64748b' }} /> All Clients
          </h3>
          <button onClick={() => navigate('/customers')}
            style={{ fontSize: 13, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Manage all →
          </button>
        </div>

        {customers.length === 0 && !loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Factory size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#64748b' }}>No clients yet</p>
            <button onClick={() => navigate('/factory')}
              style={{ marginTop: 12, padding: '8px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Generate First Package
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Company', 'Industry', 'Products', 'Deploy Status', 'Leads', 'Site', 'Created', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#64748b', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const sc = statusColor(c.deployStatus);
                  const siteUrl = c.siteUrl || (c.slug ? `https://${c.slug}-site.onrender.com` : '');
                  return (
                    <tr key={c.id || i} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.companyName || c.name || c.slug}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.email || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {c.industry === 'home_care' ? '🏥 Home Care' : c.industry === 'contractor' ? '🔨 Contractor' : c.industry || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(c.products || []).map(p => (
                            <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontWeight: 500 }}>{p}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}` }}>
                          {statusIcon(c.deployStatus)}
                          <span style={{ fontSize: 12, fontWeight: 600, color: sc.color }}>
                            {c.deployStatus || 'pending'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: c.leadsCount > 0 ? '#16a34a' : '#94a3b8', fontWeight: c.leadsCount > 0 ? 700 : 400 }}>
                        {c.leadsCount || 0}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {siteUrl ? (
                          <a href={siteUrl} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <ExternalLink size={12} /> Visit
                          </a>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <ArrowRight size={15} style={{ color: '#cbd5e1' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
