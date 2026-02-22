import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ChevronDown, Menu, X,
  Zap, Shield, BarChart3, Users, Clock, FileText,
  Smartphone, Globe, Wrench, Building2, TrendingUp,
  Star, Play, ChevronRight
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'For Contractors', href: '#industries' },
  { label: 'Self-Hosted', href: '/self-hosted' },
];

const STATS = [
  { value: '2,400+', label: 'Contractors Running Twomiah Build' },
  { value: '$1.2B', label: 'In Invoices Processed' },
  { value: '98.9%', label: 'Uptime SLA' },
  { value: '4.9★', label: 'Average Customer Rating' },
];

const FEATURES = [
  {
    icon: FileText,
    title: 'Quotes & Invoicing',
    desc: 'Create professional quotes in minutes. Auto-convert to invoices. Get paid online.',
    color: '#f97316',
  },
  {
    icon: Clock,
    title: 'Scheduling & Dispatch',
    desc: 'Drag-and-drop calendar. GPS time tracking. Auto clock-in at job sites.',
    color: '#fb923c',
  },
  {
    icon: Users,
    title: 'CRM & Lead Pipeline',
    desc: 'Every lead, every customer, every job — tracked from first contact to final payment.',
    color: '#f97316',
  },
  {
    icon: BarChart3,
    title: 'Job Costing & Reports',
    desc: 'Know your margins on every job. Compare estimate vs. actual in real time.',
    color: '#fb923c',
  },
  {
    icon: Shield,
    title: 'QuickBooks Sync',
    desc: 'Two-way sync with QuickBooks Online. Your accountant will love you.',
    color: '#f97316',
  },
  {
    icon: Smartphone,
    title: 'Mobile Field App',
    desc: 'Your crew clocks in, captures photos, and submits daily logs — from the field.',
    color: '#fb923c',
  },
  {
    icon: Globe,
    title: 'Customer Portal',
    desc: 'Clients approve quotes, view invoices, and pay online without calling you.',
    color: '#f97316',
  },
  {
    icon: Wrench,
    title: 'Project Management',
    desc: 'Change orders, RFIs, punch lists, lien waivers — the full construction stack.',
    color: '#fb923c',
  },
];

const TESTIMONIALS = [
  {
    quote: "We cut our billing time by 70%. What used to take me a Friday afternoon now takes 20 minutes.",
    name: "Mike Claflin",
    title: "Owner, Claflin Construction",
    location: "Eau Claire, WI",
    rating: 5,
  },
  {
    quote: "Finally replaced five different apps with one. Scheduling, invoicing, QuickBooks — all in one place.",
    name: "Sarah Torres",
    title: "Operations Manager, Torres Roofing",
    location: "Denver, CO",
    rating: 5,
  },
  {
    quote: "The customer portal alone is worth the price. No more chasing approvals over email.",
    name: "Dave Hendricks",
    title: "CEO, Hendricks HVAC",
    location: "Nashville, TN",
    rating: 5,
  },
];

const INDUSTRIES = [
  { name: 'General Contracting', icon: Building2 },
  { name: 'Roofing', icon: Wrench },
  { name: 'HVAC', icon: Zap },
  { name: 'Plumbing', icon: Wrench },
  { name: 'Electrical', icon: Zap },
  { name: 'Landscaping', icon: Globe },
  { name: 'Painting', icon: FileText },
  { name: 'Flooring', icon: Building2 },
];

// ─── HOOK: Intersection Observer ────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── COMPONENTS ─────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(3,7,18,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(249,115,22,0.15)' : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="32" height="36" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 38 C12 38 2 30 4 18 C6 8 12 4 12 4 C12 4 10 14 16 18 C16 18 14 10 22 2 C22 2 20 16 26 20 C30 23 28 32 24 36 C22 38 20 40 24 40 Z" fill="url(#navFlame1)"/>
            <path d="M22 38 C22 38 30 33 28 24 C27 18 22 15 22 15 C22 15 24 22 20 26 C20 26 26 18 22 10 C22 10 30 20 28 28 C27 33 25 37 28 40 Z" fill="url(#navFlame2)" opacity="0.85"/>
            <defs>
              <linearGradient id="navFlame1" x1="0" y1="40" x2="10" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF3D00"/>
                <stop offset="100%" stopColor="#FFAB00"/>
              </linearGradient>
              <linearGradient id="navFlame2" x1="0" y1="40" x2="10" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF6D00"/>
                <stop offset="100%" stopColor="#FFD600"/>
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}>
            TWOMIAH <span style={{ color: '#f97316' }}>BUILD</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hide-mobile">
          {NAV_LINKS.map(l => (
            l.href.startsWith('/') ? (
              <Link key={l.label} to={l.href} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'white'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >{l.label}</Link>
            ) : (
              <a key={l.label} href={l.href} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'white'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >{l.label}</a>
            )
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hide-mobile">
          <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px' }}>Sign In</Link>
          <Link to="/signup" style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600,
            padding: '9px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
          }}>
            Start Free Trial <ArrowRight size={14} />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8 }} className="show-mobile">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: '#030712', borderTop: '1px solid rgba(249,115,22,0.15)', padding: '16px 24px 24px' }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} style={{ display: 'block', color: '#94a3b8', textDecoration: 'none', padding: '12px 0', fontSize: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{l.label}</a>
          ))}
          <Link to="/signup" style={{
            display: 'block', marginTop: 16, textAlign: 'center',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 600,
            padding: '12px 20px', borderRadius: 8,
          }}>Start Free Trial</Link>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  const words = ['Roofing', 'HVAC', 'Plumbing', 'Electrical', 'Contracting'];
  const [wordIdx, setWordIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => { setWordIdx(i => (i + 1) % words.length); setFade(true); }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,0.18) 0%, transparent 70%), #030712',
      position: 'relative', overflow: 'hidden', paddingTop: 100, overflowX: 'hidden',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ maxWidth: 800 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 100, padding: '6px 14px', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#fb923c', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Now with Auto-Deploy Factory</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 800, lineHeight: 1.0, color: 'white', marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>
            THE OPERATING SYSTEM
          </h1>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 800, lineHeight: 1.0, marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>
            <span style={{ color: '#f97316' }}>FOR</span>{' '}
            <span style={{
              color: '#f97316',
              transition: 'opacity 0.3s ease',
              opacity: fade ? 1 : 0,
              display: 'inline-block',
            }}>{words[wordIdx].toUpperCase()}</span>
          </h1>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 800, lineHeight: 1.0, color: 'white', marginBottom: 28,
            letterSpacing: '-0.02em',
          }}>
            BUSINESSES.
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.7, marginBottom: 44, maxWidth: 560 }}>
            CRM, scheduling, invoicing, QuickBooks sync, GPS tracking, and a customer portal — 
            all in one platform built for the trades. Replace 5 apps with one.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 52 }}>
            <Link to="/signup" style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 700,
              padding: '14px 28px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 30px rgba(249,115,22,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(249,115,22,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(249,115,22,0.4)'; }}
            >
              Start Free 14-Day Trial <ArrowRight size={18} />
            </Link>
            <a href="#demo" style={{
              color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 600,
              padding: '14px 28px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <Play size={16} fill="currentColor" /> Watch Demo
            </a>
          </div>

          {/* Trust signals */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {['No credit card required', '14-day free trial', 'Cancel anytime'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#64748b', fontSize: 14 }}>
                <CheckCircle2 size={15} color="#f97316" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div style={{
          position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
          width: '42%', maxWidth: 480,
          background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(249,115,22,0.2)',
          borderRadius: 16, padding: 24,
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.1)',
          backdropFilter: 'blur(20px)',
        }} className="hide-mobile">
          {/* Fake dashboard */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
            <span style={{ color: '#f97316', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dashboard Overview</span>
            <span style={{ color: '#475569', fontSize: 11 }}>Feb 2026</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Open Jobs', val: '24', delta: '+3', up: true },
              { label: 'Revenue MTD', val: '$84,200', delta: '+18%', up: true },
              { label: 'Unpaid Invoices', val: '$12,450', delta: '-4%', up: false },
              { label: 'Crew Active', val: '8 / 11', delta: '73%', up: true },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{s.val}</div>
                <div style={{ color: s.up ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 600 }}>{s.delta} this month</div>
              </div>
            ))}
          </div>
          {/* Mini chart bars */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#64748b', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue — Last 7 Days</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
              {[35, 55, 45, 70, 60, 85, 100].map((h, i) => (
                <div key={i} style={{
                  flex: 1, height: `${h}%`, borderRadius: 4,
                  background: i === 6 ? 'linear-gradient(to top, #f97316, #fb923c)' : 'rgba(249,115,22,0.2)',
                }} />
              ))}
            </div>
          </div>
          {/* Recent jobs */}
          {[
            { job: 'Roof Replacement — Henderson', status: 'In Progress', dot: '#f97316' },
            { job: 'HVAC Install — Park District', status: 'Scheduled', dot: '#3b82f6' },
            { job: 'Siding — 4102 Oakwood', status: 'Invoiced', dot: '#22c55e' },
          ].map(j => (
            <div key={j.job} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#cbd5e1', fontSize: 12 }}>{j.job}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: j.dot, display: 'inline-block' }} />
                {j.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <a href="#stats" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: '#475569', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'bounce 2s infinite' }}>
        <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
        <ChevronDown size={18} />
      </a>
    </section>
  );
}

function Stats() {
  const [ref, inView] = useInView();
  return (
    <section id="stats" ref={ref} style={{ background: 'rgba(249,115,22,0.06)', borderTop: '1px solid rgba(249,115,22,0.15)', borderBottom: '1px solid rgba(249,115,22,0.15)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'center' }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)', transition: `all 0.5s ease ${i * 0.1}s` }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 44, fontWeight: 800, color: '#f97316', lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const [ref, inView] = useInView(0.1);
  return (
    <section id="features" ref={ref} style={{ background: '#030712', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', color: '#f97316', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, background: 'rgba(249,115,22,0.1)', padding: '6px 14px', borderRadius: 100, border: '1px solid rgba(249,115,22,0.25)' }}>
            Everything In One Platform
          </div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
            REPLACE YOUR ENTIRE<br />
            <span style={{ color: '#f97316' }}>SOFTWARE STACK</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 18, maxWidth: 520, margin: '0 auto' }}>
            Stop paying for 5 apps that don't talk to each other. Twomiah Build is everything your field service business needs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(249,115,22,0.1)',
                borderRadius: 14, padding: 28, cursor: 'default',
                opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(24px)',
                transition: `all 0.5s ease ${i * 0.07}s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(249,115,22,0.35)'; e.currentTarget.style.background = 'rgba(249,115,22,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(249,115,22,0.1)'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={22} color={f.color} />
                </div>
                <h3 style={{ color: 'white', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  const [ref, inView] = useInView();
  return (
    <section id="industries" ref={ref} style={{ background: 'rgba(249,115,22,0.03)', borderTop: '1px solid rgba(249,115,22,0.1)', borderBottom: '1px solid rgba(249,115,22,0.1)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ color: '#f97316', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
          Built for the Trades
        </div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: 'white', marginBottom: 48 }}>
          WHATEVER YOU BUILD, WE'VE GOT YOU
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {INDUSTRIES.map((ind, i) => {
            const Icon = ind.icon;
            return (
              <div key={ind.name} style={{
                background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)',
                borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
                opacity: inView ? 1 : 0, transform: inView ? 'none' : 'scale(0.9)',
                transition: `all 0.4s ease ${i * 0.06}s`,
              }}>
                <Icon size={14} color="#f97316" />
                <span style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 500 }}>{ind.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [ref, inView] = useInView(0.1);
  return (
    <section ref={ref} style={{ background: '#030712', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>
            CONTRACTORS <span style={{ color: '#f97316' }}>TRUST US</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 16 }}>Don't take our word for it.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(249,115,22,0.15)',
              borderRadius: 16, padding: 32,
              opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)',
              transition: `all 0.5s ease ${i * 0.15}s`,
            }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                {Array(t.rating).fill(0).map((_, j) => (
                  <Star key={j} size={14} color="#f97316" fill="#f97316" />
                ))}
              </div>
              <blockquote style={{ color: '#e2e8f0', fontSize: 16, lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>
                "{t.quote}"
              </blockquote>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{t.title}</div>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>{t.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const [ref, inView] = useInView();
  return (
    <section ref={ref} style={{
      background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))',
      borderTop: '1px solid rgba(249,115,22,0.2)', borderBottom: '1px solid rgba(249,115,22,0.2)',
      padding: '80px 24px',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
          STARTS AT <span style={{ color: '#f97316' }}>$49/MO.</span><br />
          SCALES TO YOUR SIZE.
        </div>
        <p style={{ color: '#94a3b8', fontSize: 17, lineHeight: 1.7, marginBottom: 12 }}>
          From sole proprietors to 50-person crews. SaaS plans, self-hosted licenses, or let us deploy a fully white-labeled system for your customers.
        </p>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 36 }}>
          14-day free trial. No credit card required.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
          <Link to="/pricing" style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 700,
            padding: '14px 32px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 30px rgba(249,115,22,0.4)',
          }}>
            View All Plans <ChevronRight size={18} />
          </Link>
          <Link to="/self-hosted" style={{
            color: '#94a3b8', textDecoration: 'none', fontSize: 16, fontWeight: 600,
            padding: '14px 32px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Self-Hosted Options
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const [ref, inView] = useInView();
  return (
    <section id="demo" ref={ref} style={{ background: '#030712', padding: '100px 24px' }}>
      <div style={{
        maxWidth: 900, margin: '0 auto', textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.1), transparent 70%)',
        opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 100, padding: '6px 14px', marginBottom: 32 }}>
          <Zap size={13} color="#f97316" fill="#f97316" />
          <span style={{ color: '#fb923c', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Up and running in under 10 minutes</span>
        </div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, color: 'white', lineHeight: 1.05, marginBottom: 20 }}>
          READY TO RUN YOUR<br />
          <span style={{ color: '#f97316' }}>BUSINESS SMARTER?</span>
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 44, maxWidth: 500, margin: '0 auto 44px' }}>
          Join thousands of contractors who ditched the spreadsheets and the chaos.
        </p>
        <Link to="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: 'white', textDecoration: 'none', fontSize: 18, fontWeight: 700,
          padding: '16px 40px', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(249,115,22,0.45)',
        }}>
          Start Your Free Trial <ArrowRight size={20} />
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 24, marginTop: 28 }}>
          {['No credit card', '14 days free', 'Cancel anytime', 'Full access'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}>
              <CheckCircle2 size={13} color="#f97316" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: '#030712', borderTop: '1px solid rgba(249,115,22,0.1)', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <svg width="26" height="30" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 38 C12 38 2 30 4 18 C6 8 12 4 12 4 C12 4 10 14 16 18 C16 18 14 10 22 2 C22 2 20 16 26 20 C30 23 28 32 24 36 C22 38 20 40 24 40 Z" fill="url(#footFlame1)"/>
                <path d="M22 38 C22 38 30 33 28 24 C27 18 22 15 22 15 C22 15 24 22 20 26 C20 26 26 18 22 10 C22 10 30 20 28 28 C27 33 25 37 28 40 Z" fill="url(#footFlame2)" opacity="0.85"/>
                <defs>
                  <linearGradient id="footFlame1" x1="0" y1="40" x2="10" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FF3D00"/>
                    <stop offset="100%" stopColor="#FFAB00"/>
                  </linearGradient>
                  <linearGradient id="footFlame2" x1="0" y1="40" x2="10" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FF6D00"/>
                    <stop offset="100%" stopColor="#FFD600"/>
                  </linearGradient>
                </defs>
              </svg>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'white', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}>
                TWOMIAH <span style={{ color: '#f97316' }}>BUILD</span>
              </span>
            </div>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7 }}>The operating system for field service businesses.</p>
          </div>
          {[
            { heading: 'Product', links: ['Features', 'Pricing', 'Self-Hosted', 'Changelog'] },
            { heading: 'Industries', links: ['Roofing', 'HVAC', 'Plumbing', 'General Contracting'] },
            { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
          ].map(col => (
            <div key={col.heading}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>{col.heading}</div>
              {col.links.map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ color: '#475569', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#94a3b8'}
                    onMouseLeave={e => e.target.style.color = '#475569'}
                  >{l}</a>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#334155', fontSize: 13 }}>© 2026 Twomiah Build. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Security'].map(l => (
              <a key={l} href="#" style={{ color: '#334155', textDecoration: 'none', fontSize: 13 }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap');
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .hide-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media (max-width: 1100px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: '#030712', minHeight: '100vh' }}>
        <Nav />
        <Hero />
        <Stats />
        <Features />
        <Industries />
        <Testimonials />
        <PricingTeaser />
        <CTA />
        <Footer />
      </div>
    </>
  );
}
