import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const REVENUE_SCENARIOS = [
  { clients: 5,  monthly: '$1,250',  annual: '$15,000',  label: 'Getting started' },
  { clients: 15, monthly: '$3,750',  annual: '$45,000',  label: 'Growing agency' },
  { clients: 30, monthly: '$7,500',  annual: '$90,000',  label: 'Established' },
  { clients: 50, monthly: '$12,500', annual: '$150,000', label: 'Full operation' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Apply & get approved',
    desc: 'Tell us about your agency and client base. We approve agencies within 48 hours. No minimum revenue requirement to start.',
  },
  {
    step: '02',
    title: 'Get Factory access',
    desc: 'You get full access to the BuildPro Factory — generate complete client platforms in minutes. Your branding, their domain, your pricing.',
  },
  {
    step: '03',
    title: 'Sell at your price',
    desc: 'You set what you charge. We charge you wholesale. The margin is entirely yours. Most agencies charge $200–$400/mo per client.',
  },
  {
    step: '04',
    title: 'We handle the platform',
    desc: 'Infrastructure, updates, security, uptime — all ours. You focus on clients. You never touch a server.',
  },
];

const AGENCY_TIERS = [
  {
    name: 'Reseller',
    price: '$0',
    priceNote: 'to join',
    monthlyFee: '$149/mo per client',
    highlight: false,
    description: 'White-label BuildPro under your brand. Charge what you want.',
    includes: [
      'Factory access (generate client sites)',
      'Your branding & domain',
      'Client dashboard access',
      'Email support for your clients',
      'Migration tools included',
      'Revenue share: you keep 100%',
    ],
    cta: 'Apply as Reseller',
    ctaHref: '/agency/apply?tier=reseller',
    markup: 'Typical agency markup: 50–150%',
  },
  {
    name: 'Agency Partner',
    price: '$497',
    priceNote: 'one-time setup',
    monthlyFee: '$99/mo per client',
    highlight: true,
    badge: 'Best Margin',
    description: 'Deeper wholesale pricing. Co-marketing. Your clients, your brand.',
    includes: [
      'Everything in Reseller',
      'Lower wholesale rate ($99/client)',
      'White-label documentation',
      'Co-marketing & referral program',
      'Priority onboarding support',
      'Partner directory listing',
      'Dedicated partner Slack channel',
    ],
    cta: 'Apply as Partner',
    ctaHref: '/agency/apply?tier=partner',
    markup: 'Typical agency margin: $100–$300/client/mo',
  },
  {
    name: 'Enterprise Reseller',
    price: 'Custom',
    priceNote: 'contact us',
    monthlyFee: 'Volume pricing',
    highlight: false,
    description: 'Large agencies, franchises, or regional chains. Custom terms.',
    includes: [
      'Everything in Agency Partner',
      'Custom wholesale pricing',
      'Multi-tenant management dashboard',
      'API access & custom integrations',
      'SLA with uptime guarantee',
      'White-glove client migrations',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact?type=enterprise-reseller',
    markup: 'Custom terms negotiated',
  },
];

const WHAT_YOU_BUILD = [
  {
    icon: '🏗️',
    title: 'Construction CRM',
    desc: 'Full project management, RFIs, change orders, daily logs, Gantt charts — the whole Buildertrend/Procore stack.',
  },
  {
    icon: '🔧',
    title: 'Field Service Platform',
    desc: 'Scheduling, dispatch, GPS time tracking, invoicing, QuickBooks sync. For HVAC, plumbing, electrical, and more.',
  },
  {
    icon: '🏥',
    title: 'Home Care CRM',
    desc: 'Client management, caregiver scheduling, visit logging, billing — already built as a white-label template.',
  },
  {
    icon: '🏪',
    title: 'Custom Verticals',
    desc: 'The Factory generates any service business platform. Landscaping, cleaning, pest control — one template, infinite clients.',
  },
];

const FAQS = [
  {
    q: 'Can clients see they\'re on BuildPro?',
    a: 'No. Your logo, your domain, your colors. BuildPro is invisible. You white-label everything including the mobile app icon.',
  },
  {
    q: 'What do I charge my clients?',
    a: 'Whatever the market will bear. We charge you $99–$149/month wholesale. Most agencies charge $200–$500/mo. The margin is yours entirely.',
  },
  {
    q: 'Do I need technical skills to run this?',
    a: 'No. The Factory generates complete client platforms in minutes — no code, no servers, no configuration. You fill out a form, we generate the platform.',
  },
  {
    q: 'What happens if a client leaves?',
    a: 'They can export their data any time (this is actually a selling point — it builds trust). You stop paying wholesale for that client. Clean cutoff.',
  },
  {
    q: 'Can I offer the Buildertrend migration service to my clients?',
    a: 'Yes. Agency Partners get access to the migration tooling at the same wholesale rate. You can charge $500–$1,500 per migration as a service.',
  },
  {
    q: 'Is there a minimum number of clients?',
    a: 'No minimum. Start with one client. Pay wholesale only for active accounts.',
  },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function RevenueCard({ scenario, index, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#fff' : '#111',
        border: `2px solid ${active ? '#f97316' : '#1e1e1e'}`,
        borderRadius: 12,
        padding: '20px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        opacity: 0,
        animation: `fadeSlideUp 0.4s ease forwards ${index * 0.08}s`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#f97316' : '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
        {scenario.clients} clients
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: active ? '#111' : '#fff', letterSpacing: -1, marginBottom: 2 }}>
        {scenario.monthly}
      </div>
      <div style={{ fontSize: 12, color: active ? '#6b7280' : '#4b5563' }}>
        /month margin
      </div>
      <div style={{ fontSize: 11, color: active ? '#f97316' : '#374151', marginTop: 8, fontWeight: 600 }}>
        {scenario.label}
      </div>
    </button>
  );
}

function FAQ({ faq, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: '1px solid #1a1a1a',
      opacity: 0,
      animation: `fadeSlideUp 0.4s ease forwards ${index * 0.07}s`,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '20px 0',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#fff', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, paddingRight: 16 }}>{faq.q}</span>
        <ChevronRight size={16} color="#6b7280" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ paddingBottom: 20, paddingRight: 32 }}>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.8 }}>{faq.a}</p>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function AgencyProgramPage() {
  const [activeScenario, setActiveScenario] = useState(1);
  const [formData, setFormData] = useState({
    name: '', company: '', email: '', website: '', clients: '', tier: 'partner', industry: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const scenario = REVENUE_SCENARIOS[activeScenario];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{
      background: '#080808', minHeight: '100vh', color: '#fff',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700;9..40,900&family=Space+Mono:wght@400;700&display=swap');
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #f97316; color: #fff; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.96)', borderBottom: '1px solid #1a1a1a',
        backdropFilter: 'blur(12px)', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: -0.5 }}>BuildPro</div>
          <div style={{ width: 1, height: 16, background: '#333' }} />
          <div style={{ fontSize: 12, color: '#6b7280' }}>Agency Program</div>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#tiers" style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>Pricing</a>
          <a href="#revenue" style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>Revenue</a>
          <a href="#apply" style={{
            background: '#f97316', color: '#fff', padding: '8px 18px',
            borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 13,
          }}>
            Apply Now
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 32px 80px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#1a0f00', border: '1px solid #3a1f00',
          borderRadius: 20, padding: '6px 16px', marginBottom: 32,
          animation: 'fadeSlideUp 0.4s ease forwards',
        }}>
          <span style={{ fontSize: 13 }}>🏭</span>
          <span style={{ fontSize: 12, color: '#fb923c', fontFamily: "'Space Mono', monospace" }}>
            White-label program — now open
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(44px, 8vw, 88px)',
          fontWeight: 900, lineHeight: 1.0,
          letterSpacing: -4, marginBottom: 24,
          animation: 'fadeSlideUp 0.4s ease forwards 0.1s', opacity: 0,
        }}>
          Sell BuildPro<br />
          <span style={{
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            as your own.
          </span>
        </h1>

        <p style={{
          fontSize: 20, color: '#6b7280', lineHeight: 1.7,
          maxWidth: 560, margin: '0 auto 40px',
          animation: 'fadeSlideUp 0.4s ease forwards 0.2s', opacity: 0,
        }}>
          White-label the entire BuildPro platform. Your logo. Your domain.
          Your pricing. We run the infrastructure. You keep the margin.
        </p>

        <div style={{
          display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'fadeSlideUp 0.4s ease forwards 0.3s', opacity: 0,
        }}>
          <a href="#apply" style={{
            background: '#f97316', color: '#fff',
            padding: '14px 32px', borderRadius: 8, textDecoration: 'none',
            fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Apply for Partner Access <ArrowRight size={16} />
          </a>
          <a href="#revenue" style={{
            background: 'transparent', color: '#fff',
            padding: '14px 28px', borderRadius: 8, textDecoration: 'none',
            fontWeight: 600, fontSize: 16, border: '1px solid #222',
          }}>
            See Revenue Calculator
          </a>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 0, justifyContent: 'center', marginTop: 72,
          borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a',
          padding: '28px 0',
          animation: 'fadeSlideUp 0.4s ease forwards 0.4s', opacity: 0,
        }}>
          {[
            { value: '$99/mo', label: 'Your wholesale cost' },
            { value: '$200–500', label: 'Typical client rate' },
            { value: '2 min', label: 'To generate a client site' },
            { value: '100%', label: 'Margin stays with you' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '0 24px',
              borderRight: i < 3 ? '1px solid #1a1a1a' : 'none',
            }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, color: '#fff', marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#4b5563' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What you build for clients */}
      <section style={{ padding: '80px 32px', background: '#050505', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, marginBottom: 8, textAlign: 'center' }}>
            What you deploy for clients
          </h2>
          <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 48, fontSize: 16 }}>
            Full-stack business platforms. Not a website builder. Not a template kit.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {WHAT_YOU_BUILD.map((item, i) => (
              <div key={i} style={{
                background: '#0a0a0a', border: '1px solid #1a1a1a',
                borderRadius: 12, padding: '28px 24px',
                opacity: 0, animation: `fadeSlideUp 0.4s ease forwards ${i * 0.08}s`,
              }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, marginBottom: 48, textAlign: 'center' }}>
          How the program works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} style={{
              opacity: 0, animation: `fadeSlideUp 0.4s ease forwards ${i * 0.1}s`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 48, fontWeight: 700, color: '#1a1a1a', lineHeight: 1, marginBottom: 12 }}>
                {step.step}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.8 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue calculator */}
      <section id="revenue" style={{ padding: '80px 32px', background: '#050505', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, marginBottom: 8, textAlign: 'center' }}>
            Revenue calculator
          </h2>
          <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 48, fontSize: 16 }}>
            Based on charging clients $250/mo and your wholesale cost of $99/mo.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 32 }}>
            {REVENUE_SCENARIOS.map((scenario, i) => (
              <RevenueCard
                key={i}
                scenario={scenario}
                index={i}
                active={activeScenario === i}
                onClick={() => setActiveScenario(i)}
              />
            ))}
          </div>

          <div style={{
            background: '#0f0f0f', border: '1px solid #f97316',
            borderRadius: 16, padding: '32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
              With {scenario.clients} clients at $250/mo each
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2, color: '#f97316', marginBottom: 4 }}>
              {scenario.monthly}
            </div>
            <div style={{ color: '#6b7280', fontSize: 15, marginBottom: 20 }}>monthly margin</div>
            <div style={{
              display: 'inline-block',
              background: '#0f1f0f', border: '1px solid #1a3a1a',
              borderRadius: 6, padding: '8px 16px',
              fontSize: 14, color: '#4ade80', fontWeight: 600,
            }}>
              {scenario.annual} annually
            </div>
            <p style={{ color: '#4b5563', fontSize: 12, marginTop: 16 }}>
              Wholesale: {scenario.clients} × $99 = ${(scenario.clients * 99).toLocaleString()}/mo &nbsp;·&nbsp;
              Revenue: {scenario.clients} × $250 = ${(scenario.clients * 250).toLocaleString()}/mo
            </p>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section id="tiers" style={{ padding: '80px 32px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, marginBottom: 8, textAlign: 'center' }}>
            Agency tiers
          </h2>
          <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 48, fontSize: 16 }}>
            Start as a reseller. Upgrade as you grow.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {AGENCY_TIERS.map((tier, i) => (
              <div key={i} style={{
                position: 'relative',
                background: tier.highlight ? '#fff' : '#0f0f0f',
                border: `2px solid ${tier.highlight ? '#f97316' : '#1a1a1a'}`,
                borderRadius: 16, padding: '32px 28px',
                opacity: 0, animation: `fadeSlideUp 0.5s ease forwards ${i * 0.1}s`,
              }}>
                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 800,
                    padding: '4px 14px', borderRadius: 20, letterSpacing: '0.08em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {tier.badge}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: tier.highlight ? '#f97316' : '#4b5563', marginBottom: 8 }}>
                  {tier.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: tier.highlight ? '#111' : '#fff', letterSpacing: -2 }}>{tier.price}</span>
                  <span style={{ fontSize: 13, color: tier.highlight ? '#6b7280' : '#4b5563' }}>{tier.priceNote}</span>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: tier.highlight ? '#f97316' : '#6b7280',
                  marginBottom: 8, fontFamily: "'Space Mono', monospace",
                }}>
                  {tier.monthlyFee}
                </div>
                <p style={{ fontSize: 13, color: tier.highlight ? '#374151' : '#4b5563', marginBottom: 24, lineHeight: 1.6 }}>
                  {tier.description}
                </p>
                <div style={{ marginBottom: 24 }}>
                  {tier.includes.map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                      <Check size={13} color={tier.highlight ? '#f97316' : '#4ade80'} strokeWidth={3} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: tier.highlight ? '#374151' : '#6b7280', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  fontSize: 11, color: tier.highlight ? '#9ca3af' : '#374151',
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: 16, padding: '8px 12px',
                  background: tier.highlight ? '#f9fafb' : '#111',
                  borderRadius: 6,
                }}>
                  💡 {tier.markup}
                </div>
                <Link to={tier.ctaHref} style={{
                  display: 'block', textAlign: 'center',
                  background: tier.highlight ? '#f97316' : 'transparent',
                  border: `2px solid ${tier.highlight ? '#f97316' : '#222'}`,
                  color: tier.highlight ? '#fff' : '#6b7280',
                  padding: '13px', borderRadius: 8, textDecoration: 'none',
                  fontWeight: 700, fontSize: 14,
                }}>
                  {tier.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 32px', background: '#050505', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, marginBottom: 48, textAlign: 'center' }}>
            Common questions
          </h2>
          {FAQS.map((faq, i) => (
            <FAQ key={i} faq={faq} index={i} />
          ))}
        </div>
      </section>

      {/* Application form */}
      <section id="apply" style={{ padding: '80px 32px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}>
            Apply for partner access
          </h2>
          <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.7 }}>
            We review every application within 48 hours. No minimums. No sales calls required.
          </p>
        </div>

        {submitted ? (
          <div style={{
            background: '#0f1a0f', border: '1px solid #1a3a1a',
            borderRadius: 16, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Application received</h3>
            <p style={{ color: '#6b7280', fontSize: 15 }}>We'll review it and get back to you within 48 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: 16, padding: 32,
          }}>
            {[
              { key: 'name', label: 'Your Name', placeholder: 'Jordan Riley', type: 'text' },
              { key: 'company', label: 'Agency / Company', placeholder: 'Riley Digital Agency', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'jordan@rileydigital.com', type: 'email' },
              { key: 'website', label: 'Website', placeholder: 'https://rileydigital.com', type: 'url' },
              { key: 'clients', label: 'How many clients do you work with?', placeholder: '10–20', type: 'text' },
              { key: 'industry', label: 'What industries do your clients serve?', placeholder: 'Construction, home services, HVAC...', type: 'text' },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                  fontFamily: "'Space Mono', monospace",
                }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={formData[field.key]}
                  onChange={e => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required={field.key !== 'website'}
                  style={{
                    width: '100%', background: '#080808', border: '1px solid #222',
                    borderRadius: 8, padding: '12px 14px', fontSize: 15,
                    color: '#fff', outline: 'none',
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                fontFamily: "'Space Mono', monospace",
              }}>
                Which tier interests you?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { key: 'reseller', label: 'Reseller' },
                  { key: 'partner', label: 'Partner' },
                  { key: 'enterprise', label: 'Enterprise' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, tier: t.key }))}
                    style={{
                      padding: '11px', borderRadius: 6, cursor: 'pointer',
                      background: formData.tier === t.key ? '#f97316' : '#111',
                      border: `1px solid ${formData.tier === t.key ? '#f97316' : '#222'}`,
                      color: formData.tier === t.key ? '#fff' : '#6b7280',
                      fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" style={{
              width: '100%', background: '#f97316', color: '#fff',
              padding: '15px', borderRadius: 8, border: 'none',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Submit Application <ArrowRight size={16} />
            </button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1a1a1a', padding: '32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: -0.5 }}>BuildPro</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/pricing" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none' }}>Pricing</Link>
          <Link to="/migrate-from-buildertrend" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none' }}>Migration</Link>
          <Link to="/signup" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none' }}>Sign Up</Link>
        </div>
        <div style={{ color: '#4b5563', fontSize: 12 }}>© 2026 BuildPro. Built for the trades.</div>
      </footer>
    </div>
  );
}
