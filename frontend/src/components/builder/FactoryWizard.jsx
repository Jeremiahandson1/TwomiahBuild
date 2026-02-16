import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Layout, Briefcase, ChevronRight, ChevronLeft, Check,
  Building2, Palette, Settings2, Download, Loader2, Package,
  Search, CheckSquare, Square, ChevronDown, ChevronUp, Zap, AlertCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── PRESETS ───────────────────────────────────────────────────────

const CRM_PRESETS = [
  {
    id: 'service-starter',
    name: 'Service Starter',
    description: 'HVAC, plumbing, electrical, cleaning',
    icon: '🔧',
    features: [
      'contacts', 'jobs', 'quotes', 'invoices', 'scheduling', 'team', 'dashboard',
      'drag_drop_calendar', 'recurring_jobs', 'online_booking', 'time_tracking',
      'online_payments', 'expense_tracking', 'two_way_texting', 'google_reviews'
    ]
  },
  {
    id: 'project-pro',
    name: 'Project Pro',
    description: 'Remodeling, roofing, general contracting',
    icon: '🏗️',
    features: [
      'contacts', 'jobs', 'quotes', 'invoices', 'scheduling', 'team', 'dashboard',
      'projects', 'change_orders', 'daily_logs', 'time_tracking', 'photo_capture',
      'expense_tracking', 'online_payments', 'consumer_financing', 'documents',
      'client_portal', 'google_reviews'
    ]
  },
  {
    id: 'contractor-suite',
    name: 'Contractor Suite',
    description: 'Full commercial construction',
    icon: '🏢',
    features: [
      'contacts', 'jobs', 'quotes', 'invoices', 'scheduling', 'team', 'dashboard',
      'projects', 'rfis', 'change_orders', 'punch_lists', 'daily_logs', 'inspections',
      'bid_management', 'takeoff_tools', 'selections', 'time_tracking', 'gps_tracking',
      'photo_capture', 'equipment_tracking', 'online_payments', 'expense_tracking',
      'job_costing', 'documents', 'reports', 'client_portal'
    ]
  },
  {
    id: 'everything',
    name: 'Enterprise',
    description: 'Every feature enabled',
    icon: '🚀',
    features: 'all'
  }
];


// ─── MAIN WIZARD ───────────────────────────────────────────────────

const STORAGE_KEY = 'buildpro-factory-wizard';

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return null;
}

export default function FactoryWizard() {
  const saved = loadSavedState();

  const [step, setStep] = useState(saved?.step || 0);
  const [featureRegistry, setFeatureRegistry] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Config state
  const [config, setConfig] = useState(saved?.config || {
    products: [],
    company: {
      name: '', email: '', phone: '', address: '', city: '', state: '', zip: '',
      domain: '', ownerName: '', industry: '', serviceRegion: '',
      nearbyCities: ['', '', '', ''],
    },
    branding: {
      primaryColor: '#f97316',
      secondaryColor: '#1e3a5f',
    },
    features: {
      website: [],
      crm: [],
    }
  });

  // Persist state on change (debounced to avoid excessive writes)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Don't persist logo/favicon base64 — too large for localStorage
        const toSave = {
          step,
          config: {
            ...config,
            branding: {
              ...config.branding,
              logo: config.branding.logo ? '[uploaded]' : null,
              favicon: config.branding.favicon ? '[uploaded]' : null,
            }
          }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) { /* ignore quota errors */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [step, config]);

  const clearSavedState = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Load feature registry on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/factory/features`)
      .then(r => r.json())
      .then(data => setFeatureRegistry(data))
      .catch(() => {
        // Use hardcoded fallback if API is down
        setFeatureRegistry({ website: [], crm: [] });
      });
  }, []);

  const steps = [
    { label: 'Products', icon: Package },
    { label: 'Company', icon: Building2 },
    { label: 'Branding', icon: Palette },
    { label: 'Features', icon: Settings2 },
    { label: 'Generate', icon: Download },
  ];

  const updateCompany = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, company: { ...prev.company, [key]: value } }));
  }, []);

  const updateBranding = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, branding: { ...prev.branding, [key]: value } }));
  }, []);

  const toggleProduct = useCallback((productId) => {
    setConfig(prev => {
      const products = prev.products.includes(productId)
        ? prev.products.filter(p => p !== productId)
        : [...prev.products, productId];
      return { ...prev, products };
    });
  }, []);

  const [validationErrors, setValidationErrors] = useState({});

  const validateEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => !phone || phone.replace(/\D/g, '').length >= 10;
  const validateDomain = (domain) => !domain || /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/.test(domain);
  const validateZip = (zip) => !zip || /^\d{5}(-\d{4})?$/.test(zip);
  const validateState = (state) => !state || /^[A-Z]{2}$/i.test(state);

  const canProceed = () => {
    const c = config.company;
    switch (step) {
      case 0: return config.products.length > 0;
      case 1: {
        const errors = {};
        if (!c.name.trim()) errors.name = 'Company name is required';
        if (c.email && !validateEmail(c.email)) errors.email = 'Invalid email format';
        if (c.phone && !validatePhone(c.phone)) errors.phone = 'Phone must be at least 10 digits';
        if (c.domain && !validateDomain(c.domain)) errors.domain = 'Invalid domain format';
        if (c.zip && !validateZip(c.zip)) errors.zip = 'Invalid ZIP code';
        if (c.state && !validateState(c.state)) errors.state = '2-letter code';
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
      }
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/factory/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
      clearSavedState();
    } catch (err) {
      setError(err.message);
    }
    setGenerating(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>BuildPro Factory</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Generate deployable software packages for your customers</p>
        {(step > 0 || config.company.name) && !result && (
          <button
            onClick={() => { clearSavedState(); setStep(0); setConfig({
              products: [], company: { name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', domain: '', ownerName: '', industry: '', serviceRegion: '', nearbyCities: ['', '', '', ''] },
              branding: { primaryColor: '#f97316', secondaryColor: '#1e3a5f' }, features: { website: [], crm: [] }
            }); }}
            style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, textDecoration: 'underline' }}
          >Start over</button>
        )}
      </div>

      {/* Stepper */}
      <Stepper steps={steps} current={step} />

      {/* Step Content */}
      <div style={{ background: 'white', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: 24 }}>
        {step === 0 && <ProductSelector products={config.products} onToggle={toggleProduct} />}
        {step === 1 && <CompanyForm company={config.company} onChange={updateCompany} errors={validationErrors} />}
        {step === 2 && <BrandingForm branding={config.branding} onChange={updateBranding} />}
        {step === 3 && <FeatureStep config={config} setConfig={setConfig} registry={featureRegistry} />}
        {step === 4 && (
          <ReviewStep
            config={config}
            registry={featureRegistry}
            generating={generating}
            result={result}
            error={error}
            onGenerate={handleGenerate}
          />
        )}
      </div>

      {/* Nav Buttons */}
      {!result && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              background: step === 0 ? '#e5e7eb' : 'white', border: '1px solid #d1d5db',
              borderRadius: 8, cursor: step === 0 ? 'default' : 'pointer', color: '#374151',
              opacity: step === 0 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={18} /> Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
                background: canProceed() ? '#f97316' : '#e5e7eb', color: canProceed() ? 'white' : '#9ca3af',
                border: 'none', borderRadius: 8, cursor: canProceed() ? 'pointer' : 'default',
                fontWeight: 600,
              }}
            >
              Next <ChevronRight size={18} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}


// ─── STEPPER ───────────────────────────────────────────────────────

function Stepper({ steps, current }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: isActive ? '#fff7ed' : isDone ? '#f0fdf4' : '#f9fafb',
              borderRadius: 8,
              border: isActive ? '2px solid #f97316' : isDone ? '2px solid #22c55e' : '2px solid #e5e7eb',
            }}>
              {isDone ? <Check size={16} color="#22c55e" /> : <Icon size={16} color={isActive ? '#f97316' : '#9ca3af'} />}
              <span style={{
                fontSize: '0.8rem', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f97316' : isDone ? '#22c55e' : '#9ca3af',
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight size={14} color="#d1d5db" style={{ margin: '0 2px' }} />}
          </div>
        );
      })}
    </div>
  );
}


// ─── STEP 1: PRODUCT SELECTION ─────────────────────────────────────

function ProductSelector({ products, onToggle }) {
  const items = [
    { id: 'website', name: 'Website', desc: 'Server-rendered site with SEO, blog, gallery, contact forms', icon: Globe, color: '#3b82f6' },
    { id: 'cms', name: 'CMS Admin Panel', desc: 'Full content management — pages, media, settings, leads', icon: Layout, color: '#8b5cf6' },
    { id: 'crm', name: 'CRM', desc: 'Business management — contacts, jobs, invoices, scheduling, 85+ features', icon: Briefcase, color: '#f97316' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Select Products</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Choose which products to include in this build. Any combination works.</p>
      
      <div style={{ display: 'grid', gap: 16 }}>
        {items.map(item => {
          const Icon = item.icon;
          const selected = products.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => onToggle(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: 20,
                border: selected ? `2px solid ${item.color}` : '2px solid #e5e7eb',
                borderRadius: 12, cursor: 'pointer',
                background: selected ? `${item.color}08` : 'white',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected ? item.color : '#f3f4f6',
              }}>
                <Icon size={24} color={selected ? 'white' : '#6b7280'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{item.name}</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>{item.desc}</div>
              </div>
              <div style={{
                width: 24, height: 24, borderRadius: 6, border: selected ? `2px solid ${item.color}` : '2px solid #d1d5db',
                background: selected ? item.color : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected && <Check size={14} color="white" />}
              </div>
            </div>
          );
        })}
      </div>

      {products.includes('website') && products.includes('cms') && (
        <div style={{ marginTop: 16, padding: 12, background: '#eff6ff', borderRadius: 8, fontSize: '0.85rem', color: '#1e40af' }}>
          💡 CMS will be bundled inside the Website package at <code>/admin</code>
        </div>
      )}
    </div>
  );
}


// ─── STEP 2: COMPANY INFO ──────────────────────────────────────────

function CompanyForm({ company, onChange, errors = {} }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Company Information</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>This info gets embedded throughout the generated package.</p>

      <div style={{ display: 'grid', gap: 16 }}>
        <FormRow>
          <Field label="Company Name *" value={company.name} onChange={v => onChange('name', v)} placeholder="Acme Construction" error={errors.name} />
          <Field label="Industry" value={company.industry} onChange={v => onChange('industry', v)} placeholder="General Contractor" />
        </FormRow>

        <FormRow>
          <Field label="Owner / Operator Name" value={company.ownerName} onChange={v => onChange('ownerName', v)} placeholder="John Smith" />
          <Field label="Email" value={company.email} onChange={v => onChange('email', v)} placeholder="info@acmeconstruction.com" type="email" error={errors.email} />
        </FormRow>

        <FormRow>
          <Field label="Phone" value={company.phone} onChange={v => onChange('phone', v)} placeholder="(555) 123-4567" error={errors.phone} />
          <Field label="Domain" value={company.domain} onChange={v => onChange('domain', v)} placeholder="acmeconstruction.com" error={errors.domain} />
        </FormRow>

        <Field label="Street Address" value={company.address} onChange={v => onChange('address', v)} placeholder="123 Main Street" />

        <FormRow>
          <Field label="City" value={company.city} onChange={v => onChange('city', v)} placeholder="Your City" />
          <Field label="State" value={company.state} onChange={v => onChange('state', v)} placeholder="WI" style={{ maxWidth: 100 }} error={errors.state} />
          <Field label="ZIP" value={company.zip} onChange={v => onChange('zip', v)} placeholder="54701" style={{ maxWidth: 120 }} error={errors.zip} />
        </FormRow>

        <Field label="Service Region Name" value={company.serviceRegion} onChange={v => onChange('serviceRegion', v)} placeholder="Chippewa Valley" />

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>
            Nearby Cities (for service area pages)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                value={company.nearbyCities[i] || ''}
                onChange={e => {
                  const cities = [...(company.nearbyCities || ['', '', '', ''])];
                  cities[i] = e.target.value;
                  onChange('nearbyCities', cities);
                }}
                placeholder={`Nearby city ${i + 1}`}
                style={inputStyle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── STEP 3: BRANDING ──────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: 'Orange', primary: '#f97316', secondary: '#1e3a5f' },
  { name: 'Blue', primary: '#3b82f6', secondary: '#1e293b' },
  { name: 'Green', primary: '#22c55e', secondary: '#14532d' },
  { name: 'Red', primary: '#ef4444', secondary: '#1c1917' },
  { name: 'Purple', primary: '#8b5cf6', secondary: '#1e1b4b' },
  { name: 'Teal', primary: '#14b8a6', secondary: '#134e4a' },
  { name: 'Slate', primary: '#64748b', secondary: '#0f172a' },
  { name: 'Amber', primary: '#f59e0b', secondary: '#292524' },
];

function BrandingForm({ branding, onChange }) {
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange('logo', reader.result);
      onChange('logoFilename', file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert('Favicon must be under 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange('favicon', reader.result);
      onChange('faviconFilename', file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Branding</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Set the visual identity. These colors appear throughout the site and CRM.</p>

      {/* Logo + Favicon */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 8, display: 'block' }}>Company Logo</label>
          <div style={{
            border: '2px dashed #d1d5db', borderRadius: 12, padding: 20, textAlign: 'center',
            background: branding.logo ? '#f9fafb' : 'white', cursor: 'pointer', position: 'relative',
            minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {branding.logo ? (
              <div>
                <img src={branding.logo} alt="Logo preview" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>{branding.logoFilename}</div>
                <button onClick={(e) => { e.stopPropagation(); onChange('logo', null); onChange('logoFilename', null); }}
                  style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click or drag to upload</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>PNG, SVG, JPG — max 2MB</div>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleLogoUpload}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 8, display: 'block' }}>Favicon</label>
          <div style={{
            border: '2px dashed #d1d5db', borderRadius: 12, padding: 20, textAlign: 'center',
            background: branding.favicon ? '#f9fafb' : 'white', cursor: 'pointer', position: 'relative',
            minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {branding.favicon ? (
              <div>
                <img src={branding.favicon} alt="Favicon preview" style={{ maxHeight: 48, maxWidth: 48, objectFit: 'contain' }} />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>{branding.faviconFilename}</div>
                <button onClick={(e) => { e.stopPropagation(); onChange('favicon', null); onChange('faviconFilename', null); }}
                  style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click to upload</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ICO, PNG — max 500KB</div>
              </div>
            )}
            <input type="file" accept="image/*,.ico" onChange={handleFaviconUpload}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      {/* Color Presets */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 8, display: 'block' }}>Quick Presets</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COLOR_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => { onChange('primaryColor', preset.primary); onChange('secondaryColor', preset.secondary); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                border: branding.primaryColor === preset.primary ? '2px solid #f97316' : '2px solid #e5e7eb',
                borderRadius: 8, background: 'white', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', gap: 2 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: preset.primary }} />
                <div style={{ width: 16, height: 16, borderRadius: 4, background: preset.secondary }} />
              </div>
              <span style={{ fontSize: '0.8rem' }}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <FormRow>
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Primary Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={branding.primaryColor} onChange={e => onChange('primaryColor', e.target.value)}
              style={{ width: 48, height: 40, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            <input value={branding.primaryColor} onChange={e => onChange('primaryColor', e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', maxWidth: 120 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Secondary Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={branding.secondaryColor} onChange={e => onChange('secondaryColor', e.target.value)}
              style={{ width: 48, height: 40, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            <input value={branding.secondaryColor} onChange={e => onChange('secondaryColor', e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', maxWidth: 120 }} />
          </div>
        </div>
      </FormRow>

      {/* Preview */}
      <div style={{ marginTop: 24, padding: 20, background: '#f9fafb', borderRadius: 12 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 12, display: 'block' }}>Preview</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: branding.primaryColor, color: 'white', padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
            Primary Button
          </div>
          <div style={{ background: branding.secondaryColor, color: 'white', padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
            Secondary Button
          </div>
          <div style={{ border: `2px solid ${branding.primaryColor}`, color: branding.primaryColor, padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
            Outline
          </div>
        </div>
        <div style={{
          marginTop: 12, height: 4, borderRadius: 2,
          background: `linear-gradient(90deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
        }} />
      </div>
    </div>
  );
}


// ─── STEP 4: FEATURES ──────────────────────────────────────────────

function FeatureStep({ config, setConfig, registry }) {
  const hasWebsite = config.products.includes('website');
  const hasCRM = config.products.includes('crm');
  const [tab, setTab] = useState(hasCRM ? 'crm' : 'website');

  if (!hasWebsite && !hasCRM) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
        <Settings2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
        <p>No products with configurable features selected.</p>
        <p style={{ fontSize: '0.85rem' }}>CMS features are managed through the admin panel after deployment.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Configure Features</h2>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Select which features to enable for each product.</p>

      {/* Tabs if both products */}
      {hasWebsite && hasCRM && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          <button onClick={() => setTab('crm')} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
            background: tab === 'crm' ? '#f97316' : '#f3f4f6', color: tab === 'crm' ? 'white' : '#6b7280',
          }}>CRM Features ({config.features.crm.length})</button>
          <button onClick={() => setTab('website')} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
            background: tab === 'website' ? '#3b82f6' : '#f3f4f6', color: tab === 'website' ? 'white' : '#6b7280',
          }}>Website Features ({config.features.website.length})</button>
        </div>
      )}

      {tab === 'crm' && hasCRM && (
        <CRMFeatures
          selected={config.features.crm}
          onChange={features => setConfig(prev => ({ ...prev, features: { ...prev.features, crm: features } }))}
          registry={registry?.crm || []}
        />
      )}

      {tab === 'website' && hasWebsite && (
        <WebsiteFeatures
          selected={config.features.website}
          onChange={features => setConfig(prev => ({ ...prev, features: { ...prev.features, website: features } }))}
          registry={registry?.website || []}
        />
      )}
    </div>
  );
}


function CRMFeatures({ selected, onChange, registry }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  // Flatten all features from registry for search
  const allFeatures = registry.flatMap(cat => cat.features || []);
  const allIds = allFeatures.map(f => f.id);
  const coreIds = allFeatures.filter(f => f.core).map(f => f.id);

  const toggleFeature = (id) => {
    if (coreIds.includes(id)) return; // Can't toggle core
    onChange(selected.includes(id) ? selected.filter(f => f !== id) : [...selected, id]);
  };

  const applyPreset = (preset) => {
    if (preset.features === 'all') {
      onChange([...allIds]);
    } else {
      onChange([...preset.features]);
    }
  };

  const selectAll = () => onChange([...allIds]);
  const clearOptional = () => onChange([...coreIds]);

  return (
    <div>
      {/* Presets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
        {CRM_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            style={{
              padding: '12px', border: '2px solid #e5e7eb', borderRadius: 10, background: 'white',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{preset.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{preset.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{preset.description}</div>
          </button>
        ))}
      </div>

      {/* Search + Count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search features..."
            style={{ ...inputStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <span style={{ fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
          {selected.length}/{allIds.length} selected
        </span>
        <button onClick={selectAll} style={linkBtnStyle}>All</button>
        <button onClick={clearOptional} style={linkBtnStyle}>Core only</button>
      </div>

      {/* Feature Categories */}
      {registry.map(cat => {
        const catFeatures = (cat.features || []).filter(f =>
          !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
        );
        if (catFeatures.length === 0) return null;
        const isExpanded = expanded[cat.category] !== false;
        const catSelected = catFeatures.filter(f => selected.includes(f.id)).length;

        return (
          <div key={cat.category} style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => setExpanded(prev => ({ ...prev, [cat.category]: !isExpanded }))}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: '#f9fafb', cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {cat.category}
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                  {catSelected}/{catFeatures.length}
                </span>
              </div>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {isExpanded && (
              <div style={{ padding: '8px 16px' }}>
                {catFeatures.map(feature => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    checked={selected.includes(feature.id)}
                    core={feature.core}
                    onToggle={() => toggleFeature(feature.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WebsiteFeatures({ selected, onChange, registry }) {
  const allIds = registry.flatMap(cat => (cat.features || []).map(f => f.id));

  const toggleFeature = (id) => {
    onChange(selected.includes(id) ? selected.filter(f => f !== id) : [...selected, id]);
  };

  return (
    <div>
      <button onClick={() => onChange([...allIds])} style={{ ...linkBtnStyle, marginBottom: 12 }}>Select All</button>

      {registry.map(cat => (
        <div key={cat.category} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8, color: '#374151' }}>{cat.category}</div>
          {(cat.features || []).map(feature => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              checked={selected.includes(feature.id)}
              onToggle={() => toggleFeature(feature.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ feature, checked, core, onToggle }) {
  return (
    <div
      onClick={core ? undefined : onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
        cursor: core ? 'default' : 'pointer', borderRadius: 6,
      }}
    >
      {checked ? (
        <CheckSquare size={18} color={core ? '#22c55e' : '#f97316'} />
      ) : (
        <Square size={18} color="#d1d5db" />
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{feature.name}</span>
        {core && <span style={{ fontSize: '0.7rem', color: '#22c55e', marginLeft: 6 }}>CORE</span>}
        {feature.description && (
          <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: 8 }}>{feature.description}</span>
        )}
      </div>
    </div>
  );
}


// ─── STEP 5: REVIEW & GENERATE ─────────────────────────────────────

function ReviewStep({ config, registry, generating, result, error, onGenerate }) {
  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={32} color="#22c55e" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Build Ready!</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Generated in {result.generatedIn}
        </p>
        <a
          href={`${API_BASE}${result.downloadUrl}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px',
            background: '#f97316', color: 'white', borderRadius: 10, fontWeight: 700,
            textDecoration: 'none', fontSize: '1.05rem',
          }}
        >
          <Download size={20} /> Download {result.zipName}
        </a>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 12 }}>
          Build ID: {result.buildId}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Review & Generate</h2>

      {/* Summary */}
      <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        <SummaryCard title="Products" items={config.products.map(p => p.charAt(0).toUpperCase() + p.slice(1))} />
        <SummaryCard title="Company" items={[
          config.company.name,
          config.company.email,
          config.company.phone,
          `${config.company.city}, ${config.company.state} ${config.company.zip}`.trim(),
          config.company.domain,
        ].filter(Boolean)} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: config.branding.primaryColor }} />
            <span style={{ fontSize: '0.85rem' }}>Primary: {config.branding.primaryColor}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: config.branding.secondaryColor }} />
            <span style={{ fontSize: '0.85rem' }}>Secondary: {config.branding.secondaryColor}</span>
          </div>
        </div>
        {config.products.includes('crm') && (
          <SummaryCard title={`CRM Features (${config.features.crm.length})`} items={config.features.crm.slice(0, 10).map(f => f.replace(/_/g, ' '))} extra={config.features.crm.length > 10 ? `+${config.features.crm.length - 10} more` : null} />
        )}
        {config.products.includes('website') && config.features.website.length > 0 && (
          <SummaryCard title={`Website Features (${config.features.website.length})`} items={config.features.website.map(f => f.replace(/_/g, ' '))} />
        )}
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} color="#ef4444" />
          <span style={{ color: '#b91c1c', fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={generating}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '16px', border: 'none', borderRadius: 12,
          background: generating ? '#fdba74' : '#f97316', color: 'white',
          fontWeight: 700, fontSize: '1.1rem', cursor: generating ? 'default' : 'pointer',
        }}
      >
        {generating ? (
          <><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Generating build...</>
        ) : (
          <><Zap size={22} /> Generate Package</>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function SummaryCard({ title, items, extra }) {
  return (
    <div style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            padding: '3px 10px', background: 'white', borderRadius: 6,
            fontSize: '0.8rem', border: '1px solid #e5e7eb', textTransform: 'capitalize',
          }}>{item}</span>
        ))}
        {extra && <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '3px 0' }}>{extra}</span>}
      </div>
    </div>
  );
}


// ─── SHARED FORM COMPONENTS ────────────────────────────────────────

function FormRow({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = 'text', style = {}, error }) {
  return (
    <div style={style}>
      <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, borderColor: error ? '#ef4444' : '#d1d5db' }}
      />
      {error && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>{error}</div>}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
};

const linkBtnStyle = {
  background: 'none', border: 'none', color: '#f97316', cursor: 'pointer',
  fontWeight: 600, fontSize: '0.8rem', padding: '4px 8px',
};
