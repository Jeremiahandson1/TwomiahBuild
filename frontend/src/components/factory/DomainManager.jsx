import { useState } from 'react';
import { Globe, CheckCircle2, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const REGISTRAR_INSTRUCTIONS = {
  godaddy: {
    name: 'GoDaddy',
    steps: [
      'Log in at godaddy.com and go to My Products',
      'Find your domain and click DNS',
      'Delete any existing A record for @ (if present)',
      'Add a CNAME record: Name = www, Value = {renderDomain}',
      'Add an A record: Name = @, Value = 216.24.57.1',
      'Click Save and wait up to 48 hours for propagation',
    ],
  },
  namecheap: {
    name: 'Namecheap',
    steps: [
      'Log in at namecheap.com and go to Domain List',
      'Click Manage next to your domain',
      'Click Advanced DNS tab',
      'Add a CNAME Record: Host = www, Value = {renderDomain}',
      'Add an A Record: Host = @, Value = 216.24.57.1',
      'Click the checkmark to save each record',
    ],
  },
  cloudflare: {
    name: 'Cloudflare',
    steps: [
      'Log in at cloudflare.com and select your domain',
      'Click DNS in the left sidebar',
      'Add a CNAME record: Name = www, Target = {renderDomain}, Proxy = DNS only (gray cloud)',
      'Add an A record: Name = @, IPv4 = 216.24.57.1, Proxy = DNS only',
      'Click Save for each record',
      'Note: Keep proxy OFF (gray cloud) for Render to verify the domain',
    ],
  },
  google: {
    name: 'Google Domains / Squarespace',
    steps: [
      'Log in at domains.google.com (or squarespace.com/domains)',
      'Select your domain and click DNS',
      'Under Custom Records, add a CNAME: Host = www, Data = {renderDomain}',
      'Add an A record: Host = @, Data = 216.24.57.1',
      'Click Save',
    ],
  },
  bluehost: {
    name: 'Bluehost / HostGator',
    steps: [
      'Log in to your control panel and find Domain Manager or Zone Editor',
      'Select your domain and click Manage DNS',
      'Add a CNAME: Host = www, Points To = {renderDomain}',
      'Edit the A record for @ to point to 216.24.57.1',
      'Save changes — propagation can take up to 48 hours',
    ],
  },
  wix: {
    name: 'Wix',
    steps: [
      'Go to wix.com/account/domains and click Manage next to your domain',
      'Click Advanced DNS Settings',
      'Add a CNAME: Host = www, Value = {renderDomain}',
      'Update the A record for @ to 216.24.57.1',
      'Save and wait for propagation',
    ],
  },
};

export default function DomainManager({ customer, onUpdate, api }) {
  const [mode, setMode] = useState(null); // null | 'subdomain' | 'custom'
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [selectedRegistrar, setSelectedRegistrar] = useState('godaddy');
  const [showInstructions, setShowInstructions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);

  const currentDomain = customer.domain;
  const renderDomain = customer.siteUrl?.replace('https://', '') || `${customer.slug}-site.onrender.com`;

  async function handleSave() {
    const domain = mode === 'subdomain'
      ? `${subdomain || customer.slug}.twomiah.com`
      : customDomain;

    if (!domain) return;

    setSaving(true);
    try {
      const token = api.accessToken;
      const res = await fetch(`${API_URL}/v1/factory/customers/${customer.id}/domain`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, type: mode }),
      });
      if (res.ok) {
        onUpdate();
        setMode(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save domain');
      }
    } catch (e) {
      alert('Failed to save domain');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm('Remove this custom domain?')) return;
    try {
      const token = api.accessToken;
      await fetch(`${API_URL}/v1/factory/customers/${customer.id}/domain`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      onUpdate();
    } catch (e) {
      alert('Failed to remove domain');
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const registrar = REGISTRAR_INSTRUCTIONS[selectedRegistrar];
  const instructions = registrar?.steps.map(s => s.replace('{renderDomain}', renderDomain));

  return (
    <div className="space-y-4">
      {/* Current domain status */}
      {currentDomain ? (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">{currentDomain}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={`https://${currentDomain}`} target="_blank" rel="noopener noreferrer"
               className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Visit <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={handleRemove}
                    className="text-xs text-red-500 hover:text-red-700">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-500">
            Current: <span className="font-mono text-xs">{renderDomain}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">No custom domain set</p>
        </div>
      )}

      {/* Domain options */}
      {!mode && (
        <div className="flex gap-3">
          <button
            onClick={() => setMode('subdomain')}
            className="flex-1 p-3 border border-slate-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-800">Twomiah Subdomain</p>
            <p className="text-xs text-slate-500 mt-1">e.g. {customer.slug}.twomiah.com</p>
            <p className="text-xs text-emerald-600 mt-1">✓ No DNS setup needed</p>
          </button>
          <button
            onClick={() => setMode('custom')}
            className="flex-1 p-3 border border-slate-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-800">Custom Domain</p>
            <p className="text-xs text-slate-500 mt-1">e.g. www.theirbusiness.com</p>
            <p className="text-xs text-blue-600 mt-1">Requires DNS changes</p>
          </button>
        </div>
      )}

      {/* Subdomain setup */}
      {mode === 'subdomain' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={customer.slug}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-500">.twomiah.com</span>
          </div>
          <p className="text-xs text-slate-400">We'll provision this subdomain automatically. No DNS changes needed by the customer.</p>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Assign Subdomain'}
            </button>
            <button onClick={() => setMode(null)}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Custom domain setup */}
      {mode === 'custom' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Customer's Domain</label>
            <input
              type="text"
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value.toLowerCase().trim())}
              placeholder="www.theircustomdomain.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* DNS Records to add */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-slate-700">DNS Records to Add:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium text-slate-500">Type</div>
              <div className="font-medium text-slate-500">Name</div>
              <div className="font-medium text-slate-500">Value</div>
              <div className="font-mono text-slate-700">CNAME</div>
              <div className="font-mono text-slate-700">www</div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-700 truncate text-xs">{renderDomain}</span>
                <button onClick={() => copy(renderDomain, 'cname')} className="shrink-0">
                  {copied === 'cname' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />}
                </button>
              </div>
              <div className="font-mono text-slate-700">A</div>
              <div className="font-mono text-slate-700">@</div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-700">216.24.57.1</span>
                <button onClick={() => copy('216.24.57.1', 'arecord')}>
                  {copied === 'arecord' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Registrar instructions */}
          <div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Step-by-step DNS instructions
            </button>

            {showInstructions && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(REGISTRAR_INSTRUCTIONS).map(([key, r]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedRegistrar(key)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedRegistrar === key
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-semibold text-blue-800 mb-2">{registrar.name} Instructions:</p>
                  <ol className="space-y-1">
                    {instructions.map((step, i) => (
                      <li key={i} className="text-xs text-blue-700 flex gap-2">
                        <span className="font-bold shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !customDomain}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Domain'}
            </button>
            <button onClick={() => setMode(null)}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
