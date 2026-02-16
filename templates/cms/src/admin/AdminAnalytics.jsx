import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { useToast } from './Toast';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gaId, setGaId] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadAnalytics();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGaId(data.googleAnalyticsId || data.gaId || '');
      }
    } catch (e) { /* ignore */ }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // Try admin endpoint first (returns pre-computed stats)
      let data = null;
      try {
        const res = await fetch(`${API_BASE}/admin/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) data = await res.json();
      } catch (e) { /* fall through */ }

      // If admin endpoint failed or returned raw data, compute from raw analytics
      if (!data || (!data.totalPageViews && data.pageViews)) {
        data = normalizeRawAnalytics(data);
      }

      // If still nothing, try raw analytics endpoint
      if (!data) {
        try {
          const res = await fetch(`${API_BASE}/analytics`);
          if (res.ok) {
            const raw = await res.json();
            data = normalizeRawAnalytics(raw);
          }
        } catch (e) { /* fall through */ }
      }

      setAnalytics(data || getEmptyAnalytics());
    } catch (err) {
      toast.error('Failed to load analytics');
      setAnalytics(getEmptyAnalytics());
    }
    setLoading(false);
  };

  // Convert raw analytics.json format into the display format
  const normalizeRawAnalytics = (raw) => {
    if (!raw) return null;
    const today = new Date().toISOString().slice(0, 10);
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // Handle pageViews — could be { page: N } or { page: { total: N } }
    const pageViews = raw.pageViews || {};
    let totalPageViews = 0;
    const topPages = [];

    Object.entries(pageViews).forEach(([page, val]) => {
      const views = typeof val === 'number' ? val : (val?.total || 0);
      totalPageViews += views;
      topPages.push({ page, views });
    });

    topPages.sort((a, b) => b.views - a.views);

    // Handle dailyViews — could be { date: N } or { date: { page: N } }
    const dailyViews = raw.dailyViews || {};
    let todayPageViews = 0;
    let weekPageViews = 0;
    const dailyArray = [];

    Object.entries(dailyViews).forEach(([date, val]) => {
      const count = typeof val === 'number' ? val : Object.values(val || {}).reduce((s, n) => s + n, 0);
      if (date === today) todayPageViews = count;
      if (date >= lastWeek) weekPageViews += count;
      dailyArray.push({ date, views: count });
    });

    dailyArray.sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPageViews,
      todayPageViews,
      weekPageViews,
      totalLeads: raw.totalLeads || 0,
      newLeads: raw.newLeads || 0,
      topPages: topPages.slice(0, 10),
      dailyViews: dailyArray.slice(-30)
    };
  };

  const getEmptyAnalytics = () => ({
    totalPageViews: 0, todayPageViews: 0, weekPageViews: 0,
    totalLeads: 0, newLeads: 0, topPages: [], dailyViews: []
  });

  const fmt = (num) => {
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const fmtDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Bar chart
  const renderChart = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="analytics-empty">
          <p>No page view data yet. Views will start appearing as visitors browse your site.</p>
        </div>
      );
    }

    const maxViews = Math.max(...data.map(d => d.views), 1);

    return (
      <div className="analytics-chart">
        {data.map((day, i) => {
          const height = (day.views / maxViews) * 160;
          return (
            <div key={day.date} className="analytics-bar-col" title={`${fmtDate(day.date)}: ${day.views} views`}>
              {day.views > 0 && <span className="analytics-bar-val">{day.views}</span>}
              <div className="analytics-bar" style={{ height: `${Math.max(height, 3)}px` }} />
              {(i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1) && (
                <span className="analytics-bar-label">{fmtDate(day.date)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="loading-skeleton">
          <div className="skeleton-content" style={{ height: '400px' }}></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Analytics"
      subtitle="Track your website performance"
      actions={
        <button className="admin-btn admin-btn-secondary" onClick={loadAnalytics}>
          🔄 Refresh
        </button>
      }
    >
      {/* Google Analytics Status */}
      {gaId && (
        <div className="admin-section">
          <div className="analytics-ga-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>Google Analytics connected: <strong>{gaId}</strong></span>
            <a href={`https://analytics.google.com`} target="_blank" rel="noopener noreferrer" className="analytics-ga-link">
              Open GA Dashboard →
            </a>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="admin-section">
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-label">Total Page Views</div>
            <div className="stat-card-value">{fmt(analytics?.totalPageViews)}</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--admin-primary)' }}>
            <div className="stat-card-label">Today</div>
            <div className="stat-card-value">{fmt(analytics?.todayPageViews)}</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #10b981' }}>
            <div className="stat-card-label">Last 7 Days</div>
            <div className="stat-card-value">{fmt(analytics?.weekPageViews)}</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="stat-card-label">Total Leads</div>
            <div className="stat-card-value">{fmt(analytics?.totalLeads)}</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="stat-card-label">New Leads</div>
            <div className="stat-card-value">{fmt(analytics?.newLeads)}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="admin-section">
        <h3 style={{ marginBottom: '16px' }}>Page Views — Last 30 Days</h3>
        <div className="card" style={{ padding: '20px' }}>
          {renderChart(analytics?.dailyViews)}
        </div>
      </div>

      {/* Top Pages */}
      <div className="admin-section">
        <h3 style={{ marginBottom: '16px' }}>Top Pages</h3>
        <div className="card">
          {analytics?.topPages?.length > 0 ? (
            <div className="analytics-pages-table">
              {analytics.topPages.map((page, i) => {
                const maxViews = analytics.topPages[0]?.views || 1;
                const barWidth = (page.views / maxViews) * 100;
                return (
                  <div key={page.page} className="analytics-page-row">
                    <span className="analytics-page-rank">{i + 1}</span>
                    <span className="analytics-page-name">/{page.page || '(homepage)'}</span>
                    <span className="analytics-page-views">{fmt(page.views)}</span>
                    <div className="analytics-page-bar-wrap">
                      <div className="analytics-page-bar" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="analytics-empty" style={{ padding: '40px' }}>
              <p>No page data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="admin-section">
        <div className="card" style={{ padding: '20px', background: 'var(--admin-info-bg, var(--admin-bg))' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>📊 How Analytics Work</h4>
          <p style={{ color: 'var(--admin-text-secondary)', margin: 0 }}>
            Page views are tracked automatically on every page load — no JavaScript required.
            {gaId
              ? ' For detailed traffic sources, devices, and behavior data, check your Google Analytics dashboard.'
              : ' For more detailed analytics, add your Google Analytics ID in Site Settings.'
            }
          </p>
        </div>
      </div>

      <style>{`
        .analytics-ga-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--admin-surface);
          border: 1px solid var(--admin-border);
          border-radius: 10px;
          font-size: 0.875rem;
          color: var(--admin-text-secondary);
          flex-wrap: wrap;
        }
        .analytics-ga-link {
          margin-left: auto;
          color: var(--admin-primary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .analytics-chart {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 220px;
          padding: 20px 0 10px;
        }
        .analytics-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }
        .analytics-bar-val {
          font-size: 9px;
          color: var(--admin-text-muted);
          white-space: nowrap;
        }
        .analytics-bar {
          width: 100%;
          max-width: 20px;
          background: var(--admin-primary);
          border-radius: 3px 3px 0 0;
          transition: height 0.3s ease;
        }
        .analytics-bar-label {
          font-size: 9px;
          color: var(--admin-text-muted);
          margin-top: 4px;
          white-space: nowrap;
        }

        .analytics-pages-table {
          display: flex;
          flex-direction: column;
        }
        .analytics-page-row {
          display: grid;
          grid-template-columns: 28px 1fr auto 120px;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--admin-border);
        }
        .analytics-page-row:last-child { border-bottom: none; }
        .analytics-page-rank {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .analytics-page-name {
          font-size: 0.9rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .analytics-page-views {
          font-weight: 600;
          text-align: right;
          font-size: 0.9rem;
        }
        .analytics-page-bar-wrap {
          height: 8px;
          background: var(--admin-bg);
          border-radius: 4px;
          overflow: hidden;
        }
        .analytics-page-bar {
          height: 100%;
          background: var(--admin-primary);
          border-radius: 4px;
        }

        .analytics-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--admin-text-secondary);
        }

        @media (max-width: 600px) {
          .analytics-page-row {
            grid-template-columns: 24px 1fr auto;
          }
          .analytics-page-bar-wrap { display: none; }
          .analytics-bar-val { display: none; }
        }
      `}</style>
    </AdminLayout>
  );
}

export default AdminAnalytics;
