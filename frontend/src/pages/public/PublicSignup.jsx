import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Upload, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const INDUSTRIES = {
  build: {
    name: 'Twomiah Build',
    industry: 'contractor',
    tagline: 'Construction CRM + Website',
    color: '#f97316',
    plans: [
      { id: 'starter', name: 'Starter', price: 97, desc: 'CRM only', features: ['Full CRM', 'Jobs & invoices', 'Mobile app', '3 team members'] },
      { id: 'professional', name: 'Professional', price: 197, desc: 'CRM + Website', popular: true, features: ['Everything in Starter', 'Professional website', 'Content manager', 'Lead capture', 'SEO-optimized'] },
      { id: 'growth', name: 'Growth', price: 297, desc: 'CRM + Website + Ads', features: ['Everything in Pro', 'Google & Facebook Ads', 'Call tracking', 'Dedicated manager'] },
    ],
  },
  care: {
    name: 'Twomiah Care',
    industry: 'home_care',
    tagline: 'Home Care CRM + Website',
    color: '#10b981',
    plans: [
      { id: 'starter', name: 'Starter', price: 97, desc: 'CRM only', features: ['Full CRM', 'Caregiver scheduling', 'Mobile app', '3 staff members'] },
      { id: 'professional', name: 'Professional', price: 197, desc: 'CRM + Website', popular: true, features: ['Everything in Starter', 'Professional website', 'Content manager', 'Lead capture', 'SEO-optimized'] },
      { id: 'growth', name: 'Growth', price: 297, desc: 'CRM + Website + Ads', features: ['Everything in Pro', 'Google & Facebook Ads', 'Call tracking', 'Dedicated manager'] },
    ],
  },
};

const STEPS = ['Plan', 'Company', 'Branding', 'Review'];

export default function PublicSignup() {
  const { product } = useParams(); // 'build' or 'care'
  const [searchParams] = useSearchParams();
  const config = INDUSTRIES[product] || INDUSTRIES.build;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [plan, setPlan] = useState('professional');
  const [company, setCompany] = useState({
    name: '', ownerName: '', email: '', phone: '', city: '', state: '',
  });
  const [branding, setBranding] = useState({
    primaryColor: config.color,
    secondaryColor: '#1e293b',
    logo: null,
  });

  // Check if returning from canceled payment
  useEffect(() => {
    if (searchParams.get('canceled')) {
      setError('Payment was canceled. You can try again below.');
    }
  }, []);

  const canProceed = () => {
    if (step === 0) return !!plan;
    if (step === 1) return company.name && company.email && company.ownerName && company.city && company.state;
    if (step === 2) return true;
    if (step === 3) return true;
    return false;
  };

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/factory/public/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          branding,
          industry: config.industry,
          plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.dev) {
        // Dev mode
        window.location.href = `/signup/success?customer=${data.customerId}`;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedPlan = config.plans.find(p => p.id === plan);
  const accentColor = config.color;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="https://twomiah.com" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                 style={{ background: accentColor }}>T</div>
            <span className="font-bold text-slate-900">{config.name}</span>
          </a>
          <span className="text-sm text-slate-400">{config.tagline}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'text-white' : i === step ? 'text-white' : 'bg-slate-100 text-slate-400'
              }`} style={i <= step ? { background: accentColor } : {}}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {/* Step 0: Plan */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Choose your plan</h1>
              <p className="text-slate-500 mb-8">All plans include a 14-day free trial. Cancel anytime.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {config.plans.map(p => (
                  <button key={p.id} onClick={() => setPlan(p.id)}
                    className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                      plan === p.id ? 'shadow-lg' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={plan === p.id ? { borderColor: accentColor, background: `${accentColor}08` } : {}}>
                    {p.popular && (
                      <span className="absolute -top-2.5 left-4 text-xs font-bold text-white px-2 py-0.5 rounded-full"
                            style={{ background: accentColor }}>Most Popular</span>
                    )}
                    <div className="font-bold text-slate-900 mb-0.5">{p.name}</div>
                    <div className="text-sm text-slate-500 mb-3">{p.desc}</div>
                    <div className="text-2xl font-bold mb-3" style={{ color: accentColor }}>${p.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
                    <ul className="space-y-1.5">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />{f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Your company info</h1>
              <p className="text-slate-500 mb-8">This gets embedded throughout your CRM and website.</p>
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Company Name *</label>
                    <input type="text" value={company.name} onChange={e => setCompany({...company, name: e.target.value})}
                      placeholder="Claflin Construction"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Your Name *</label>
                    <input type="text" value={company.ownerName} onChange={e => setCompany({...company, ownerName: e.target.value})}
                      placeholder="Nick Claflin"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Email Address *</label>
                    <input type="email" value={company.email} onChange={e => setCompany({...company, email: e.target.value})}
                      placeholder="nick@claflinconstruction.com"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Phone</label>
                    <input type="tel" value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})}
                      placeholder="(715) 555-0100"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">City *</label>
                    <input type="text" value={company.city} onChange={e => setCompany({...company, city: e.target.value})}
                      placeholder="Eau Claire"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">State *</label>
                    <input type="text" value={company.state} onChange={e => setCompany({...company, state: e.target.value})}
                      placeholder="WI" maxLength={2}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Brand it your way</h1>
              <p className="text-slate-500 mb-8">Your colors and logo get applied everywhere — CRM, website, and emails. You can always change these later.</p>
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={branding.primaryColor}
                        onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                        className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                      <input type="text" value={branding.primaryColor}
                        onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={branding.secondaryColor}
                        onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
                        className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                      <input type="text" value={branding.secondaryColor}
                        onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Preview swatch */}
                <div className="p-4 rounded-xl" style={{ background: branding.primaryColor }}>
                  <div className="text-white font-bold text-lg">{company.name || 'Your Company'}</div>
                  <div className="text-white/70 text-sm mt-1">Website & CRM preview</div>
                  <div className="mt-3 flex gap-2">
                    <div className="px-4 py-1.5 bg-white rounded text-xs font-bold" style={{ color: branding.primaryColor }}>Button</div>
                    <div className="px-4 py-1.5 rounded text-xs font-bold text-white border border-white/30">Secondary</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Logo (optional)</label>
                  <p className="text-xs text-slate-400 mb-3">PNG or SVG recommended. You can upload this after setup too.</p>
                  <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-500">{branding.logo ? '✓ Logo uploaded' : 'Upload logo'}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => setBranding({...branding, logo: ev.target.result});
                          reader.readAsDataURL(file);
                        }
                      }} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Review & launch</h1>
              <p className="text-slate-500 mb-8">Everything look good? You'll be redirected to complete payment, then your stack builds automatically.</p>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                <div className="p-5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Plan</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{config.name} — {selectedPlan?.name}</div>
                      <div className="text-sm text-slate-500">{selectedPlan?.desc}</div>
                    </div>
                    <div className="text-xl font-bold" style={{ color: accentColor }}>${selectedPlan?.price}/mo</div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Company</div>
                  <div className="text-sm text-slate-700 space-y-1">
                    <div><strong>{company.name}</strong></div>
                    <div>{company.ownerName}</div>
                    <div>{company.email}</div>
                    <div>{company.city}, {company.state}</div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Branding</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg" style={{ background: branding.primaryColor }} />
                    <div className="w-8 h-8 rounded-lg" style={{ background: branding.secondaryColor }} />
                    <span className="text-sm text-slate-500">{branding.logo ? '+ Logo uploaded' : 'No logo (add later)'}</span>
                  </div>
                </div>
                <div className="p-5 bg-slate-50 rounded-b-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-600">
                      After payment, your CRM, website, and admin panel will be built and deployed automatically. 
                      You'll receive an email with your login credentials within a few minutes.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-40 transition-colors"
                style={{ background: canProceed() ? accentColor : '#94a3b8' }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white rounded-xl transition-colors"
                style={{ background: accentColor }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>Proceed to Payment <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
