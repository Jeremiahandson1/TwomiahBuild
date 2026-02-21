import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Package, Plus, Trash2, Rocket } from 'lucide-react';
import api from '../services/api';

import { API_BASE_URL as API_BASE } from '../config/api.js';

export default function BuildsPage() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deploying, setDeploying] = useState(null);
  const [deployedUrls, setDeployedUrls] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = api.accessToken;
    fetch(`${API_BASE}/api/v1/factory/builds`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setBuilds(data.builds || []); setLoading(false); })
      .catch(() => { setError('Failed to load builds'); setLoading(false); });
  }, []);

  const handleDownload = async (build) => {
    setDownloading(build.id);
    try {
      const token = api.accessToken;
      const res = await fetch(
        `${API_BASE}/api/v1/factory/download/${build.buildId}/${build.zipName}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('File not found — it may have expired');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = build.zipName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
    setDownloading(null);
  };

  const handleDeploy = async (build) => {
    if (!build.customer?.name) return;
    setDeploying(build.id);
    try {
      const token = api.accessToken;
      // Need customerId — get it from the build's customer
      const res = await fetch(`${API_BASE}/api/v1/factory/customers?search=${encodeURIComponent(build.companyName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const customers = await res.json();
      const customer = customers.find(c => c.slug === build.slug || c.name === build.companyName);
      if (!customer) throw new Error('Customer not found');

      const deployRes = await fetch(`${API_BASE}/api/v1/factory/customers/${customer.id}/deploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await deployRes.json();
      if (!deployRes.ok) throw new Error(data.error || 'Deploy failed');
      setDeployedUrls(prev => ({ ...prev, [build.id]: `https://${build.slug}.onrender.com` }));
    } catch (err) {
      alert(err.message);
    }
    setDeploying(null);
  };

  const handleDelete = async (build) => {
    if (!confirm(`Delete "${build.companyName}" build? This cannot be undone.`)) return;
    setDeleting(build.id);
    try {
      const token = api.accessToken;
      const res = await fetch(`${API_BASE}/api/v1/factory/builds/${build.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      setBuilds(prev => prev.filter(b => b.id !== build.id));
    } catch (err) {
      alert(err.message);
    }
    setDeleting(null);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>All Builds</h1>
          <p style={{ color: '#6b7280', marginTop: 4, fontSize: '0.9rem' }}>
            {builds.length} package{builds.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <Link to="/factory" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f97316', color: 'white', textDecoration: 'none',
          padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem'
        }}>
          <Plus size={16} /> New Build
        </Link>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading builds...
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {!loading && !error && builds.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No builds yet</p>
          <p style={{ fontSize: '0.85rem', marginBottom: 24 }}>Generate your first package to get started</p>
          <Link to="/factory" style={{
            background: '#f97316', color: 'white', textDecoration: 'none',
            padding: '10px 24px', borderRadius: 8, fontWeight: 600
          }}>Generate Package</Link>
        </div>
      )}

      {!loading && builds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {builds.map(build => (
            <div key={build.id} style={{
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Package size={20} color="#f97316" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827' }}>
                    {build.companyName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                    {Array.isArray(build.products) ? build.products.join(', ') : build.products}
                    {' · '}
                    {new Date(build.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>
                    {build.zipName}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
              {deployedUrls[build.id] ? (
                <a
                  href={deployedUrls[build.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd6fe',
                    background: '#f5f3ff', color: '#7c3aed',
                    fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  🟢 View Live
                </a>
              ) : (
                <button
                  onClick={() => handleDeploy(build)}
                  disabled={deploying === build.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd6fe',
                    background: deploying === build.id ? '#f5f3ff' : 'white',
                    color: deploying === build.id ? '#a78bfa' : '#7c3aed',
                    cursor: deploying === build.id ? 'default' : 'pointer',
                    fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap',
                  }}
                >
                  <Rocket size={14} />
                  {deploying === build.id ? 'Deploying...' : 'Deploy'}
                </button>
              )}
              <button
                onClick={() => handleDownload(build)}
                disabled={downloading === build.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                  background: downloading === build.id ? '#f9fafb' : 'white',
                  color: downloading === build.id ? '#9ca3af' : '#374151',
                  cursor: downloading === build.id ? 'default' : 'pointer',
                  fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap',
                }}
              >
                <Download size={14} />
                {downloading === build.id ? 'Downloading...' : 'Download'}
              </button>
              <button
                onClick={() => handleDelete(build)}
                disabled={deleting === build.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca',
                  background: deleting === build.id ? '#fef2f2' : 'white',
                  color: deleting === build.id ? '#fca5a5' : '#ef4444',
                  cursor: deleting === build.id ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                <Trash2 size={14} />
              </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
