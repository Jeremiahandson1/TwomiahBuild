import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Layout, Briefcase, ChevronRight, ChevronLeft, Check,
  Building2, Palette, Settings2, Download, Loader2, Package,
  Search, CheckSquare, Square, ChevronDown, ChevronUp, Zap, AlertCircle,
  Sparkles, Plus, Trash2, RefreshCw, Eye, X
} from 'lucide-react';
import api from '../../services/api';
import ContentStep from './ContentStep';

import { API_BASE_URL as API_BASE } from '../../config/api.js';

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


// ─── WEBSITE PRESETS ──────────────────────────────────────────────
const WEBSITE_PRESETS = [
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Single page. Hero, services summary, contact form. Perfect for home care, cleaning, simple trades.',
    icon: '📋',
    example: 'e.g. Chippewa Valley Home Care',
    features: ['contact_form'],
  },
  {
    id: 'brochure',
    name: 'Brochure Site',
    description: '3–5 pages. Services, about, contact. No blog or gallery. Clean and fast.',
    icon: '📄',
    example: 'e.g. Small HVAC or plumbing co.',
    features: ['contact_form', 'services_pages', 'testimonials'],
  },
  {
    id: 'full-site',
    name: 'Full Site',
    description: 'All pages — services, gallery, blog, testimonials, contact form, and visualizer tool.',
    icon: '🌐',
    example: 'e.g. Riverside Roofing',
    features: ['contact_form', 'services_pages', 'gallery', 'blog', 'testimonials', 'analytics'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Pick exactly what you want. Full control over every feature.',
    icon: '⚙️',
    example: '',
    features: null, // null = don't auto-select, let user pick manually
  },
];

// ─── MAIN WIZARD ───────────────────────────────────────────────────

const STORAGE_KEY = 'twomiah-build-factory-wizard';

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
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);

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
    },
    integrations: {
      twilio: { accountSid: '', authToken: '', phoneNumber: '' },
      sendgrid: { apiKey: '' },
      stripe: { secretKey: '', publishableKey: '', webhookSecret: '' },
      sentry: { dsn: '' },
      googleMaps: { apiKey: '' },
    },
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
    fetch(`${API_BASE}/api/v1/factory/features`)
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
    { label: 'Integrations', icon: Zap },
    { label: 'Content', icon: Sparkles },
    { label: 'Generate', icon: Download },
  ];


  const handlePreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const token = api.accessToken;
      const res = await fetch(`${API_BASE}/api/v1/factory/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      alert('Preview failed: ' + err.message);
    } finally {
      setPreviewing(false);
    }
  }, [config]);

  const updateCompany = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, company: { ...prev.company, [key]: value } }));
  }, []);

  const updateBranding = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, branding: { ...prev.branding, [key]: value } }));
  }, []);

  const updateIntegration = useCallback((service, key, value) => {
    setConfig(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [service]: { ...prev.integrations[service], [key]: value },
      },
    }));
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

  const canProceed = useCallback(() => {
    const c = config.company;
    switch (step) {
      case 0: return config.products.length > 0;
      case 1: {
        if (!c.name?.trim()) return false;
        if (!c.phone?.trim()) return false; // phone required
        if (!c.email?.trim() || !validateEmail(c.email)) return false; // email required
        if (!c.city?.trim()) return false; // city required
        if (c.domain && !validateDomain(c.domain)) return false;
        if (c.zip && !validateZip(c.zip)) return false;
        if (c.state && !validateState(c.state)) return false;
        return true;
      }
      case 2: return true; // branding optional
      case 3: return true; // features optional
      case 4: return true; // integrations optional
      case 5: return (config.content?.services?.length ?? 1) > 0; // need at least 1 service
      default: return true;
    }
  }, [step, config]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = api.accessToken;
      const res = await fetch(`${API_BASE}/api/v1/factory/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px', color: '#111827' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Twomiah Build Factory</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Generate deployable software packages for your customers</p>
        {(step > 0 || config.company.name) && !result && (
          <button
            onClick={() => { clearSavedState(); setStep(0); setConfig({
              products: [], company: { name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', domain: '', ownerName: '', industry: '', serviceRegion: '', nearbyCities: ['', '', '', ''] },
              branding: { primaryColor: '#f97316', secondaryColor: '#1e3a5f' }, features: { website: [], crm: [] },
              integrations: { twilio: { accountSid: '', authToken: '', phoneNumber: '' }, sendgrid: { apiKey: '' }, stripe: { secretKey: '', publishableKey: '', webhookSecret: '' }, sentry: { dsn: '' }, googleMaps: { apiKey: '' } },
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
          <IntegrationsStep
            config={config}
            integrations={config.integrations}
            onChange={updateIntegration}
          />
        )}
        {step === 5 && (
          <ContentStep
            config={config}
            setConfig={setConfig}
          />
        )}
        {step === 6 && (
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


      {/* Preview Modal */}
      {previewHtml && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            background: '#1e1e2e', padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
              🔍 Preview — {config.company?.name || 'Your Site'}
            </span>
            <button
              onClick={() => setPreviewHtml(null)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8 }}
            >
              <X size={20} />
            </button>
          </div>
          <iframe
            srcDoc={previewHtml}
            style={{ flex: 1, border: 'none', background: 'white' }}
            title="Site Preview"
          />
        </div>
      )}
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

          {step < 6 ? (
            <>
              <button
                onClick={() => {
                  if (step === 1) {
                    const c = config.company;
                    const errors = {};
                    if (!c.name?.trim()) errors.name = 'Company name is required';
                    if (c.email && !validateEmail(c.email)) errors.email = 'Invalid email format';
                    if (c.phone && !validatePhone(c.phone)) errors.phone = 'Phone must be at least 10 digits';
                    if (c.domain && !validateDomain(c.domain)) errors.domain = 'Invalid domain format';
                    if (c.zip && !validateZip(c.zip)) errors.zip = 'Invalid ZIP code';
                    if (c.state && !validateState(c.state)) errors.state = '2-letter code';
                    setValidationErrors(errors);
                    if (Object.keys(errors).length > 0) return;
                  }
                  setStep(s => s + 1);
                }}
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
              {config.company?.name && (
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', background: '#f3f4f6',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    cursor: previewing ? 'wait' : 'pointer', color: '#374151', fontWeight: 600,
                  }}
                >
                  <Eye size={16} /> {previewing ? 'Loading...' : 'Preview Site'}
                </button>
              )}
            </>
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

const INDUSTRY_OPTIONS = [
  // ── Contractor template (residential/commercial services) ──
  { value: 'general_contractor',      label: 'General Contractor',          template: 'website-contractor' },
  { value: 'roofing',                 label: 'Roofing',                     template: 'website-contractor' },
  { value: 'hvac',                    label: 'HVAC',                        template: 'website-contractor' },
  { value: 'plumbing',                label: 'Plumbing',                    template: 'website-contractor' },
  { value: 'electrical',              label: 'Electrical',                  template: 'website-contractor' },
  { value: 'remodeling',              label: 'Remodeling / Renovation',     template: 'website-contractor' },
  { value: 'painting',                label: 'Painting',                    template: 'website-contractor' },
  { value: 'landscaping',             label: 'Landscaping / Lawn Care',     template: 'website-contractor' },
  { value: 'concrete',                label: 'Concrete / Masonry',          template: 'website-contractor' },
  { value: 'flooring',                label: 'Flooring',                    template: 'website-contractor' },
  { value: 'windows_doors',           label: 'Windows & Doors',             template: 'website-contractor' },
  { value: 'siding',                  label: 'Siding / Gutters',            template: 'website-contractor' },
  { value: 'insulation',              label: 'Insulation',                  template: 'website-contractor' },
  { value: 'solar',                   label: 'Solar',                       template: 'website-contractor' },
  { value: 'pool_spa',                label: 'Pool & Spa',                  template: 'website-contractor' },
  { value: 'pest_control',            label: 'Pest Control',                template: 'website-contractor' },
  { value: 'commercial_construction', label: 'Commercial Construction',     template: 'website-contractor' },
  // ── Home care template ──
  { value: 'home_care',               label: 'Home Care / Senior Care',     template: 'website-homecare' },
  // ── General / blank slate ──
  { value: 'other',                   label: 'Other (blank slate)',          template: 'website-general' },
];

function CompanyForm({ company, onChange, errors = {} }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Company Information</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>This info gets embedded throughout the generated package.</p>

      <div style={{ display: 'grid', gap: 16 }}>
        <FormRow>
          <Field label="Company Name *" value={company.name} onChange={v => onChange('name', v)} placeholder="Acme Construction" error={errors.name} />
          <SelectField label="Industry" value={company.industry} onChange={v => onChange('industry', v)} options={INDUSTRY_OPTIONS} />
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

  const handleHeroPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Hero photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange('heroPhoto', reader.result);
      onChange('heroPhotoFilename', file.name);
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


      {/* Hero Photo */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>
          Hero Photo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — shown in the homepage banner)</span>
        </label>
        <div style={{
          border: '2px dashed #d1d5db', borderRadius: 12, padding: 20,
          background: branding.heroPhoto ? '#f9fafb' : 'white', cursor: 'pointer',
          position: 'relative', minHeight: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          {branding.heroPhoto ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
              <img src={branding.heroPhoto} alt="Hero preview"
                style={{ height: 80, width: 120, objectFit: 'cover', borderRadius: 8 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{branding.heroPhotoFilename}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>Will appear in homepage hero section</div>
                <button onClick={(e) => { e.stopPropagation(); onChange('heroPhoto', null); onChange('heroPhotoFilename', null); }}
                  style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click or drag to upload a hero photo</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>JPG, PNG, WebP — max 5MB — landscape recommended (1200×600+)</div>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleHeroPhotoUpload}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
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

const HOMECARE_MODULES = [
  { icon: '👤', label: 'Client Management', desc: 'Profiles, onboarding checklist, emergency contacts, caregiver assignments' },
  { icon: '🧑‍⚕️', label: 'Caregiver Management', desc: 'Certifications, NPI, EVV IDs, background checks, pay rates, availability' },
  { icon: '📅', label: 'Scheduling', desc: 'Drag-and-drop calendar, recurring shifts, open shifts, shift swaps, time-off approvals' },
  { icon: '🕐', label: 'Time Tracking & GPS', desc: 'Clock in/out, continuous GPS logging, geofencing, auto clock-in/out' },
  { icon: '✅', label: 'EVV (Electronic Visit Verification)', desc: 'Sandata-ready fields, GPS coordinates, verification status tracking' },
  { icon: '📋', label: 'Authorizations', desc: 'MIDAS auth tracking, units used vs authorized, expiry alerts' },
  { icon: '💰', label: 'Billing & Invoicing', desc: 'Auto-generate invoices from time entries, payment workflow, payer management' },
  { icon: '🏥', label: 'Claims & EDI 837', desc: 'Electronic claim submission, denial tracking, remittance matching' },
  { icon: '💵', label: 'Payroll & Expenses', desc: 'Pay period summaries, Gusto sync, caregiver expense submissions' },
  { icon: '🔒', label: 'Compliance & HIPAA', desc: 'Background checks, cert tracking, HIPAA login activity, full audit log' },
  { icon: '💬', label: 'Communication', desc: 'Communication log, message board, SMS via Twilio, push notifications' },
  { icon: '📝', label: 'Forms & Documents', desc: 'Drag-and-drop form builder, signature capture, file uploads' },
  { icon: '📊', label: 'Reports & Analytics', desc: 'Hours by caregiver, revenue, payer mix, census, no-show rates, forecast' },
  { icon: '🗺️', label: 'Optimizer Tools', desc: 'Understaffed client detection, route optimizer, roster optimizer' },
  { icon: '👨‍👩‍👧', label: 'Family Portal', desc: 'Family-facing schedule view, visit history, invoices, caregiver profiles' },
  { icon: '📱', label: 'Caregiver Portal', desc: 'Mobile-ready: clock in/out, open shift pickup, messages, mileage tracking' },
];

function HomeCareIncluded() {
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #6ee7b7', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ fontSize: 32, lineHeight: 1 }}>🏥</div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#065f46', margin: '0 0 4px' }}>Twomiah Care — Everything Included</h2>
          <p style={{ color: '#047857', margin: 0, fontSize: '0.95rem' }}>
            The Home Care CRM is a complete, fixed platform. Every module below is included — nothing to pick, nothing to configure. Just fill in your agency details and deploy.
          </p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {HOMECARE_MODULES.map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} color="#10b981" strokeWidth={3} />
                {m.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{m.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureStep({ config, setConfig, registry }) {
  const hasWebsite = config.products.includes('website');
  const hasCRM = config.products.includes('crm');
  const isHomeCare = config.company?.industry === 'home_care';
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

  // Home care CRM only — just show what's included, nothing to configure
  if (isHomeCare && hasCRM && !hasWebsite) {
    return <HomeCareIncluded />;
  }

  // Home care + website — CRM tab shows all-included, website tab has picker
  if (isHomeCare && hasCRM && hasWebsite) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          <button onClick={() => setTab('crm')} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
            background: tab === 'crm' ? '#10b981' : '#f3f4f6', color: tab === 'crm' ? 'white' : '#6b7280',
          }}>Care CRM ✓ All Included</button>
          <button onClick={() => setTab('website')} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
            background: tab === 'website' ? '#3b82f6' : '#f3f4f6', color: tab === 'website' ? 'white' : '#6b7280',
          }}>Website Features ({config.features.website.length})</button>
        </div>
        {tab === 'crm' && <HomeCareIncluded />}
        {tab === 'website' && (
          <WebsiteFeatures
            selected={config.features.website}
            onChange={features => setConfig(prev => ({ ...prev, features: { ...prev.features, website: features } }))}
            registry={registry?.website || []}
          />
        )}
      </div>
    );
  }

  // Standard construction CRM flow
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Configure Features</h2>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Select which features to enable for each product.</p>

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
  const [activePreset, setActivePreset] = useState(null);
  const [showCustom, setShowCustom] = useState(false);

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    if (preset.id === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(preset.features || []);
    }
  };

  const toggleFeature = (id) => {
    onChange(selected.includes(id) ? selected.filter(f => f !== id) : [...selected, id]);
  };

  return (
    <div>
      {/* Site type preset cards */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 12, color: '#111827' }}>
          What kind of site?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {WEBSITE_PRESETS.map(preset => {
            const isActive = activePreset === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => applyPreset(preset)}
                style={{
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  border: isActive ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  background: isActive ? '#eff6ff' : 'white',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{preset.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: 3 }}>{preset.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4, marginBottom: preset.example ? 6 : 0 }}>
                  {preset.description}
                </div>
                {preset.example && (
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontStyle: 'italic' }}>{preset.example}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Show selected features summary for non-custom presets */}
      {activePreset && activePreset !== 'custom' && selected.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d', marginBottom: 4 }}>
            ✅ {selected.length} features selected
          </div>
          <div style={{ fontSize: '0.78rem', color: '#166534' }}>
            {selected.map(f => f.replace(/_/g, ' ')).join(', ')}
          </div>
          <button
            onClick={() => { setActivePreset('custom'); setShowCustom(true); }}
            style={{ ...linkBtnStyle, marginTop: 6, color: '#3b82f6' }}
          >
            Customize →
          </button>
        </div>
      )}

      {/* Custom feature picker */}
      {(showCustom || activePreset === 'custom') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Custom Features</div>
            <button onClick={() => onChange([...allIds])} style={linkBtnStyle}>Select All</button>
          </div>
          {registry.map(cat => (
            <div key={cat.category} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#374151' }}>{cat.category}</div>
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
      )}

      {/* Prompt to pick a type if nothing selected yet */}
      {!activePreset && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af', fontSize: '0.85rem' }}>
          ↑ Pick a site type above to get started
        </div>
      )}
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


// ─── STEP 5: INTEGRATIONS ──────────────────────────────────────────

const INTEGRATIONS = [
  {
    id: 'twilio',
    name: 'Twilio — SMS & Two-Way Texting',
    icon: '💬',
    color: '#F22F46',
    requiredFeatures: ['two_way_texting', 'sms', 'calltracking', 'call_tracking'],
    description: 'Required for two-way texting and call tracking.',
    link: 'https://console.twilio.com',
    linkText: 'Get credentials at console.twilio.com',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'authToken',  label: 'Auth Token',  placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', sensitive: true },
      { key: 'phoneNumber', label: 'Phone Number', placeholder: '+15551234567' },
    ],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid — Transactional Email',
    icon: '✉️',
    color: '#1A82E2',
    requiredFeatures: [], // always relevant
    description: 'Sends invoices, quotes, notifications, and review requests.',
    link: 'https://app.sendgrid.com/settings/api_keys',
    linkText: 'Get API key at sendgrid.com',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', sensitive: true },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe — Online Payments',
    icon: '💳',
    color: '#6772E5',
    requiredFeatures: ['online_payments', 'payments', 'invoicing'],
    description: 'Accepts credit cards and ACH payments on invoices.',
    link: 'https://dashboard.stripe.com/apikeys',
    linkText: 'Get keys at dashboard.stripe.com',
    fields: [
      { key: 'secretKey',      label: 'Secret Key',       placeholder: 'sk_live_xxxxxxxx', sensitive: true },
      { key: 'publishableKey', label: 'Publishable Key',  placeholder: 'pk_live_xxxxxxxx' },
      { key: 'webhookSecret',  label: 'Webhook Secret',   placeholder: 'whsec_xxxxxxxx', sensitive: true },
    ],
  },
  {
    id: 'googleMaps',
    name: 'Google Maps — GPS & Geocoding',
    icon: '🗺️',
    color: '#4285F4',
    requiredFeatures: ['gps_tracking', 'routing', 'maps', 'fleet'],
    description: 'Powers GPS tracking, route optimization, and map views.',
    link: 'https://console.cloud.google.com/apis/credentials',
    linkText: 'Get API key at console.cloud.google.com',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...', sensitive: false },
    ],
  },
  {
    id: 'sentry',
    name: 'Sentry — Error Monitoring',
    icon: '🔍',
    color: '#362D59',
    requiredFeatures: [], // always optional
    description: 'Captures production errors so you know when something breaks.',
    link: 'https://sentry.io/settings/projects/',
    linkText: 'Get DSN at sentry.io',
    fields: [
      { key: 'dsn', label: 'DSN', placeholder: 'https://xxx@oyyy.ingest.sentry.io/zzz' },
    ],
  },
];

function IntegrationsStep({ config, integrations, onChange }) {
  const [showSensitive, setShowSensitive] = useState({});
  const selectedFeatures = [...(config.features?.crm || []), ...(config.features?.website || [])];

  // Determine which integrations are relevant to selected features
  const isRelevant = (integration) => {
    if (integration.requiredFeatures.length === 0) return true;
    return integration.requiredFeatures.some(f => selectedFeatures.includes(f));
  };

  const relevant = INTEGRATIONS.filter(isRelevant);
  const optional = INTEGRATIONS.filter(i => !isRelevant(i));

  const [showOptional, setShowOptional] = useState(false);
  const displayed = showOptional ? INTEGRATIONS : relevant;

  const hasAnyValue = (integ) => {
    const vals = integrations?.[integ.id] || {};
    return integ.fields.some(f => vals[f.key]?.trim());
  };

  const toggleSensitive = (fieldKey) => {
    setShowSensitive(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>Integrations</h2>
      <p style={{ color: '#6b7280', marginBottom: 8 }}>
        Enter credentials for services this build will use. All fields are optional —
        leave blank and configure later in the deployed app's settings.
      </p>
      <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: '0.82rem', color: '#92400e', marginBottom: 24 }}>
        🔒 These values go directly into the generated <code>.env</code> file and are never stored on Twomiah's servers.
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {displayed.map(integ => {
          const vals = integrations?.[integ.id] || {};
          const filled = hasAnyValue(integ);
          const isHighlighted = isRelevant(integ);

          return (
            <div key={integ.id} style={{
              border: `2px solid ${filled ? integ.color : isHighlighted ? '#e5e7eb' : '#f3f4f6'}`,
              borderRadius: 12, overflow: 'hidden',
              opacity: isHighlighted ? 1 : 0.7,
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: filled ? `${integ.color}10` : '#f9fafb',
              }}>
                <span style={{ fontSize: 24 }}>{integ.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827' }}>
                    {integ.name}
                    {filled && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: integ.color, fontWeight: 700 }}>✓ CONFIGURED</span>}
                    {!isHighlighted && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#9ca3af' }}>NOT NEEDED FOR SELECTED FEATURES</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{integ.description}</div>
                </div>
                <a href={integ.link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {integ.linkText} ↗
                </a>
              </div>

              {/* Fields */}
              <div style={{ padding: '12px 16px', display: 'grid', gap: 10, background: 'white' }}>
                {integ.fields.map(field => {
                  const fieldKey = `${integ.id}.${field.key}`;
                  const isVisible = showSensitive[fieldKey] || !field.sensitive;
                  return (
                    <div key={field.key}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>
                        {field.label}
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={vals[field.key] || ''}
                          onChange={e => onChange(integ.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          style={{
                            flex: 1, padding: '9px 12px', border: '1px solid #d1d5db',
                            borderRadius: 8, fontSize: '0.85rem', outline: 'none',
                            fontFamily: vals[field.key] ? 'monospace' : 'inherit',
                            background: vals[field.key] ? '#f0fdf4' : 'white',
                          }}
                        />
                        {field.sensitive && (
                          <button
                            onClick={() => toggleSensitive(fieldKey)}
                            style={{
                              padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
                              background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280',
                            }}
                          >
                            {isVisible ? '🙈 Hide' : '👁 Show'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show/hide non-relevant integrations */}
      {optional.length > 0 && !showOptional && (
        <button
          onClick={() => setShowOptional(true)}
          style={{ marginTop: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Show {optional.length} other integration{optional.length > 1 ? 's' : ''} not needed for selected features
        </button>
      )}
    </div>
  );
}


// ─── STEP 6: REVIEW & GENERATE ─────────────────────────────────────

function ReviewStep({ config, registry, generating, result, error, onGenerate }) {
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [deployError, setDeployError] = useState(null);

  const handleDeploy = async () => {
    if (!result?.customerId) return;
    setDeploying(true);
    setDeployError(null);
    try {
      const token = api.accessToken;
      const res = await fetch(`${API_BASE}/api/v1/factory/customers/${result.customerId}/deploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');
      setDeployResult(data);
    } catch (err) {
      setDeployError(err.message);
    }
    setDeploying(false);
  };

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

        {/* Deploy to live URL */}
        {!deployResult ? (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={handleDeploy}
              disabled={deploying}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px',
                background: deploying ? '#9ca3af' : '#7c3aed', color: 'white', borderRadius: 10,
                fontWeight: 700, fontSize: '1.05rem', border: 'none', cursor: deploying ? 'default' : 'pointer',
                width: '100%', justifyContent: 'center', marginBottom: 10,
              }}
            >
              {deploying ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Deploying to Render...</> : '🚀 Deploy to Live URL'}
            </button>
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Creates a live preview URL automatically
            </p>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: '#15803d', marginBottom: 8 }}>🎉 Deploying! Your site will be live in ~2 minutes.</p>
            {deployResult.deployedUrl && (
              <a href={deployResult.deployedUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: '#7c3aed', fontWeight: 600, wordBreak: 'break-all' }}>
                {deployResult.deployedUrl}
              </a>
            )}
          </div>
        )}

        {deployError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#dc2626', fontSize: '0.85rem' }}>
            Deploy error: {deployError}
          </div>
        )}

        {/* Download zip as fallback */}
        <a
          href={`${API_BASE}${result.downloadUrl}?token=${api.accessToken}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            background: 'white', color: '#374151', borderRadius: 10, fontWeight: 600,
            textDecoration: 'none', fontSize: '0.9rem', border: '1px solid #e5e7eb',
          }}
        >
          <Download size={16} /> Download zip
        </a>
        {/* Credentials Card */}
        {result.defaultPassword && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '20px 24px', marginTop: 20, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔑 Admin Login Credentials
              <span style={{ fontWeight: 400, fontSize: 12, color: '#b45309' }}>(save these now — also emailed to client)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Admin URL', value: result.adminUrl || `${deployResult?.deployedUrl || ''}/admin` },
                { label: 'Email / Username', value: config.company?.email || '' },
                { label: 'Temp Password', value: result.defaultPassword },
                { label: 'Build ID', value: result.buildId },
              ].map(row => row.value ? (
                <div key={row.label}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{row.label}</div>
                  <code style={{ fontSize: 13, background: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid #fde68a', display: 'block', wordBreak: 'break-all' }}>{row.value}</code>
                </div>
              ) : null)}
            </div>
          </div>
        )}
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
        {/* Integrations summary */}
        {(() => {
          const integ = config.integrations || {};
          const configured = [];
          const missing = [];
          if (integ.twilio?.accountSid) configured.push('Twilio SMS'); else missing.push('Twilio SMS');
          if (integ.sendgrid?.apiKey) configured.push('SendGrid Email'); else missing.push('SendGrid Email');
          if (integ.stripe?.secretKey) configured.push('Stripe Payments'); else missing.push('Stripe Payments');
          if (integ.googleMaps?.apiKey) configured.push('Google Maps');
          if (integ.sentry?.dsn) configured.push('Sentry');
          return (
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: 8 }}>Integrations</div>
              {configured.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {configured.map(s => (
                    <span key={s} style={{ padding: '3px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '0.8rem', color: '#15803d' }}>✓ {s}</span>
                  ))}
                </div>
              )}
              {missing.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {missing.map(s => (
                    <span key={s} style={{ padding: '3px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, fontSize: '0.8rem', color: '#c2410c' }}>⚠ {s} not configured</span>
                  ))}
                </div>
              )}
              {missing.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                  Unconfigured services can be added later in the deployed app's Settings → Integrations.
                </div>
              )}
            </div>
          );
        })()}
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

function SelectField({ label, value, onChange, options, style = {}, error }) {
  return (
    <div style={style}>
      <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, borderColor: error ? '#ef4444' : '#d1d5db', background: 'white', cursor: 'pointer' }}
      >
        <option value="">Select industry…</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
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
