import { useState, useCallback } from 'react';
import { Sparkles, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const HOME_CARE_SERVICES = [
  { id: 'personal-care', name: 'Personal Care', desc: 'Bathing, grooming, dressing assistance' },
  { id: 'companion-care', name: 'Companion Care', desc: 'Social engagement, light housekeeping' },
  { id: 'respite-care', name: 'Respite Care', desc: 'Relief for family caregivers' },
  { id: 'memory-care', name: 'Memory Care', desc: 'Alzheimer\'s and dementia support' },
  { id: 'skilled-nursing', name: 'Skilled Nursing Support', desc: 'Medication, post-hospital care' },
  { id: 'transportation', name: 'Transportation', desc: 'Rides to appointments and errands' },
  { id: 'meal-prep', name: 'Meal Preparation', desc: 'Nutritious meals and grocery help' },
  { id: 'light-housekeeping', name: 'Light Housekeeping', desc: 'Laundry, dishes, tidying up' },
];

const CONTRACTOR_SERVICES = [
  { id: 'roofing', name: 'Roofing', desc: 'Replacement, repair, and inspection' },
  { id: 'siding', name: 'Siding', desc: 'Vinyl, fiber cement, wood siding' },
  { id: 'windows', name: 'Windows & Doors', desc: 'Replacement windows and entry doors' },
  { id: 'gutters', name: 'Gutters', desc: 'Seamless gutters and gutter guards' },
  { id: 'painting', name: 'Painting', desc: 'Interior and exterior painting' },
  { id: 'decks', name: 'Decks & Patios', desc: 'Custom deck design and installation' },
  { id: 'remodeling', name: 'Remodeling', desc: 'Kitchen, bath, basement remodels' },
  { id: 'insulation', name: 'Insulation', desc: 'Energy-efficient insulation solutions' },
];

function getServiceOptions(industry) {
  if (industry === 'home_care') return HOME_CARE_SERVICES;
  return CONTRACTOR_SERVICES;
}

export default function ContentStep({ config, setConfig }) {
  const { company, content = {} } = config;
  const industry = company?.industry || '';

  const [generating, setGenerating] = useState(false);
  const [generatedFields, setGeneratedFields] = useState({});
  const [expandedService, setExpandedService] = useState(null);
  const [customServiceName, setCustomServiceName] = useState('');

  const serviceOptions = getServiceOptions(industry);

  // Content state (falls back to config.content)
  const selectedServices = content.services || serviceOptions.slice(0, 6).map(s => s.id);
  const heroTagline = content.heroTagline || '';
  const aboutText = content.aboutText || '';
  const ctaText = content.ctaText || '';
  const serviceArea = content.serviceArea || company?.city || '';

  const updateContent = useCallback((key, value) => {
    setConfig(prev => ({
      ...prev,
      content: { ...(prev.content || {}), [key]: value }
    }));
  }, [setConfig]);

  const toggleService = (id) => {
    const current = selectedServices;
    const next = current.includes(id)
      ? current.filter(s => s !== id)
      : [...current, id];
    updateContent('services', next);
  };

  const addCustomService = () => {
    if (!customServiceName.trim()) return;
    const id = customServiceName.toLowerCase().replace(/\s+/g, '-');
    const current = content.customServices || [];
    setConfig(prev => ({
      ...prev,
      content: {
        ...(prev.content || {}),
        customServices: [...current, { id, name: customServiceName.trim(), desc: '' }],
        services: [...(prev.content?.services || selectedServices), id],
      }
    }));
    setCustomServiceName('');
  };

  const removeCustomService = (id) => {
    const current = content.customServices || [];
    setConfig(prev => ({
      ...prev,
      content: {
        ...(prev.content || {}),
        customServices: current.filter(s => s.id !== id),
        services: (prev.content?.services || selectedServices).filter(s => s !== id),
      }
    }));
  };

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/factory/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName: company?.name,
          city: company?.city,
          state: company?.state,
          industry: industry,
          services: selectedServices,
          serviceRegion: company?.serviceRegion,
          ownerName: company?.ownerName,
          description: company?.description,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();

      // Apply generated content
      setConfig(prev => ({
        ...prev,
        content: {
          ...(prev.content || {}),
          heroTagline: data.heroTagline || prev.content?.heroTagline,
          aboutText: data.aboutText || prev.content?.aboutText,
          ctaText: data.ctaText || prev.content?.ctaText,
          serviceDescriptions: data.serviceDescriptions || {},
        }
      }));
      setGeneratedFields(data);
    } catch (err) {
      console.error('AI generation failed:', err);
      alert('AI generation failed. You can still fill in content manually.');
    } finally {
      setGenerating(false);
    }
  };

  const allServices = [
    ...serviceOptions,
    ...(content.customServices || []),
  ];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Content & Services</h2>
      <p style={{ color: '#6b7280', marginBottom: 28 }}>
        Choose which services to offer, then customize your site copy — or let AI write it based on your company info.
      </p>

      {/* Services Selection */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Services Offered</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {allServices.map(svc => {
            const selected = selectedServices.includes(svc.id);
            const isCustom = (content.customServices || []).find(c => c.id === svc.id);
            return (
              <div
                key={svc.id}
                onClick={() => toggleService(svc.id)}
                style={{
                  border: `2px solid ${selected ? '#0ea5e9' : '#e5e7eb'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  background: selected ? '#f0f9ff' : '#fff',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 2,
                  border: `2px solid ${selected ? '#0ea5e9' : '#d1d5db'}`,
                  background: selected ? '#0ea5e9' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{svc.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{svc.desc}</div>
                </div>
                {isCustom && (
                  <button
                    onClick={e => { e.stopPropagation(); removeCustomService(svc.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add custom service */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={customServiceName}
            onChange={e => setCustomServiceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomService()}
            placeholder="Add a custom service..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
          />
          <button
            onClick={addCustomService}
            style={{ padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* AI Generate Button */}
      <div style={{ background: 'linear-gradient(135deg, #667eea20, #764ba220)', border: '1px solid #7c3aed40', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#4c1d95', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#7c3aed" /> AI Content Generation
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Generate tailored hero copy, about text, and service descriptions for {company?.name || 'your company'}.
            </div>
          </div>
          <button
            onClick={generateWithAI}
            disabled={generating || !company?.name}
            style={{
              padding: '10px 22px', borderRadius: 8, border: 'none', cursor: generating ? 'wait' : 'pointer',
              background: generating ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: generating ? '#9ca3af' : 'white', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            }}
          >
            {generating ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={15} /> Generate Content</>}
          </button>
        </div>
      </div>

      {/* Editable Content Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Hero Tagline <span style={{ fontWeight: 400, color: '#6b7280' }}>(shown in nav badge)</span></span>
            {generatedFields.heroTagline && <span style={{ color: '#7c3aed', fontSize: 12 }}>✦ AI generated</span>}
          </label>
          <input
            value={heroTagline}
            onChange={e => updateContent('heroTagline', e.target.value)}
            placeholder="e.g. Compassionate In-Home Care"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>About Section <span style={{ fontWeight: 400, color: '#6b7280' }}>(2-3 sentences about your company)</span></span>
            {generatedFields.aboutText && <span style={{ color: '#7c3aed', fontSize: 12 }}>✦ AI generated</span>}
          </label>
          <textarea
            value={aboutText}
            onChange={e => updateContent('aboutText', e.target.value)}
            placeholder={`Tell visitors about ${company?.name || 'your company'}, your values, and what sets you apart...`}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Call-to-Action Text <span style={{ fontWeight: 400, color: '#6b7280' }}>(CTA banner)</span></span>
            {generatedFields.ctaText && <span style={{ color: '#7c3aed', fontSize: 12 }}>✦ AI generated</span>}
          </label>
          <input
            value={ctaText}
            onChange={e => updateContent('ctaText', e.target.value)}
            placeholder="e.g. Ready to discuss care options for your loved one?"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
