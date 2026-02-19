import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, Clock, User, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ACTION_LABELS = {
  create: { label: 'Created', color: '#10b981', bg: '#d1fae5' },
  update: { label: 'Updated', color: '#3b82f6', bg: '#dbeafe' },
  delete: { label: 'Deleted', color: '#ef4444', bg: '#fee2e2' },
  send:   { label: 'Sent',    color: '#8b5cf6', bg: '#ede9fe' },
  status_change: { label: 'Status',  color: '#f59e0b', bg: '#fef3c7' },
  login:  { label: 'Login',   color: '#6b7280', bg: '#f3f4f6' },
  export: { label: 'Export',  color: '#06b6d4', bg: '#cffafe' },
};

const ENTITY_ICONS = {
  invoice: '🧾',
  quote: '📋',
  contact: '👤',
  job: '🔨',
  project: '🏗️',
  payment: '💳',
  document: '📄',
  user: '👥',
  company: '🏢',
};

function ActionBadge({ action }) {
  const config = ACTION_LABELS[action] || { label: action, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      color: config.color,
      background: config.bg,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {config.label}
    </span>
  );
}

function formatDiff(changes) {
  if (!changes || typeof changes !== 'object') return null;
  const entries = Object.entries(changes).slice(0, 5);
  if (!entries.length) return null;
  return entries.map(([key, val]) => {
    if (val && typeof val === 'object' && 'from' in val && 'to' in val) {
      return `${key}: ${String(val.from ?? '—').slice(0, 30)} → ${String(val.to ?? '—').slice(0, 30)}`;
    }
    return `${key}: ${String(val).slice(0, 40)}`;
  }).join(' • ');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (filters.entity) params.set('entity', filters.entity);
      if (filters.action) params.set('action', filters.action);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      const res = await api.get(`/audit?${params}`);
      setLogs(res.data?.data || res.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => { load(page); }, [page, filters]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/audit?limit=5000', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const filtered = filters.search
    ? logs.filter(l =>
        (l.entity || '').includes(filters.search.toLowerCase()) ||
        (l.action || '').includes(filters.search.toLowerCase()) ||
        (l.user?.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (l.entityId || '').includes(filters.search)
      )
    : logs;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Audit Trail</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Every create, update, delete, and status change — who did it and when.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={exportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: showFilters ? 12 : 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Search by entity, action, user email, or ID..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0' }}>
          {[
            { key: 'entity', label: 'Entity', options: ['invoice', 'quote', 'contact', 'job', 'project', 'document', 'user', 'company'] },
            { key: 'action', label: 'Action', options: ['create', 'update', 'delete', 'send', 'status_change', 'login', 'export'] },
          ].map(({ key, label, options }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
              <select
                value={filters[key]}
                onChange={e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: '#fff' }}
              >
                <option value="">All</option>
                {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>From</label>
            <input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>To</label>
            <input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={() => { setFilters({ entity: '', action: '', userId: '', startDate: '', endDate: '', search: '' }); setPage(1); }}
              style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Log table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading audit log...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
          No audit events found
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['When', 'Action', 'Entity', 'User', 'Changes'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    <div title={new Date(log.timestamp || log.createdAt).toLocaleString()}>
                      {timeAgo(log.timestamp || log.createdAt)}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <ActionBadge action={log.action} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{ENTITY_ICONS[log.entity] || '📦'}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{log.entity}</div>
                        {log.entityId && <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{log.entityId.slice(0, 8)}…</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {log.user ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{log.user.name || log.user.email}</div>
                        {log.user.name && <div style={{ fontSize: 11, color: '#94a3b8' }}>{log.user.email}</div>}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>System</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b', maxWidth: 320 }}>
                    {formatDiff(log.changes) || <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {pagination.total} total events — page {pagination.page} of {pagination.pages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: page === 1 ? '#f8fafc' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13 }}>
              ← Previous
            </button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: page >= pagination.pages ? '#f8fafc' : '#fff', cursor: page >= pagination.pages ? 'default' : 'pointer', fontSize: 13 }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
