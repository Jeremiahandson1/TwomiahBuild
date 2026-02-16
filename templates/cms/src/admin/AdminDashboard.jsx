import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { services } from '../data/services';
import { getActivity, getLeads, getTrash, getCustomPages } from './api';

function AdminDashboard() {
  const [recentActivity, setRecentActivity] = useState([]);
  const [leadStats, setLeadStats] = useState({ total: 0, new: 0 });
  const [trashCount, setTrashCount] = useState(0);
  const [customPageCount, setCustomPageCount] = useState(0);
  
  const totalPages = 1 + services.length + services.reduce((acc, s) => acc + (s.subServices?.length || 0), 0) + customPageCount;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [activity, leads, trash, customPages] = await Promise.all([
        getActivity().catch(() => []),
        getLeads().catch(() => []),
        getTrash().catch(() => []),
        getCustomPages().catch(() => [])
      ]);
      
      setRecentActivity((activity || []).slice(0, 5));
      setLeadStats({
        total: (leads || []).length,
        new: (leads || []).filter(l => l.status === 'new').length
      });
      setTrashCount((trash || []).length);
      setCustomPageCount((customPages || []).length);
    } catch (err) {
      console.error('Failed to load dashboard data');
    }
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const getActionIcon = (action) => {
    const icons = { 
      'login': '🔐', 
      'page_saved': '💾', 
      'page_created': '➕',
      'page_deleted': '🗑️',
      'page_duplicated': '📋', 
      'page_restored': '↩️',
      'image_uploaded': '🖼️',
      'image_deleted': '🗑️',
      'settings_updated': '⚙️',
      'redirect_created': '↗️',
      'lead_received': '📬'
    };
    return icons[action] || '📝';
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome to {{COMPANY_NAME}} Admin">
      {/* Stats */}
      <div className="admin-section">
        <div className="stat-cards">
          <Link to="/leads" className="stat-card" style={{ textDecoration: 'none', borderLeft: leadStats.new > 0 ? '3px solid var(--admin-primary)' : undefined }}>
            <div className="stat-card-label">New Leads</div>
            <div className="stat-card-value" style={{ color: leadStats.new > 0 ? 'var(--admin-primary)' : undefined }}>
              {leadStats.new}
            </div>
            <div className="stat-card-change">{leadStats.total} total</div>
          </Link>
          <div className="stat-card">
            <div className="stat-card-label">Total Pages</div>
            <div className="stat-card-value">{totalPages}</div>
            <div className="stat-card-change">All editable</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Services</div>
            <div className="stat-card-value">{services.length}</div>
            <div className="stat-card-change">Main categories</div>
          </div>
          <Link to="/trash" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-card-label">In Trash</div>
            <div className="stat-card-value">{trashCount}</div>
            <div className="stat-card-change">Recoverable</div>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-section">
        <h2>Quick Actions</h2>
        <div className="admin-cards">
          <Link to="/leads" className="admin-card">
            <h3>📬 View Leads</h3>
            <p>{leadStats.new > 0 ? `${leadStats.new} new leads waiting` : 'Manage contact form submissions'}</p>
          </Link>
          <Link to="/edit/home" className="admin-card">
            <h3>🏠 Edit Home Page</h3>
            <p>Update hero section, images, and content</p>
          </Link>
          <Link to="/pages" className="admin-card">
            <h3>📄 Manage Pages</h3>
            <p>Edit or create pages</p>
          </Link>
          <Link to="/media" className="admin-card">
            <h3>🖼️ Media Library</h3>
            <p>Upload and organize images</p>
          </Link>
          <Link to="/site-settings" className="admin-card">
            <h3>⚙️ Site Settings</h3>
            <p>Company info, branding, SEO</p>
          </Link>
          <Link to="/activity" className="admin-card">
            <h3>📊 Activity & Backup</h3>
            <p>View logs, export/import data</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Recent Activity</h2>
            <Link to="/activity" style={{ fontSize: '0.875rem', color: 'var(--admin-primary)' }}>View all →</Link>
          </div>
          <div className="activity-list">
            {recentActivity.map(a => (
              <div key={a.id} className="activity-item">
                <span className="activity-icon">{getActionIcon(a.action)}</span>
                <div className="activity-content">
                  <span className="activity-label">{a.action.replace(/_/g, ' ')}</span>
                  <span className="activity-time">{formatTime(a.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="admin-section">
        <h2>Keyboard Shortcuts</h2>
        <div className="admin-card" style={{ maxWidth: '500px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.875rem' }}>
            <div><kbd style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>⌘K</kbd> Search</div>
            <div><kbd style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>⌘S</kbd> Save</div>
            <div><kbd style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>⌘Z</kbd> Undo</div>
            <div><kbd style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>⌘⇧Z</kbd> Redo</div>
            <div><kbd style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>⌘D</kbd> Dark Mode</div>
            <div><kbd style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>ESC</kbd> Close</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
