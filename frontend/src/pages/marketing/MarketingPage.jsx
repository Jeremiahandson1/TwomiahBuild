/**
 * Twomiah Build Marketing Hub
 * /marketing — Paid Ads Management (Google + Meta)
 * Spec: February 2026
 *
 * Tabs: Overview · Campaigns · Leads · Reports · Settings
 */

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Megaphone, Users, BarChart2, Settings,
  TrendingUp, TrendingDown, DollarSign, MousePointer,
  AlertTriangle, Play, Pause, Plus, RefreshCw, Download, Send,
  ChevronRight, ChevronDown, ChevronUp, Phone, Mail, MapPin,
  ToggleLeft, ToggleRight, Pencil, Loader2, X, Check, Info,
  Star, Bell, Wifi, Zap, Globe
} from 'lucide-react';
import api from '../../services/api';

const ORANGE = '#f97316';

// ─── Platform icons ─────────────────────────────────────────────────────────
function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MetaIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function PlatformIcon({ platform, size = 16 }) {
  if (platform === 'google') return <GoogleIcon size={size} />;
  if (platform === 'meta') return <MetaIcon size={size} />;
  return <Globe size={size} className="text-gray-400" />;
}

// ─── Status badge ───────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  paused:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  draft:     'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  ended:     'bg-red-50 text-red-700 ring-1 ring-red-200',
  new:       'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  contacted: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  qualified: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  won:       'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  lost:      'bg-red-50 text-red-700 ring-1 ring-red-200',
  connected: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending:   'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
};

function StatusBadge({ status, pulse = false }) {
  const cls = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {pulse && status === 'new' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
        </span>
      )}
      {status}
    </span>
  );
}

// ─── Shared UI primitives ───────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all";

function Field({ label, help, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {help && <span className="ml-2 text-xs text-gray-400 font-normal">{help}</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, wide, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, trend, trendLabel, icon: Icon, color = 'orange', prefix = '', suffix = '' }) {
  const isPositive = trend >= 0;
  const colorMap = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {trendLabel && <div className="text-xs text-gray-400 mt-0.5">{trendLabel}</div>}
    </div>
  );
}

// ─── DEMO DATA ──────────────────────────────────────────────────────────────
const DEMO_CAMPAIGNS = [
  { id: 'c1', platform: 'google', name: 'Spring Roofing Leads', type: 'Search', status: 'active', dailyBudget: 85, totalSpend: 2340, leads: 28, impressions: 41200, clicks: 892, headlines: ['Free Roof Estimates', 'Local Roofing Experts', 'Same-Day Service'], descriptions: ['Licensed & insured roofing contractor serving Eau Claire. Call today for a free estimate.', 'Trusted by 500+ homeowners. Storm damage specialists.'] },
  { id: 'c2', platform: 'meta', name: 'Home Remodel Awareness', type: 'Awareness', status: 'active', dailyBudget: 50, totalSpend: 1450, leads: 19, impressions: 98400, clicks: 1240 },
  { id: 'c3', platform: 'google', name: 'Emergency Repairs – Local', type: 'Search', status: 'paused', dailyBudget: 60, totalSpend: 890, leads: 11, impressions: 18700, clicks: 401 },
  { id: 'c4', platform: 'meta', name: 'Before/After Deck Build', type: 'Conversion', status: 'draft', dailyBudget: 35, totalSpend: 0, leads: 0, impressions: 0, clicks: 0 },
];

const DEMO_LEADS = [
  { id: 'l1', platform: 'google', name: 'Marcus Johnson', phone: '(715) 442-8831', email: 'marcus.j@gmail.com', received: '2 min ago', campaign: 'Spring Roofing Leads', status: 'new', zip: '54701', question: 'Looking for full roof replacement, 2,200 sq ft home' },
  { id: 'l2', platform: 'meta', name: 'Sarah Tremblay', phone: '(715) 881-2204', email: 'stremblay@yahoo.com', received: '18 min ago', campaign: 'Home Remodel Awareness', status: 'contacted', zip: '54703', question: 'Kitchen and bathroom remodel, flexible timeline' },
  { id: 'l3', platform: 'google', name: 'Derek Paulsen', phone: '(715) 320-7741', email: 'dpaulsen@hotmail.com', received: '1 hr ago', campaign: 'Spring Roofing Leads', status: 'qualified', zip: '54720', question: 'Storm damage repair — need estimate ASAP' },
  { id: 'l4', platform: 'google', name: 'Linda Gustafson', phone: '(715) 993-0022', email: 'lgustafson@gmail.com', received: '3 hr ago', campaign: 'Emergency Repairs', status: 'won', zip: '54701', question: 'Gutters and fascia replacement' },
  { id: 'l5', platform: 'meta', name: 'Ben Kowalski', phone: '(715) 556-3318', email: 'bkowalski@work.com', received: '5 hr ago', campaign: 'Home Remodel Awareness', status: 'lost', zip: '54703', question: 'Addition build — decided to go with competitor' },
];

const DEMO_REPORTS = [
  { id: 'r1', month: 'January 2026', spend: 5820, leads: 67, cpl: 86.87, jobsWon: 8, revenue: 42400, roi: 628 },
  { id: 'r2', month: 'December 2025', spend: 4980, leads: 52, cpl: 95.77, jobsWon: 6, revenue: 31200, roi: 526 },
  { id: 'r3', month: 'November 2025', spend: 4400, leads: 44, cpl: 100, jobsWon: 5, revenue: 27500, roi: 525 },
];

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({ accounts, campaigns, onConnectAccount, onToggleCampaign }) {
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.totalSpend, 0);
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pendingAccounts = accounts.filter(a => a.status === 'pending');

  return (
    <div className="space-y-6">
      {pendingAccounts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Connect your ad accounts to activate campaigns</p>
            <p className="text-sm text-amber-700 mt-0.5">{pendingAccounts.map(a => a.name).join(' and ')} not connected.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {pendingAccounts.map(a => (
              <button key={a.id} onClick={() => onConnectAccount(a.id)}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors">
                Connect {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Spend (30d)" value={totalSpend} prefix="$" trend={12} trendLabel="vs last month" icon={DollarSign} color="orange" />
        <KPICard label="Total Leads (30d)" value={totalLeads} trend={8} trendLabel="vs last month" icon={Users} color="blue" />
        <KPICard label="Cost Per Lead" value={cpl.toFixed(2)} prefix="$" trend={-5} trendLabel="improving" icon={MousePointer} color="green" />
        <KPICard label="Active Campaigns" value={activeCampaigns} icon={Megaphone} color="purple" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Campaigns</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {campaigns.map(c => {
            const cpl = c.leads > 0 ? (c.totalSpend / c.leads).toFixed(2) : '—';
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group">
                <div className="flex-shrink-0"><PlatformIcon platform={c.platform} size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
                  <div className="text-right"><div className="font-semibold text-gray-900">${c.dailyBudget}/day</div><div className="text-xs">budget</div></div>
                  <div className="text-right"><div className="font-semibold text-gray-900">{c.leads}</div><div className="text-xs">leads/mo</div></div>
                  <div className="text-right"><div className="font-semibold text-gray-900">${cpl}</div><div className="text-xs">CPL</div></div>
                </div>
                <button onClick={() => onToggleCampaign(c.id)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-600">
                  {c.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
            );
          })}
          {campaigns.length === 0 && (
            <div className="text-center py-10">
              <Megaphone size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">No campaigns yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CAMPAIGN CREATOR (3 steps) ──────────────────────────────────────────────
function CampaignCreatorModal({ open, onClose, editItem, onSave }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ platform: 'google', name: '', type: 'Search', status: 'draft', dailyBudget: '', headlines: ['', '', ''], descriptions: ['', ''], targetZips: '', vertical: 'roofing' });

  useEffect(() => {
    if (open) {
      setStep(0);
      setForm(editItem || { platform: 'google', name: '', type: 'Search', status: 'draft', dailyBudget: '', headlines: ['', '', ''], descriptions: ['', ''], targetZips: '', vertical: 'roofing' });
    }
  }, [open, editItem]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updArr = (k, i, v) => setForm(f => { const arr = [...f[k]]; arr[i] = v; return { ...f, [k]: arr }; });
  const STEPS = ['Platform & Type', 'Ad Copy', 'Budget & Targeting'];

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post('/api/v1/marketing/ads/campaigns', form).catch(() => {});
      onSave({ ...form, id: editItem?.id || `c${Date.now()}`, totalSpend: editItem?.totalSpend || 0, leads: editItem?.leads || 0, impressions: editItem?.impressions || 0, clicks: editItem?.clicks || 0 });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? 'Edit Campaign' : 'New Ad Campaign'} wide>
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${i <= step ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-orange-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Platform" required>
            <div className="grid grid-cols-2 gap-3">
              {['google', 'meta'].map(p => (
                <button key={p} onClick={() => upd('platform', p)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${form.platform === p ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <PlatformIcon platform={p} size={22} />
                  <span className="font-semibold text-gray-900">{p === 'meta' ? 'Meta (Facebook)' : 'Google Ads'}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Campaign Name" required>
            <input className={inputCls} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Spring Roofing Leads 2026" />
          </Field>
          <Field label="Campaign Type">
            <select className={inputCls} value={form.type} onChange={e => upd('type', e.target.value)}>
              {(form.platform === 'google' ? ['Search', 'Performance Max', 'Display'] : ['Awareness', 'Conversion', 'Lead Gen']).map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Service Vertical">
            <select className={inputCls} value={form.vertical} onChange={e => upd('vertical', e.target.value)}>
              {['roofing', 'general contracting', 'HVAC', 'plumbing', 'electrical', 'remodeling', 'landscaping'].map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Headlines <span className="text-gray-400 font-normal">(up to 30 chars each)</span></label>
            {form.headlines.map((h, i) => (
              <div key={i} className="mb-2">
                <input className={inputCls} value={h} onChange={e => updArr('headlines', i, e.target.value)} placeholder={`Headline ${i + 1}`} maxLength={30} />
                <div className="text-right text-xs text-gray-400 mt-0.5">{h.length}/30</div>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descriptions <span className="text-gray-400 font-normal">(up to 90 chars each)</span></label>
            {form.descriptions.map((d, i) => (
              <div key={i} className="mb-2">
                <textarea className={inputCls + ' resize-none'} value={d} onChange={e => updArr('descriptions', i, e.target.value)} placeholder={`Description ${i + 1}`} maxLength={90} rows={2} />
                <div className="text-right text-xs text-gray-400 mt-0.5">{d.length}/90</div>
              </div>
            ))}
          </div>
          {(form.headlines[0] || form.descriptions[0]) && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ad Preview</div>
              <div className="text-blue-700 text-sm font-semibold">{form.headlines.filter(Boolean).join(' | ')}</div>
              <div className="text-green-700 text-xs mt-0.5">www.yourcompany.com</div>
              <div className="text-gray-700 text-sm mt-1">{form.descriptions.filter(Boolean).join(' ')}</div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Daily Budget" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input className={inputCls + ' pl-7'} type="number" value={form.dailyBudget} onChange={e => upd('dailyBudget', e.target.value)} placeholder="50" min={5} />
            </div>
            {form.dailyBudget && <p className="text-xs text-gray-400 mt-1">~${(form.dailyBudget * 30.4).toFixed(0)}/month estimated</p>}
          </Field>
          <Field label="Target ZIP Codes" help="comma separated">
            <input className={inputCls} value={form.targetZips} onChange={e => upd('targetZips', e.target.value)} placeholder="54701, 54703, 54720" />
          </Field>
          <div className="bg-orange-50 rounded-xl p-4 text-sm">
            <div className="font-semibold text-orange-800 mb-1 flex items-center gap-1.5"><Info size={14} /> What happens next</div>
            <p className="text-orange-700">Campaign will be saved as Draft until your ad account is connected in Settings.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
          className="px-4 py-2 text-gray-600 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < 2
          ? <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.name}
              className="px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors">
              Continue →
            </button>
          : <button onClick={handleSubmit} disabled={saving || !form.dailyBudget}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editItem ? 'Save Changes' : 'Create Campaign'}
            </button>
        }
      </div>
    </Modal>
  );
}

// ─── CAMPAIGN DETAIL VIEW ────────────────────────────────────────────────────
function CampaignDetail({ campaign, onBack, onToggle }) {
  const [syncing, setSyncing] = useState(false);
  const cpl = campaign.leads > 0 ? (campaign.totalSpend / campaign.leads).toFixed(2) : '—';
  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';

  const handleSync = async () => {
    setSyncing(true);
    await api.get(`/api/v1/marketing/ads/campaigns/${campaign.id}/sync`).catch(() => {});
    setTimeout(() => setSyncing(false), 900);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← Back</button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <PlatformIcon platform={campaign.platform} size={20} />
          <h2 className="font-bold text-gray-900 text-lg truncate">{campaign.name}</h2>
          <StatusBadge status={campaign.status} />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync Now
          </button>
          <button onClick={() => onToggle(campaign.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${campaign.status === 'active' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {campaign.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Spend', value: `$${campaign.totalSpend.toLocaleString()}` },
          { label: 'Impressions', value: campaign.impressions.toLocaleString() },
          { label: 'Clicks', value: campaign.clicks.toLocaleString() },
          { label: 'CTR', value: `${ctr}%` },
          { label: 'Leads', value: campaign.leads },
          { label: 'CPL', value: `$${cpl}` },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-sm">
            <div className="text-lg font-bold text-gray-900">{m.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {campaign.headlines && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-3">Ad Copy Preview</h3>
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 max-w-lg">
            <div className="text-blue-700 text-sm font-semibold">{campaign.headlines.filter(Boolean).join(' | ') || campaign.name}</div>
            <div className="text-green-700 text-xs mt-0.5">www.yourcompany.com</div>
            <div className="text-gray-700 text-sm mt-1">{(campaign.descriptions || []).filter(Boolean).join(' ') || 'Professional contractor services. Free estimates.'}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-3">Settings</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Daily Budget</span><div className="font-semibold text-gray-900 mt-0.5">${campaign.dailyBudget}/day</div></div>
          <div><span className="text-gray-500">Type</span><div className="font-semibold text-gray-900 mt-0.5">{campaign.type}</div></div>
          <div><span className="text-gray-500">Platform</span><div className="flex items-center gap-1.5 mt-0.5"><PlatformIcon platform={campaign.platform} size={14} /><span className="font-semibold text-gray-900 capitalize">{campaign.platform}</span></div></div>
          <div><span className="text-gray-500">Platform Campaign ID</span><div className="font-mono text-xs text-gray-600 mt-0.5">{campaign.platformId || 'Not activated yet'}</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── CAMPAIGNS TAB ───────────────────────────────────────────────────────────
function CampaignsTab({ campaigns, setCampaigns }) {
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreator, setShowCreator] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const detail = detailId ? campaigns.find(c => c.id === detailId) : null;

  if (detail) return (
    <CampaignDetail campaign={detail} onBack={() => setDetailId(null)}
      onToggle={id => setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c))} />
  );

  const filtered = campaigns.filter(c => {
    if (platformFilter !== 'all' && c.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const handleToggle = id => setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status } : c));
  const handleSave = data => {
    if (data.id && campaigns.find(c => c.id === data.id)) setCampaigns(cs => cs.map(c => c.id === data.id ? { ...c, ...data } : c));
    else setCampaigns(cs => [...cs, data]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {['all', 'google', 'meta'].map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${platformFilter === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {p !== 'all' && <PlatformIcon platform={p} size={14} />}
              {p === 'all' ? 'All Platforms' : p === 'google' ? 'Google' : 'Meta'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {['all', 'active', 'paused', 'draft'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button onClick={() => { setEditItem(null); setShowCreator(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm">
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Budget</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Spend</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">CPL</th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => {
              const cpl = c.leads > 0 ? `$${(c.totalSpend / c.leads).toFixed(2)}` : '—';
              return (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5"><PlatformIcon platform={c.platform} size={18} /></td>
                  <td className="px-4 py-3.5 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3.5 text-gray-500">{c.type}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3.5 text-right text-gray-700">${c.dailyBudget}/day</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-900">${c.totalSpend.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{c.leads}</td>
                  <td className="px-4 py-3.5 text-right text-gray-700">{cpl}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditItem(c); setShowCreator(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Edit"><Pencil size={14} /></button>
                      {['active', 'paused'].includes(c.status) && (
                        <button onClick={() => handleToggle(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title={c.status === 'active' ? 'Pause' : 'Resume'}>
                          {c.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                      <button onClick={() => setDetailId(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="View Detail"><ChevronRight size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No campaigns match filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <CampaignCreatorModal open={showCreator} onClose={() => { setShowCreator(false); setEditItem(null); }} editItem={editItem} onSave={handleSave} />
    </div>
  );
}

// ─── LEADS TAB ───────────────────────────────────────────────────────────────
function LeadsTab({ leads, setLeads }) {
  const [expandedId, setExpandedId] = useState(null);
  const [smsDraft, setSmsDraft] = useState('');
  const [smsTarget, setSmsTarget] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const pollRef = useRef(null);

  useEffect(() => {
    const poll = () => api.get('/api/v1/marketing/ads/leads').then(data => { if (Array.isArray(data)) setLeads(data); }).catch(() => {});
    pollRef.current = setInterval(poll, 60000);
    return () => clearInterval(pollRef.current);
  }, []);

  const updateStatus = (id, status) => setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
  const addToCRM = async (lead) => {
    await api.post('/api/v1/contacts', { name: lead.name, phone: lead.phone, email: lead.email, source: lead.platform === 'google' ? 'google_ads' : 'facebook' }).catch(() => {});
    setAddedIds(s => new Set([...s, lead.id]));
  };
  const openSMS = (lead) => {
    setSmsTarget(lead);
    setSmsDraft(`Hi ${lead.name.split(' ')[0]}, this is [company]. We saw your inquiry about ${lead.campaign?.toLowerCase().includes('roof') ? 'roofing' : 'home improvement'} and wanted to follow up. Are you still looking for a contractor?`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Bell size={16} className="text-blue-500 flex-shrink-0" />
        <span className="text-sm text-blue-800 flex-1">
          Leads are being sent to <strong>your phone</strong> via SMS and <strong>your email</strong>.{' '}
          <button className="underline hover:no-underline">Change in Settings</button>
        </span>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
          <Zap size={12} /> Auto-follow-up: ON
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Lead Feed</h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
            Live · refreshes every 60s
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {leads.map(lead => (
            <div key={lead.id}>
              <div onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 cursor-pointer transition-colors">
                <PlatformIcon platform={lead.platform} size={18} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{lead.name}</span>
                    <StatusBadge status={lead.status} pulse />
                    <span className="text-xs text-gray-400">{lead.received}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">{lead.campaign}</div>
                </div>
                <div className="hidden sm:block text-sm text-gray-600 font-medium">{lead.phone}</div>
                {expandedId === lead.id ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
              </div>
              {expandedId === lead.id && (
                <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                    <div><span className="text-gray-400 text-xs">Phone</span><div className="font-medium text-gray-900 flex items-center gap-1.5 mt-0.5"><Phone size={12} />{lead.phone}</div></div>
                    <div><span className="text-gray-400 text-xs">Email</span><div className="font-medium text-gray-900 flex items-center gap-1.5 mt-0.5"><Mail size={12} className="flex-shrink-0" /><span className="truncate">{lead.email}</span></div></div>
                    <div><span className="text-gray-400 text-xs">ZIP</span><div className="font-medium text-gray-900 flex items-center gap-1.5 mt-0.5"><MapPin size={12} />{lead.zip}</div></div>
                    <div>
                      <span className="text-gray-400 text-xs">Status</span>
                      <select className="block mt-0.5 border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                        value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}>
                        {['new', 'contacted', 'qualified', 'won', 'lost'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  {lead.question && (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 text-sm text-gray-700">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lead Message</span>
                      <p className="mt-1">{lead.question}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => addToCRM(lead)} disabled={addedIds.has(lead.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${addedIds.has(lead.id) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                      {addedIds.has(lead.id) ? <><Check size={13} /> Added to CRM</> : <><Users size={13} /> Add to CRM</>}
                    </button>
                    <button onClick={() => openSMS(lead)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      <Send size={13} /> Send SMS
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">No leads yet — they'll appear here as your ads run</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!smsTarget} onClose={() => setSmsTarget(null)} title={`Send SMS to ${smsTarget?.name}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm"><div className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-1">To</div><div className="flex items-center gap-2"><Phone size={13} />{smsTarget?.phone}</div></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea className={inputCls + ' resize-none'} rows={4} value={smsDraft} onChange={e => setSmsDraft(e.target.value)} />
            <div className="text-right text-xs text-gray-400 mt-0.5">{smsDraft.length} chars</div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setSmsTarget(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={async () => { await api.post('/api/v1/marketing/sms', { to: smsTarget.phone, body: smsDraft }).catch(() => {}); setSmsTarget(null); }}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 flex items-center justify-center gap-2">
              <Send size={14} /> Send SMS
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── REPORTS TAB ─────────────────────────────────────────────────────────────
function ReportsTab({ reports }) {
  const [generating, setGenerating] = useState(false);
  const [detailReport, setDetailReport] = useState(null);
  const barMax = Math.max(...reports.map(r => r.leads), 1);

  const generateReport = async () => {
    setGenerating(true);
    await api.post('/api/v1/marketing/ads/reports/generate').catch(() => {});
    setTimeout(() => setGenerating(false), 1200);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Performance Reports</h3>
          <p className="text-sm text-gray-500 mt-0.5">Auto-generated on the 1st of each month</p>
        </div>
        <button onClick={generateReport} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition-colors shadow-sm">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Generate Now
        </button>
      </div>

      <div className="grid gap-4">
        {reports.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="font-bold text-gray-900">{r.month}</h4>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${r.roi > 500 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.roi}% ROI</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><div className="font-bold text-gray-900">${r.spend.toLocaleString()}</div><div className="text-xs text-gray-400">Spend</div></div>
                  <div><div className="font-bold text-gray-900">{r.leads}</div><div className="text-xs text-gray-400">Leads</div></div>
                  <div><div className="font-bold text-gray-900">${r.cpl.toFixed(2)}</div><div className="text-xs text-gray-400">CPL</div></div>
                  <div><div className="font-bold text-emerald-600">${r.revenue.toLocaleString()}</div><div className="text-xs text-gray-400">Revenue Attr.</div></div>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(r.leads / barMax) * 100}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{r.leads} leads this month</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setDetailReport(r)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">View</button>
                <button onClick={() => api.post(`/api/v1/marketing/ads/reports/${r.id}/resend`).catch(() => {})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Resend</button>
              </div>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <BarChart2 size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">No reports yet — generate your first one above</p>
          </div>
        )}
      </div>

      <Modal open={!!detailReport} onClose={() => setDetailReport(null)} title={`${detailReport?.month} — Full Report`} wide>
        {detailReport && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Spend', value: `$${detailReport.spend.toLocaleString()}` },
                { label: 'Total Leads', value: detailReport.leads },
                { label: 'Cost Per Lead', value: `$${detailReport.cpl.toFixed(2)}` },
                { label: 'Jobs Won', value: detailReport.jobsWon },
                { label: 'Revenue Attr.', value: `$${detailReport.revenue.toLocaleString()}`, highlight: true },
                { label: 'ROI', value: `${detailReport.roi}%`, highlight: true },
              ].map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <div className={`text-base font-bold ${m.highlight ? 'text-emerald-600' : 'text-gray-900'}`}>{m.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <div className="font-semibold mb-1 flex items-center gap-1.5"><Info size={14} /> Revenue Attribution</div>
              {detailReport.jobsWon} jobs totaling ${detailReport.revenue.toLocaleString()} were attributed to paid ad campaigns this month.
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => api.get(`/api/v1/marketing/ads/reports/${detailReport.id}/pdf`).catch(() => {})}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Download size={14} /> Download PDF
              </button>
              <button onClick={() => api.post(`/api/v1/marketing/ads/reports/${detailReport.id}/email`).catch(() => {})}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600">
                <Send size={14} /> Send to Email
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────────────────
function SettingsTab({ accounts, setAccounts, campaigns }) {
  const [notifications, setNotifications] = useState({ phone: '', email: '', autoFollowup: true, reviewRequest: true });
  const [connecting, setConnecting] = useState(null);
  const [saving, setSaving] = useState(false);
  const totalDailyBudget = campaigns.filter(c => c.status === 'active').reduce((s, c) => s + (Number(c.dailyBudget) || 0), 0);

  const handleConnect = async id => {
    setConnecting(id);
    await new Promise(r => setTimeout(r, 1200));
    setAccounts(as => as.map(a => a.id === id ? { ...a, status: 'connected', accountId: `AW-${Math.floor(Math.random() * 999999999)}` } : a));
    setConnecting(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Ad Account Connections</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {accounts.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <PlatformIcon platform={a.platform} size={22} />
                </div>
                <div><div className="font-bold text-gray-900">{a.name}</div><StatusBadge status={a.status} /></div>
              </div>
              {a.status === 'connected' ? (
                <>
                  <div className="text-xs text-gray-400 mb-3">Account: <span className="font-mono">{a.accountId}</span></div>
                  <button onClick={() => setAccounts(as => as.map(x => x.id === a.id ? { ...x, status: 'pending', accountId: null } : x))}
                    className="w-full px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                    Disconnect
                  </button>
                </>
              ) : (
                <button onClick={() => handleConnect(a.id)} disabled={connecting === a.id}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {connecting === a.id ? <><Loader2 size={14} className="animate-spin" /> Connecting…</> : `Connect ${a.name}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4">Lead Notifications</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SMS Phone Number">
              <input className={inputCls} type="tel" value={notifications.phone} onChange={e => setNotifications(n => ({ ...n, phone: e.target.value }))} placeholder="(715) 555-0100" />
            </Field>
            <Field label="Email Address">
              <input className={inputCls} type="email" value={notifications.email} onChange={e => setNotifications(n => ({ ...n, email: e.target.value }))} placeholder="you@company.com" />
            </Field>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <div className="font-medium text-gray-900 text-sm">90-Second Auto Follow-up</div>
              <div className="text-xs text-gray-400 mt-0.5">SMS new leads within 90 seconds of arriving</div>
            </div>
            <button onClick={() => setNotifications(n => ({ ...n, autoFollowup: !n.autoFollowup }))}>
              {notifications.autoFollowup ? <ToggleRight size={28} className="text-orange-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Star size={16} className="text-amber-400" /> Review Request Automation</h3>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <div className="font-medium text-gray-900 text-sm">Auto-send review requests</div>
            <div className="text-xs text-gray-400 mt-0.5">Google review request 3 days after job completion</div>
          </div>
          <button onClick={() => setNotifications(n => ({ ...n, reviewRequest: !n.reviewRequest }))}>
            {notifications.reviewRequest ? <ToggleRight size={28} className="text-orange-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-1">Budget Overview</h3>
        <p className="text-xs text-gray-400 mb-4">Read-only · edit per-campaign in the Campaigns tab</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="text-2xl font-bold text-orange-600">${totalDailyBudget}</div>
            <div className="text-sm text-orange-700 mt-0.5">Daily budget (active campaigns)</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">${(totalDailyBudget * 30.4).toFixed(0)}</div>
            <div className="text-sm text-gray-500 mt-0.5">Est. monthly spend</div>
          </div>
        </div>
      </div>

      <button onClick={async () => { setSaving(true); await api.put('/api/v1/marketing/ads/settings', notifications).catch(() => {}); setTimeout(() => setSaving(false), 600); }}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-60 transition-colors shadow-sm">
        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Settings</>}
      </button>
    </div>
  );
}

// ─── SETUP WIZARD ─────────────────────────────────────────────────────────────
function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const STEPS = [
    { title: 'Welcome to Marketing Hub', desc: 'Manage Google and Meta ad campaigns, track every lead, and see exactly what your ad spend earns you.' },
    { title: 'Connect Google Ads', desc: 'Link your Google Ads account to activate search campaigns and start capturing local leads.' },
    { title: 'Connect Meta Ads', desc: 'Link your Facebook/Instagram ad account to run awareness and conversion campaigns.' },
    { title: "You're all set!", desc: 'Create your first campaign to start generating leads.' },
  ];
  const { title, desc } = STEPS[step];
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center mx-auto mb-5">
          <Megaphone size={28} style={{ color: ORANGE }} />
        </div>
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-orange-500' : i < step ? 'w-3 bg-orange-300' : 'w-3 bg-gray-200'}`} />)}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 mb-8">{desc}</p>
        <div className="flex gap-3 justify-center">
          {step > 0 && step < STEPS.length - 1 && (
            <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 text-gray-600 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Skip for now</button>
          )}
          <button onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : onComplete()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: ORANGE }}>
            {step === 0 ? "Let's go →" : step < STEPS.length - 1 ? 'Connect →' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'leads',     label: 'Leads',     icon: Users },
  { id: 'reports',   label: 'Reports',   icon: BarChart2 },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

export default function MarketingPage() {
  const [tab, setTab] = useState('overview');
  const [campaigns, setCampaigns] = useState(DEMO_CAMPAIGNS);
  const [leads, setLeads] = useState(DEMO_LEADS);
  const [reports] = useState(DEMO_REPORTS);
  const [accounts, setAccounts] = useState([
    { id: 'google', platform: 'google', name: 'Google Ads', status: 'connected', accountId: 'AW-123456789' },
    { id: 'meta',   platform: 'meta',   name: 'Meta Ads',   status: 'pending',   accountId: null },
  ]);
  const [wizardDone, setWizardDone] = useState(false);

  const allPending = accounts.every(a => a.status === 'pending');
  if (allPending && !wizardDone) {
    return <div className="min-h-screen bg-gray-50"><SetupWizard onComplete={() => setWizardDone(true)} /></div>;
  }

  const newLeadsCount = leads.filter(l => l.status === 'new').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ORANGE }}>
                <Megaphone size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Marketing Hub</h1>
            </div>
            <p className="text-sm text-gray-500 ml-10.5">Paid ads · Lead tracking · Performance reports</p>
          </div>
          {accounts.some(a => a.status === 'connected') && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <Wifi size={12} /> Connected
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-sm p-1 rounded-2xl w-fit">
          {TABS.map(t => {
            const active = tab === t.id;
            const badge = t.id === 'leads' && newLeadsCount > 0 ? newLeadsCount : null;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${active ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                style={active ? { background: ORANGE } : {}}>
                <t.icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
                {badge && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{badge}</span>}
              </button>
            );
          })}
        </div>

        {tab === 'overview'  && <OverviewTab accounts={accounts} campaigns={campaigns} onConnectAccount={() => setTab('settings')} onToggleCampaign={id => setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status } : c))} />}
        {tab === 'campaigns' && <CampaignsTab campaigns={campaigns} setCampaigns={setCampaigns} />}
        {tab === 'leads'     && <LeadsTab leads={leads} setLeads={setLeads} />}
        {tab === 'reports'   && <ReportsTab reports={reports} />}
        {tab === 'settings'  && <SettingsTab accounts={accounts} setAccounts={setAccounts} campaigns={campaigns} />}
      </div>
    </div>
  );
}
