import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TYPE_COLORS = {
  contact:   'bg-blue-500/20 text-blue-400',
  project:   'bg-purple-500/20 text-purple-400',
  job:       'bg-amber-500/20 text-amber-400',
  invoice:   'bg-green-500/20 text-green-400',
  quote:     'bg-cyan-500/20 text-cyan-400',
  expense:   'bg-red-500/20 text-red-400',
  document:  'bg-slate-500/20 text-slate-400',
  equipment: 'bg-orange-500/20 text-orange-400',
  vehicle:   'bg-indigo-500/20 text-indigo-400',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function RecycleBinPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/v1/recycle-bin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error('Could not load recycle bin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const restore = async (item) => {
    setRestoring(item.id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/v1/recycle-bin/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: item.type, id: item.id }),
      });
      if (!res.ok) throw new Error('Restore failed');
      toast.success(`${item.label} "${item.displayName}" restored`);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      toast.error('Could not restore — please try again');
    } finally {
      setRestoring(null);
    }
  };

  const filtered = items.filter(item => {
    const matchesSearch = !search || item.displayName?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const types = [...new Set(items.map(i => i.type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-slate-400" />
            Recycle Bin
          </h1>
          <p className="text-slate-400 mt-1">
            {items.length === 0
              ? 'No deleted items'
              : `${items.length} deleted item${items.length !== 1 ? 's' : ''} — restored within 30 days`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn btn-secondary gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300">
          Deleted items are kept for <strong>30 days</strong> before being permanently removed.
          Restore anything you need before then.
        </p>
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="input pl-9"
              placeholder="Search deleted items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">All types</option>
            {types.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
            ))}
          </select>
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="card p-12 text-center text-slate-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Trash2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">
            {items.length === 0 ? 'Nothing in the recycle bin' : 'No items match your search'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-800">
          {filtered.map(item => (
            <div key={`${item.type}-${item.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${TYPE_COLORS[item.type] || 'bg-slate-500/20 text-slate-400'}`}>
                  {item.label}
                </span>
                <span className="text-sm font-medium text-white truncate">{item.displayName}</span>
              </div>
              <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                <span className="text-xs text-slate-500">{timeAgo(item.deletedAt)}</span>
                <button
                  onClick={() => restore(item)}
                  disabled={restoring === item.id}
                  className="btn btn-secondary text-xs py-1.5 px-3 gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${restoring === item.id ? 'animate-spin' : ''}`} />
                  {restoring === item.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
