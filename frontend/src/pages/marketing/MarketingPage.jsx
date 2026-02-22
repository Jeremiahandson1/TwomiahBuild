import { useState, useEffect } from 'react';
import {
  Mail, Plus, Send, FileText, Zap, Star,
  Bell, Loader2, Edit2, Check,
  Megaphone, AlertCircle, RefreshCw,
  ExternalLink, ToggleLeft, ToggleRight,
  Phone, AtSign, TrendingUp, Users2,
  MousePointer, BarChart3, Pause, Play,
} from 'lucide-react';
import api from '../../services/api';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'campaigns',  label: 'Campaigns',       icon: Mail      },
  { id: 'sequences',  label: 'Drip Sequences',  icon: Zap       },
  { id: 'reviews',    label: 'Review Requests', icon: Star      },
  { id: 'leads',      label: 'Lead Alerts',     icon: Bell      },
  { id: 'ads',        label: 'Ad Campaigns',    icon: Megaphone },
  { id: 'templates',  label: 'Templates',       icon: FileText  },
];

// ─── Root page ────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [tab, setTab] = useState('campaigns');
  const [stats, setStats] = useState(null);
  const [reviewStats, setReviewStats] = useState(null);

  useEffect(() => {
    api.get('/api/v1/marketing/stats').then(setStats).catch(() => {});
    api.get('/api/v1/reviews/stats').then(setReviewStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing Automation</h1>
        <p className="text-gray-500 mt-0.5">Campaigns, review requests, lead alerts, and ads</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Mail}    label="Campaigns"         value={stats?.totalCampaigns   ?? '—'} color="orange" />
        <StatCard icon={Zap}     label="Active Sequences"  value={stats?.activeSequences  ?? '—'} color="purple" />
        <StatCard icon={Send}    label="Emails Sent (30d)" value={stats?.emailsSent30Days ?? '—'} color="blue"   />
        <StatCard icon={Star}    label="Reviews Earned"    value={reviewStats?.completed  ?? '—'} color="yellow" />
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap text-sm font-medium transition-colors ${
              tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'sequences' && <SequencesTab />}
      {tab === 'reviews'   && <ReviewsTab reviewStats={reviewStats} />}
      {tab === 'leads'     && <LeadAlertsTab />}
      {tab === 'ads'       && <AdsTab />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'gray' }) {
  const colors = { orange:'bg-orange-50 text-orange-600', purple:'bg-purple-50 text-purple-600', blue:'bg-blue-50 text-blue-600', yellow:'bg-yellow-50 text-yellow-600', green:'bg-green-50 text-green-600', gray:'bg-gray-50 text-gray-600' };
  return (
    <div className={`p-4 rounded-xl ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-2 opacity-70" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
}

// ─── Campaigns ───────────────────────────────────────────────────────────────
function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/v1/marketing/campaigns'); setCampaigns(d.data || []); }
    catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSend = async (id) => {
    if (!confirm('Send this campaign now?')) return;
    try { await api.post(`/api/v1/marketing/campaigns/${id}/send`); load(); }
    catch { alert('Failed to send'); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ActionBtn onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> New Campaign</ActionBtn></div>
      {campaigns.length === 0
        ? <Empty icon={Mail} text="No campaigns yet" sub="Create your first email campaign" action={<ActionBtn onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Campaign</ActionBtn>} />
        : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><Th>Campaign</Th><Th>Status</Th><Th right>Recipients</Th><Th right></Th></tr></thead>
              <tbody className="divide-y">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{c.name}</p><p className="text-sm text-gray-400">{c.subject}</p></td>
                    <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                    <Td right>{c._count?.recipients || 0}</Td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {c.status === 'draft' && <IconBtn onClick={() => handleSend(c.id)} title="Send now" color="green"><Send className="w-4 h-4" /></IconBtn>}
                        <IconBtn onClick={() => { setEditing(c); setShowForm(true); }}><Edit2 className="w-4 h-4" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      {showForm && <CampaignModal campaign={editing} onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
function ReviewsTab({ reviewStats }) {
  const [requests, setRequests] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('requests');

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, cfg] = await Promise.all([api.get('/api/v1/reviews/requests'), api.get('/api/v1/reviews/settings')]);
      setRequests(reqs.data || []); setSettings(cfg); setSettingsForm(cfg);
    } catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleResend = async (jobId) => {
    try { await api.post(`/api/v1/reviews/request/${jobId}`); load(); }
    catch { alert('Failed to send review request'); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await api.put('/api/v1/reviews/settings', settingsForm); setSettings(settingsForm); }
    catch { alert('Failed to save'); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {['requests','settings'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium capitalize ${view===v?'bg-orange-100 text-orange-700':'text-gray-500 hover:bg-gray-100'}`}>{v}</button>
          ))}
        </div>
        {reviewStats && (
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Sent: <strong className="text-gray-700">{reviewStats.sent}</strong></span>
            <span>Clicked: <strong className="text-gray-700">{reviewStats.clicked}</strong></span>
            <span>Earned: <strong className="text-yellow-600">{reviewStats.completed}</strong></span>
            <span>Conv: <strong className="text-green-600">{reviewStats.conversionRate}%</strong></span>
          </div>
        )}
      </div>

      {view === 'requests' && (
        requests.length === 0
          ? <Empty icon={Star} text="No review requests yet" sub="Review requests fire automatically 3 days after a job is marked complete." />
          : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><Th>Customer</Th><Th>Job</Th><Th>Sent</Th><Th>Status</Th><Th right></Th></tr></thead>
                <tbody className="divide-y">
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium text-gray-900">{r.contact?.name||'—'}</p><p className="text-sm text-gray-400">{r.contact?.phone||r.contact?.email||''}</p></td>
                      <td className="px-4 py-3 text-gray-600">{r.job?.title||`Job #${r.job?.number}`||'—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{r.sentAt?new Date(r.sentAt).toLocaleDateString():'—'}</td>
                      <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                      <td className="px-4 py-3">{r.status!=='completed'&&r.job?.id&&<IconBtn onClick={()=>handleResend(r.job.id)} title="Resend"><RefreshCw className="w-4 h-4" /></IconBtn>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {view === 'settings' && settingsForm && (
        <div className="bg-white rounded-xl border p-6 space-y-4 max-w-lg">
          <h3 className="font-semibold text-gray-900">Review Request Settings</h3>
          <Field label="Google Place ID" help="From your Google Business Profile URL"><input value={settingsForm.googlePlaceId||''} onChange={e=>setSettingsForm({...settingsForm,googlePlaceId:e.target.value})} className="input" placeholder="ChIJ..." /></Field>
          <Field label="Business Name"><input value={settingsForm.googleBusinessName||''} onChange={e=>setSettingsForm({...settingsForm,googleBusinessName:e.target.value})} className="input" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Send delay (hours)"><input type="number" value={settingsForm.reviewRequestDelay??72} min={1} onChange={e=>setSettingsForm({...settingsForm,reviewRequestDelay:+e.target.value})} className="input" /></Field>
            <Field label="Follow-up (days)"><input type="number" value={settingsForm.reviewFollowUpDelay??3} min={1} onChange={e=>setSettingsForm({...settingsForm,reviewFollowUpDelay:+e.target.value})} className="input" /></Field>
          </div>
          <div className="flex gap-4">
            <Toggle label="SMS" checked={settingsForm.reviewSmsEnabled!==false} onChange={v=>setSettingsForm({...settingsForm,reviewSmsEnabled:v})} />
            <Toggle label="Email" checked={settingsForm.reviewEmailEnabled!==false} onChange={v=>setSettingsForm({...settingsForm,reviewEmailEnabled:v})} />
          </div>
          <button onClick={saveSettings} disabled={saving} className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">{saving?'Saving…':'Save Settings'}</button>
        </div>
      )}
    </div>
  );
}

// ─── Lead Alerts ──────────────────────────────────────────────────────────────
function LeadAlertsTab() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/v1/marketing/lead-notifications')
      .then(setForm)
      .catch(()=>setForm({enabled:true,smsEnabled:true,emailEnabled:true,notifyPhone:'',notifyEmail:''}))
      .finally(()=>setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/api/v1/marketing/lead-notifications', form); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    catch { alert('Failed to save'); } finally { setSaving(false); }
  };

  if (loading||!form) return <Spinner />;
  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
        <Bell className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-orange-800">Speed-to-lead is everything</p>
          <p className="text-sm text-orange-700 mt-1">When a new lead enters BuildPro you'll get an instant SMS and email so you respond in minutes, not hours. Leads contacted within 5 minutes are 9× more likely to convert.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><p className="font-semibold text-gray-900">Lead Alerts</p><p className="text-sm text-gray-500">Notify me when a new lead is added</p></div>
          <Toggle checked={form.enabled} onChange={v=>setForm({...form,enabled:v})} />
        </div>
        {form.enabled && (<>
          <hr />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Phone className="w-4 h-4 text-gray-400" />SMS Alert</div>
              <Toggle checked={form.smsEnabled!==false} onChange={v=>setForm({...form,smsEnabled:v})} />
            </div>
            {form.smsEnabled!==false && <Field label="Notify phone"><input value={form.notifyPhone||''} onChange={e=>setForm({...form,notifyPhone:e.target.value})} className="input" placeholder="+17155550100" /></Field>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><AtSign className="w-4 h-4 text-gray-400" />Email Alert</div>
              <Toggle checked={form.emailEnabled!==false} onChange={v=>setForm({...form,emailEnabled:v})} />
            </div>
            {form.emailEnabled!==false && <Field label="Notify email"><input type="email" value={form.notifyEmail||''} onChange={e=>setForm({...form,notifyEmail:e.target.value})} className="input" placeholder="you@company.com" /></Field>}
          </div>
        </>)}
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">
          {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:saved?<><Check className="w-4 h-4"/>Saved!</>:'Save Settings'}
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How it works</p>
        {['Homeowner fills your website form → lead enters BuildPro automatically','You get SMS within 90 seconds with their name, phone, and email','You call back before a competitor even sees the notification','Lead → quote → job. The automation sells itself.'].map((s,i)=>(
          <div key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-orange-400 font-bold">{i+1}.</span><span>{s}</span></div>
        ))}
      </div>
    </div>
  );
}

// ─── Ads ──────────────────────────────────────────────────────────────────────
function AdsTab() {
  const [data, setData]                   = useState(null);
  const [accounts, setAccounts]           = useState([]);
  const [reports, setReports]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [perf, accts, rpts] = await Promise.all([
        api.get('/api/v1/ads/performance'),
        api.get('/api/v1/ads/accounts'),
        api.get('/api/v1/ads/reports'),
      ]);
      setData(perf);
      setAccounts(accts);
      setReports(rpts);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePause  = async (id) => { try { await api.post(`/api/v1/ads/campaigns/${id}/pause`);  load(); } catch { alert('Failed'); } };
  const handleResume = async (id) => { try { await api.post(`/api/v1/ads/campaigns/${id}/resume`); load(); } catch { alert('Failed'); } };
  const handleSync   = async ()    => { try { await api.post('/api/v1/ads/sync');                  load(); } catch { /* silent */ } };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try { await api.post('/api/v1/ads/reports/generate'); load(); }
    catch { alert('Failed to generate report'); } finally { setGeneratingReport(false); }
  };

  if (loading) return <Spinner />;

  const allCampaigns = data?.campaigns || [];
  const googleAccount = accounts.find(a => a.platform === 'google');
  const metaAccount   = accounts.find(a => a.platform === 'meta');
  const isConnected   = (a) => a?.status === 'connected';

  const fD = (n) => `$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fN = (n) => Number(n||0).toLocaleString();

  return (
    <div className="space-y-5">
      {/* Account connection status */}
      <div className="grid md:grid-cols-2 gap-4">
        <AccountCard platform="google" icon="🔍" name="Google Ads" account={googleAccount}
          onConnect={() => window.open('https://developers.google.com/google-ads/api/docs/access-levels','_blank')} />
        <AccountCard platform="meta"   icon="📘" name="Facebook & Instagram" account={metaAccount}
          onConnect={() => window.open('https://developers.facebook.com/docs/marketing-api/access','_blank')} />
      </div>

      {/* API approval reminder */}
      {!isConnected(googleAccount) && !isConnected(metaAccount) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Submit API applications to activate ad management</p>
            <div className="flex gap-4 mt-2">
              <a href="https://developers.google.com/google-ads/api/docs/access-levels" target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-amber-800 underline">Google Ads API <ExternalLink className="w-3 h-3" /></a>
              <a href="https://developers.facebook.com/docs/marketing-api/access" target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-amber-800 underline">Meta Marketing API <ExternalLink className="w-3 h-3" /></a>
            </div>
          </div>
        </div>
      )}

      {/* Performance summary */}
      {data?.totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp}   label="Total Spend"  value={fD(data.totals.spend)}       color="orange" />
          <StatCard icon={Users2}       label="Total Leads"  value={fN(data.totals.leads)}        color="blue"   />
          <StatCard icon={MousePointer} label="Cost / Lead"  value={fD(data.totals.costPerLead)}  color="purple" />
          <StatCard icon={BarChart3}    label="Total Clicks" value={fN(data.totals.clicks)}       color="green"  />
        </div>
      )}

      {/* Campaigns table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <p className="font-semibold text-gray-700">Campaigns</p>
          <button onClick={handleSync}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Sync
          </button>
        </div>
        {allCampaigns.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">No campaigns yet</p>
            <p className="text-sm text-gray-400 mt-1">Campaigns are created during contractor onboarding via Factory</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              <Th>Campaign</Th><Th>Platform</Th><Th>Type</Th><Th>Status</Th>
              <Th right>Budget/day</Th><Th right>Spend</Th><Th right>Leads</Th><Th right>CPL</Th><Th right></Th>
            </tr></thead>
            <tbody className="divide-y">
              {allCampaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 max-w-xs truncate">{c.name}</p></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.platform==='google'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>
                      {c.platform === 'google' ? '🔍 Google' : '📘 Meta'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{c.campaignType?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <Td right>{fD(c.dailyBudget)}</Td>
                  <Td right>{fD(c.totalSpend)}</Td>
                  <Td right>{fN(c.leads)}</Td>
                  <Td right>{c.leads > 0 ? fD(Number(c.totalSpend)/c.leads) : '—'}</Td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {c.status === 'active' && <IconBtn onClick={() => handlePause(c.id)}  title="Pause"  color="yellow"><Pause className="w-4 h-4" /></IconBtn>}
                      {c.status === 'paused' && <IconBtn onClick={() => handleResume(c.id)} title="Resume" color="green"><Play  className="w-4 h-4" /></IconBtn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reports */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <p className="font-semibold text-gray-700">Monthly Reports</p>
          <button onClick={handleGenerateReport} disabled={generatingReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {generatingReport
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
              : <><Send className="w-3.5 h-3.5" /> Generate Now</>}
          </button>
        </div>
        {reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Reports are generated on the 1st of each month and emailed to the contractor.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              <Th>Period</Th><Th right>Spend</Th><Th right>Leads</Th><Th right>CPL</Th><Th right>Revenue</Th><Th>Email</Th>
            </tr></thead>
            <tbody className="divide-y">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {new Date(r.periodStart).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
                  </td>
                  <Td right>{fD(r.totalSpend)}</Td>
                  <Td right>{fN(r.totalLeads)}</Td>
                  <Td right>{fD(r.costPerLead)}</Td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{fD(r.revenueAttributed)}</td>
                  <td className="px-4 py-3"><StatusPill status={r.emailStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pricing reference */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b"><p className="font-semibold text-gray-700">Marketing Module Pricing</p></div>
        <div className="divide-y">
          {[
            ['Starter','$500/mo','Up to $1,500/mo','Google Ads, lead alerts, monthly report'],
            ['Growth','$1,000/mo','Up to $3,000/mo','+ Facebook/Instagram, review automation'],
            ['Scale','$1,500/mo','Unlimited','+ Full stack: website, CRM, visualizer, marketing'],
          ].map(([tier,price,spend,features]) => (
            <div key={tier} className="flex items-center px-5 py-3 gap-4 flex-wrap">
              <div className="w-16 font-semibold text-gray-800">{tier}</div>
              <div className="w-24 text-orange-600 font-bold">{price}</div>
              <div className="w-40 text-sm text-gray-500">{spend} ad spend</div>
              <div className="text-sm text-gray-600">{features}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountCard({ platform, icon, name, account, onConnect }) {
  const connected = account?.status === 'connected';
  return (
    <div className={`bg-white rounded-xl border p-4 ${connected ? 'border-green-300' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <p className="font-semibold text-gray-900">{name}</p>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {connected ? 'Connected' : 'Pending approval'}
        </span>
      </div>
      {connected
        ? <p className="text-sm text-gray-600">Account: <strong>{account.accountName || account.accountId}</strong></p>
        : <button onClick={onConnect} className="w-full mt-1 px-3 py-2 border border-dashed border-gray-300 text-gray-400 rounded-lg text-sm hover:border-orange-400 hover:text-orange-500 transition-colors">
            Submit API application →
          </button>
      }
    </div>
  );
}



// ─── Sequences ────────────────────────────────────────────────────────────────
function SequencesTab() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/v1/marketing/sequences'); setSequences(d||[]); }
    catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ActionBtn onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Sequence</ActionBtn></div>
      {sequences.length === 0
        ? <Empty icon={Zap} text="No drip sequences" sub="Automate follow-up emails triggered by customer actions" action={<ActionBtn onClick={()=>setShowForm(true)}><Plus className="w-4 h-4" /> New Sequence</ActionBtn>} />
        : (
          <div className="space-y-3">
            {sequences.map(s=>(
              <div key={s.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.active?'bg-green-100':'bg-gray-100'}`}>
                      <Zap className={`w-5 h-5 ${s.active?'text-green-600':'text-gray-400'}`} />
                    </div>
                    <div><p className="font-semibold text-gray-900">{s.name}</p><p className="text-sm text-gray-500">{s.steps?.length||0} steps · {s._count?.enrollments||0} enrolled · {s.trigger}</p></div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${s.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{s.active?'Active':'Paused'}</span>
                </div>
                {s.steps?.length>0&&(
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                    {s.steps.map((step,i)=>(
                      <div key={step.id} className="flex items-center">
                        <div className="px-3 py-2 bg-gray-50 rounded-lg text-xs whitespace-nowrap">
                          <p className="font-medium">Step {step.stepNumber}</p>
                          <p className="text-gray-400">{step.delayDays?`${step.delayDays}d`:''}{step.delayHours?` ${step.delayHours}h`:''}{!step.delayDays&&!step.delayHours?'Now':''}</p>
                        </div>
                        {i<s.steps.length-1&&<div className="w-6 h-0.5 bg-gray-200 mx-1"/>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
      {showForm&&<SequenceModal onSave={()=>{setShowForm(false);load();}} onClose={()=>setShowForm(false)} />}
    </div>
  );
}

// ─── Templates ────────────────────────────────────────────────────────────────
function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/v1/marketing/templates'); setTemplates(d||[]); }
    catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ActionBtn onClick={()=>{setEditing(null);setShowForm(true);}}><Plus className="w-4 h-4" /> New Template</ActionBtn></div>
      {templates.length===0
        ? <Empty icon={FileText} text="No templates" sub="Create reusable email templates" action={<ActionBtn onClick={()=>setShowForm(true)}><Plus className="w-4 h-4" /> New Template</ActionBtn>} />
        : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t=>(
              <div key={t.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div><p className="font-semibold text-gray-900">{t.name}</p><span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{t.category}</span></div>
                  <IconBtn onClick={()=>{setEditing(t);setShowForm(true);}}><Edit2 className="w-4 h-4" /></IconBtn>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{t.subject}</p>
              </div>
            ))}
          </div>
        )
      }
      {showForm&&<TemplateModal template={editing} onSave={()=>{setShowForm(false);load();}} onClose={()=>setShowForm(false)} />}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function CampaignModal({ campaign, onSave, onClose }) {
  const [form, setForm] = useState({ name:campaign?.name||'', subject:campaign?.subject||'', body:campaign?.body||'', audienceType:campaign?.audienceType||'all' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { campaign?await api.put(`/api/v1/marketing/campaigns/${campaign.id}`,form):await api.post('/api/v1/marketing/campaigns',form); onSave(); } catch { alert('Failed to save'); } finally { setSaving(false); } };
  return (
    <ModalShell title={campaign?'Edit Campaign':'New Campaign'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Campaign Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required /></Field>
        <Field label="Subject Line"><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="input" required /></Field>
        <Field label="Audience"><select value={form.audienceType} onChange={e=>setForm({...form,audienceType:e.target.value})} className="input"><option value="all">All Contacts</option><option value="segment">Segment</option></select></Field>
        <Field label="Email Body (HTML)"><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} className="input font-mono text-sm" rows={8} /><p className="text-xs text-gray-400 mt-1">Variables: {'{{name}}'}, {'{{firstName}}'}, {'{{company}}'}</p></Field>
        <ModalFooter saving={saving} onClose={onClose} label={campaign?'Save':'Create Campaign'} />
      </form>
    </ModalShell>
  );
}

function TemplateModal({ template, onSave, onClose }) {
  const [form, setForm] = useState({ name:template?.name||'', subject:template?.subject||'', body:template?.body||'', category:template?.category||'general' });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { template?await api.put(`/api/v1/marketing/templates/${template.id}`,form):await api.post('/api/v1/marketing/templates',form); onSave(); } catch { alert('Failed to save'); } finally { setSaving(false); } };
  return (
    <ModalShell title={template?'Edit Template':'New Template'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required /></Field>
          <Field label="Category"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input">{['general','followup','promotion','newsletter','reminder'].map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Subject"><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="input" required /></Field>
        <Field label="Body (HTML)"><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} className="input font-mono text-sm" rows={8} /></Field>
        <ModalFooter saving={saving} onClose={onClose} label={template?'Save':'Create Template'} />
      </form>
    </ModalShell>
  );
}

function SequenceModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:'', trigger:'manual', steps:[{delayDays:0,delayHours:0,subject:'',body:''}] });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { await api.post('/api/v1/marketing/sequences',form); onSave(); } catch { alert('Failed to save'); } finally { setSaving(false); } };
  const updStep = (i,k,v) => { const s=[...form.steps]; s[i][k]=v; setForm({...form,steps:s}); };
  return (
    <ModalShell title="New Drip Sequence" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required /></Field>
          <Field label="Trigger"><select value={form.trigger} onChange={e=>setForm({...form,trigger:e.target.value})} className="input">{[['manual','Manual'],['new_customer','New Customer'],['quote_sent','Quote Sent'],['invoice_paid','Invoice Paid']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><p className="font-medium text-gray-700">Steps</p><button type="button" onClick={()=>setForm({...form,steps:[...form.steps,{delayDays:1,delayHours:0,subject:'',body:''}]})} className="text-sm text-orange-600 hover:text-orange-700 font-medium">+ Add Step</button></div>
          {form.steps.map((s,i)=>(
            <div key={i} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-4"><span className="font-medium text-gray-700">Step {i+1}</span><div className="flex items-center gap-2 text-sm text-gray-500">Delay:<input type="number" value={s.delayDays} min={0} onChange={e=>updStep(i,'delayDays',+e.target.value)} className="w-14 border rounded px-2 py-1 text-sm" />days<input type="number" value={s.delayHours} min={0} onChange={e=>updStep(i,'delayHours',+e.target.value)} className="w-14 border rounded px-2 py-1 text-sm" />hrs</div></div>
              <input value={s.subject} onChange={e=>updStep(i,'subject',e.target.value)} className="input" placeholder="Subject line" />
              <textarea value={s.body} onChange={e=>updStep(i,'body',e.target.value)} className="input text-sm" rows={3} placeholder="Email body (HTML)" />
            </div>
          ))}
        </div>
        <ModalFooter saving={saving} onClose={onClose} label="Create Sequence" />
      </form>
    </ModalShell>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className={`relative bg-white rounded-xl shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto ${wide?'max-w-3xl':'max-w-2xl'}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">×</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalFooter({ saving, onClose, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">Cancel</button>
      <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">{saving?'Saving…':label}</button>
    </div>
  );
}

function Field({ label, help, children }) {
  return (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}{help&&<span className="ml-2 text-xs text-gray-400 font-normal">{help}</span>}</label>{children}</div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={()=>onChange(!checked)} className="flex items-center gap-2">
      {checked?<ToggleRight className="w-8 h-8 text-orange-500"/>:<ToggleLeft className="w-8 h-8 text-gray-300"/>}
      {label&&<span className="text-sm text-gray-700">{label}</span>}
    </button>
  );
}

function StatusPill({ status }) {
  const map={draft:'bg-gray-100 text-gray-600',scheduled:'bg-blue-100 text-blue-700',sending:'bg-yellow-100 text-yellow-700',sent:'bg-green-100 text-green-700',completed:'bg-green-100 text-green-700',pending:'bg-yellow-100 text-yellow-700',clicked:'bg-blue-100 text-blue-700',failed:'bg-red-100 text-red-700'};
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${map[status]||'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function Th({ children, right }) { return <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${right?'text-right':'text-left'}`}>{children}</th>; }
function Td({ children, right }) { return <td className={`px-4 py-3 text-gray-600 ${right?'text-right':''}`}>{children}</td>; }

function ActionBtn({ onClick, children }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">{children}</button>;
}

function IconBtn({ onClick, title, color, children }) {
  return <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-colors ${color==='green'?'text-green-600 hover:bg-green-50':'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>{children}</button>;
}

function Spinner() { return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>; }

function Empty({ icon: Icon, text, sub, action }) {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-xl">
      <Icon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
      <p className="font-medium text-gray-700">{text}</p>
      {sub&&<p className="text-sm text-gray-400 mt-1">{sub}</p>}
      {action&&<div className="mt-4">{action}</div>}
    </div>
  );
}
