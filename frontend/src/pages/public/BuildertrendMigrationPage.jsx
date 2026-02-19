import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X, ChevronDown, Phone, Upload, Zap, Shield, Clock, Database } from 'lucide-react';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  { bt: 'No bulk data export — ever', bp: 'One-click full ZIP export, always' },
  { bt: '"Contact sales" for pricing', bp: 'Every price visible at buildpro.io/pricing' },
  { bt: '$499–$999/mo with zero transparency', bp: 'Starts at $49/mo. Annual saves 20%.' },
  { bt: 'Locked into their ecosystem', bp: 'Your data is yours. Leave anytime.' },
  { bt: '6–12 month contracts', bp: 'Month-to-month. No contracts.' },
  { bt: 'Support tickets take days', bp: 'Real humans. Same-day response.' },
];

const MIGRATION_STEPS = [
  {
    number: '01',
    title: 'Export from Buildertrend',
    desc: 'We send you a checklist. You export your contacts and jobs from Buildertrend — takes about 10 minutes. We\'ve mapped every column they use.',
    icon: Database,
    time: '~10 min',
  },
  {
    number: '02',
    title: 'We import everything',
    desc: 'Upload your CSVs to our migration tool. Our importer maps Buildertrend\'s field names directly to BuildPro — no manual reformatting. Preview before committing.',
    icon: Upload,
    time: '~30 min',
  },
  {
    number: '03',
    title: 'We set up your account',
    desc: 'Our team configures your plan, branding, custom fields, and team users. You don\'t touch a settings screen until everything is already how you need it.',
    icon: Zap,
    time: '1–2 days',
  },
  {
    number: '04',
    title: 'Go live with confidence',
    desc: '60-day overlap period — both systems run in parallel so your crew never misses a beat. When you\'re ready, you flip the switch.',
    icon: Shield,
    time: '60 days',
  },
];

const PACKAGES = [
  {
    name: 'Self-Serve',
    price: 'Free',
    priceNote: 'with any BuildPro plan',
    highlight: false,
    description: 'You run the migration yourself using our wizard.',
    includes: [
      'Buildertrend import wizard',
      'Contact + job field mapping',
      'Dry-run preview before import',
      'Written migration guide',
      'Email support',
    ],
    cta: 'Start Free',
    ctaHref: '/signup',
  },
  {
    name: 'Assisted',
    price: '$497',
    priceNote: 'one-time',
    highlight: true,
    badge: 'Most Popular',
    description: 'We handle the migration. You show up to a working system.',
    includes: [
      'Everything in Self-Serve',
      'We run the import for you',
      'Account setup & configuration',
      'Team onboarding call (1 hr)',
      '60-day parallel run period',
      '30-day priority support',
    ],
    cta: 'Get Migrated',
    ctaHref: '/signup?plan=migration-assisted',
  },
  {
    name: 'White Glove',
    price: '$1,497',
    priceNote: 'one-time',
    highlight: false,
    description: 'Full concierge migration. We handle everything start to finish.',
    includes: [
      'Everything in Assisted',
      'Historical data migration',
      'Document & photo transfer',
      'Custom fields & workflows',
      'Full crew training sessions',
      '90-day dedicated support',
    ],
    cta: 'Talk to Us',
    ctaHref: '/contact?service=white-glove',
  },
];

const TESTIMONIALS = [
  {
    quote: "We'd been on Buildertrend for four years. Moving sounded terrifying. BuildPro had our contacts and active jobs running in two days. The import tool is stupid simple.",
    name: 'Marcus T.',
    title: 'Owner, Tri-State Roofing',
    savings: 'Saves $420/mo',
  },
  {
    quote: "What got me was the export. Buildertrend literally told me I couldn't export my own client list. BuildPro let me download everything on day one. That's all I needed to know.",
    name: 'Sarah K.',
    title: 'Operations Manager, Keller Build Group',
    savings: 'Saves $680/mo',
  },
  {
    quote: "We had 800 contacts, 3 years of jobs, and 12 crew members. The white glove package was worth every dollar. I spent exactly zero hours on the migration.",
    name: 'Derek W.',
    title: 'CEO, Westwood Custom Homes',
    savings: 'Saves $910/mo',
  },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function CompareRow({ bt, bp, index }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
        marginBottom: 2,
        opacity: 0,
        animation: `fadeSlideUp 0.4s ease forwards ${index * 0.07}s`,
      }}
    >
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '6px 0 0 6px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <X size={14} color="#ef4444" strokeWidth={3} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#9ca3af' }}>{bt}</span>
      </div>
      <div style={{
        background: '#0f1f0f',
        border: '1px solid #1a3a1a',
        borderRadius: '0 6px 6px 0',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Check size={14} color="#4ade80" strokeWidth={3} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#d1fae5' }}>{bp}</span>
      </div>
    </div>
  );
}

function PricingCard({ pkg, index }) {
  return (
    <div style={{
      position: 'relative',
      background: pkg.highlight ? '#fff' : '#111',
      border: `2px solid ${pkg.highlight ? '#f97316' : '#222'}`,
      borderRadius: 16,
      padding: '32px 28px',
      opacity: 0,
      animation: `fadeSlideUp 0.5s ease forwards ${index * 0.1 + 0.2}s`,
    }}>
      {pkg.badge && (
        <div style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#f97316',
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          padding: '4px 14px',
          borderRadius: 20,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {pkg.badge}
        </div>
      )}

      <div style={{ marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: pkg.highlight ? '#f97316' : '#6b7280',
        }}>
          {pkg.name}
        </span>
      </div>

      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 40, fontWeight: 900, color: pkg.highlight ? '#111' : '#fff', letterSpacing: -2 }}>
          {pkg.price}
        </span>
        <span style={{ fontSize: 13, color: pkg.highlight ? '#6b7280' : '#4b5563' }}>{pkg.priceNote}</span>
      </div>

      <p style={{ fontSize: 14, color: pkg.highlight ? '#374151' : '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
        {pkg.description}
      </p>

      <div style={{ marginBottom: 28 }}>
        {pkg.includes.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <Check size={14} color={pkg.highlight ? '#f97316' : '#4ade80'} strokeWidth={3} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: pkg.highlight ? '#374151' : '#9ca3af', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      <Link to={pkg.ctaHref} style={{
        display: 'block', textAlign: 'center',
        background: pkg.highlight ? '#f97316' : 'transparent',
        border: `2px solid ${pkg.highlight ? '#f97316' : '#374151'}`,
        color: pkg.highlight ? '#fff' : '#9ca3af',
        padding: '13px 24px',
        borderRadius: 8,
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: 14,
        transition: 'all 0.2s',
      }}>
        {pkg.cta} →
      </Link>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function BuildertrendMigrationPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', contacts: '', package: 'assisted', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #f97316; color: #fff; }
        a { transition: opacity 0.2s; }
        a:hover { opacity: 0.8; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.95)',
        borderBottom: '1px solid #1a1a1a',
        backdropFilter: 'blur(12px)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: -0.5 }}>BuildPro</div>
          <div style={{ width: 1, height: 16, background: '#333' }} />
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Migration</div>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#how" style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>How It Works</a>
          <a href="#pricing" style={{ color: '#9ca3af', fontSize: 13, textDecoration: 'none' }}>Pricing</a>
          <Link to="/signup" style={{
            background: '#f97316', color: '#fff', padding: '8px 18px',
            borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 13,
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 32px 80px', maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: 20, padding: '6px 14px', marginBottom: 32,
          animation: 'fadeSlideUp 0.5s ease forwards',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>
            Migration tool live — import in minutes
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 80px)',
          fontWeight: 900,
          lineHeight: 1.0,
          letterSpacing: -3,
          marginBottom: 24,
          animation: 'fadeSlideUp 0.5s ease forwards 0.1s',
          opacity: 0,
        }}>
          Done with<br />
          <span style={{ color: '#f97316' }}>Buildertrend?</span>
        </h1>

        <p style={{
          fontSize: 20,
          color: '#6b7280',
          lineHeight: 1.7,
          maxWidth: 600,
          margin: '0 auto 40px',
          animation: 'fadeSlideUp 0.5s ease forwards 0.2s',
          opacity: 0,
        }}>
          We built a direct migration tool. Your contacts and jobs move in under an hour.
          Everything Buildertrend won't let you export, we'll help you reclaim.
        </p>

        <div style={{
          display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'fadeSlideUp 0.5s ease forwards 0.3s',
          opacity: 0,
        }}>
          <a href="#pricing" style={{
            background: '#f97316', color: '#fff',
            padding: '14px 28px', borderRadius: 8, textDecoration: 'none',
            fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            See Migration Packages <ArrowRight size={16} />
          </a>
          <a href="#compare" style={{
            background: 'transparent', color: '#fff',
            padding: '14px 28px', borderRadius: 8, textDecoration: 'none',
            fontWeight: 600, fontSize: 16,
            border: '1px solid #2a2a2a',
          }}>
            Compare Platforms
          </a>
        </div>
      </section>

      {/* The hard truth banner */}
      <section style={{
        background: '#0f0f0f',
        borderTop: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a',
        padding: '24px 32px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', gap: 48, whiteSpace: 'nowrap',
          animation: 'scroll 20s linear infinite',
        }}>
          {['No bulk export', 'No transparent pricing', 'Locked-in contracts', 'Slow support', 'Rising prices every year', 'No bulk export', 'No transparent pricing', 'Locked-in contracts', 'Slow support', 'Rising prices every year'].map((text, i) => (
            <span key={i} style={{ fontSize: 13, color: '#4b5563', fontFamily: "'DM Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#ef4444' }}>✗</span> Buildertrend: {text}
            </span>
          ))}
        </div>
        <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* Compare */}
      <section id="compare" style={{ padding: '80px 32px', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}>
            Side by side
          </h2>
          <p style={{ color: '#6b7280', fontSize: 16 }}>What you're paying for vs. what you get with BuildPro</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: 6 }}>
          <div style={{ padding: '10px 18px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
              Buildertrend
            </span>
          </div>
          <div style={{ padding: '10px 18px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
              BuildPro
            </span>
          </div>
        </div>

        {PAIN_POINTS.map((point, i) => (
          <CompareRow key={i} bt={point.bt} bp={point.bp} index={i} />
        ))}
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 32px', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}>
              How the migration works
            </h2>
            <p style={{ color: '#6b7280', fontSize: 16 }}>Four steps. Start to finish in under 30 days.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 2 }}>
            {MIGRATION_STEPS.map((step, i) => (
              <div
                key={i}
                onClick={() => setActiveStep(i)}
                style={{
                  background: activeStep === i ? '#111' : '#0a0a0a',
                  border: `1px solid ${activeStep === i ? '#f97316' : '#1a1a1a'}`,
                  borderRadius: 12,
                  padding: '28px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0,
                  animation: `fadeSlideUp 0.5s ease forwards ${i * 0.1}s`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 32, fontWeight: 500,
                    color: activeStep === i ? '#f97316' : '#222',
                    lineHeight: 1,
                  }}>
                    {step.number}
                  </span>
                  <span style={{
                    fontSize: 11, color: '#4b5563', fontFamily: "'DM Mono', monospace",
                    background: '#111', border: '1px solid #1a1a1a',
                    padding: '3px 8px', borderRadius: 4,
                  }}>
                    {step.time}
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: activeStep === i ? '#fff' : '#6b7280' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 32px', maxWidth: 1040, margin: '0 auto' }}>
        <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, marginBottom: 8, textAlign: 'center' }}>
          They made the switch
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 48 }}>Real contractors. Real migrations.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              background: '#0f0f0f',
              border: '1px solid #1a1a1a',
              borderRadius: 12, padding: 28,
              opacity: 0,
              animation: `fadeSlideUp 0.5s ease forwards ${i * 0.1}s`,
            }}>
              <div style={{
                display: 'inline-block',
                background: '#0f1f0f', border: '1px solid #1a3a1a',
                borderRadius: 4, padding: '3px 8px', marginBottom: 16,
                fontSize: 11, color: '#4ade80', fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
              }}>
                {t.savings}
              </div>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>
                "{t.quote}"
              </p>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>{t.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 32px', background: '#050505', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}>
              Migration packages
            </h2>
            <p style={{ color: '#6b7280', fontSize: 16 }}>
              One-time fee. No ongoing commitment. Includes first month of BuildPro free.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {PACKAGES.map((pkg, i) => (
              <PricingCard key={i} pkg={pkg} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id="contact" style={{ padding: '80px 32px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}>
            Ready to move?
          </h2>
          <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.7 }}>
            Tell us about your current setup. We'll confirm which package fits and get you a migration timeline within 24 hours.
          </p>
        </div>

        {submitted ? (
          <div style={{
            background: '#0f1f0f', border: '1px solid #1a3a1a',
            borderRadius: 16, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>You're on the list</h3>
            <p style={{ color: '#6b7280', fontSize: 15 }}>
              We'll reach out within 24 hours with your migration plan.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: 16, padding: 32,
          }}>
            {[
              { key: 'name', label: 'Your Name', placeholder: 'Marcus Thompson', type: 'text' },
              { key: 'company', label: 'Company', placeholder: 'Thompson Roofing LLC', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'marcus@thompsonroofing.com', type: 'email' },
              { key: 'contacts', label: 'Approx. contacts in Buildertrend', placeholder: '250', type: 'text' },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={formData[field.key]}
                  onChange={e => setFormData(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required
                  style={{
                    width: '100%', background: '#080808', border: '1px solid #222',
                    borderRadius: 8, padding: '12px 14px', fontSize: 15, color: '#fff',
                    outline: 'none',
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                Package Interest
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {['self-serve', 'assisted', 'white-glove'].map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, package: pkg }))}
                    style={{
                      padding: '10px', borderRadius: 6, cursor: 'pointer',
                      background: formData.package === pkg ? '#f97316' : '#111',
                      border: `1px solid ${formData.package === pkg ? '#f97316' : '#2a2a2a'}`,
                      color: formData.package === pkg ? '#fff' : '#6b7280',
                      fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                      transition: 'all 0.15s',
                    }}
                  >
                    {pkg}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                Anything else?
              </label>
              <textarea
                value={formData.message}
                onChange={e => setFormData(f => ({ ...f, message: e.target.value }))}
                placeholder="Tell us about your current Buildertrend setup, team size, or any concerns..."
                rows={4}
                style={{
                  width: '100%', background: '#080808', border: '1px solid #222',
                  borderRadius: 8, padding: '12px 14px', fontSize: 15, color: '#fff',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>

            <button type="submit" style={{
              width: '100%', background: '#f97316', color: '#fff',
              padding: '15px', borderRadius: 8, border: 'none',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Start My Migration <ArrowRight size={16} />
            </button>

            <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 12, marginTop: 16 }}>
              No credit card required. We'll reach out within 24 hours.
            </p>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1a1a1a', padding: '32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: -0.5 }}>BuildPro</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/pricing" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none' }}>Pricing</Link>
          <Link to="/signup" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none' }}>Sign Up</Link>
          <Link to="/agency" style={{ color: '#4b5563', fontSize: 13, textDecoration: 'none' }}>Agency Program</Link>
        </div>
        <div style={{ color: '#4b5563', fontSize: 12 }}>© 2026 BuildPro. Your data, your rules.</div>
      </footer>
    </div>
  );
}
