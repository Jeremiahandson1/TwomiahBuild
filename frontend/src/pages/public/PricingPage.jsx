import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const styles = `
  .pricing-root {
    background: #0a0a0a;
    color: #d1d5db;
    font-family: 'Barlow', sans-serif;
    min-height: 100vh;
    position: relative;
  }

  .pricing-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  .pr-nav {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 48px;
    border-bottom: 1px solid #2a2d35;
  }

  .pr-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: 0.05em;
    color: #f5f5f0;
    text-decoration: none;
  }

  .pr-logo span { color: #f97316; }

  .pr-nav-links {
    display: flex;
    gap: 32px;
    list-style: none;
    margin: 0;
    padding: 0;
    align-items: center;
  }

  .pr-nav-links a {
    color: #6b7280;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.03em;
    transition: color 0.2s;
  }

  .pr-nav-links a:hover { color: #f5f5f0; }

  .pr-nav-cta {
    background: #f97316 !important;
    color: #0a0a0a !important;
    padding: 8px 20px;
    font-weight: 600 !important;
    border-radius: 2px;
  }

  .pr-nav-cta:hover { background: #c45c0e !important; color: #f5f5f0 !important; }

  /* HERO */
  .pr-hero {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 80px 48px 60px;
    animation: pr-fadeUp 0.6s ease forwards;
  }

  @keyframes pr-fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .pr-founding-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.3);
    color: #f59e0b;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 2px;
    margin-bottom: 28px;
    animation: pr-pulse-border 2s ease-in-out infinite;
  }

  @keyframes pr-pulse-border {
    0%, 100% { border-color: rgba(245,158,11,0.3); }
    50% { border-color: rgba(245,158,11,0.7); }
  }

  .pr-badge-dot {
    width: 6px;
    height: 6px;
    background: #f59e0b;
    border-radius: 50%;
    animation: pr-blink 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes pr-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .pr-h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(52px, 7vw, 88px);
    line-height: 0.95;
    letter-spacing: -0.01em;
    color: #f5f5f0;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .pr-h1 em {
    font-style: normal;
    color: #f97316;
    display: block;
  }

  .pr-hero-sub {
    font-size: 18px;
    color: #6b7280;
    max-width: 560px;
    margin: 0 auto 40px;
    font-weight: 300;
  }

  /* BILLING TOGGLE */
  .pr-billing-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0;
    background: #1e2025;
    border: 1px solid #2a2d35;
    border-radius: 2px;
    padding: 6px;
    margin-bottom: 64px;
  }

  .pr-toggle-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 8px 20px;
    border: none;
    border-radius: 1px;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    color: #6b7280;
  }

  .pr-toggle-btn.active {
    background: #f97316;
    color: #0a0a0a;
  }

  .pr-save-badge {
    font-size: 11px;
    background: rgba(249,115,22,0.15);
    color: #f97316;
    padding: 2px 8px;
    border-radius: 2px;
    font-weight: 600;
    margin-left: 6px;
  }

  /* SECTION */
  .pr-section {
    position: relative;
    z-index: 1;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 48px 80px;
  }

  /* PLANS GRID */
  .pr-plans-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: #2a2d35;
    border: 1px solid #2a2d35;
    border-radius: 4px;
    overflow: hidden;
  }

  .pr-plan {
    background: #141414;
    padding: 36px 28px;
    position: relative;
    transition: background 0.2s;
  }

  .pr-plan:hover { background: #1e2025; }

  .pr-plan.featured {
    background: #1e2025;
    outline: 2px solid #f97316;
    outline-offset: -2px;
    z-index: 2;
  }

  .pr-plan.featured::before {
    content: 'MOST POPULAR';
    position: absolute;
    top: -1px;
    left: 50%;
    transform: translateX(-50%);
    background: #f97316;
    color: #0a0a0a;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 10px;
    letter-spacing: 0.15em;
    padding: 4px 14px;
    border-radius: 0 0 4px 4px;
    white-space: nowrap;
  }

  .pr-plan-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #f97316;
    margin-bottom: 16px;
  }

  .pr-price-amount {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 56px;
    line-height: 1;
    color: #f5f5f0;
    letter-spacing: -0.02em;
  }

  .pr-price-amount sup {
    font-size: 24px;
    vertical-align: top;
    margin-top: 10px;
    display: inline-block;
  }

  .pr-price-period {
    font-size: 13px;
    color: #6b7280;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .pr-price-setup {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .pr-price-setup span { color: #10b981; font-weight: 600; }

  .pr-trial-badge {
    display: inline-block;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.25);
    color: #10b981;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 3px 10px;
    border-radius: 2px;
    margin: 12px 0 20px;
  }

  .pr-divider {
    height: 1px;
    background: #2a2d35;
    margin: 20px 0;
  }

  .pr-limits { margin-bottom: 20px; }

  .pr-limit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #d1d5db;
    padding: 5px 0;
    font-weight: 500;
  }

  .pr-limit-icon {
    width: 18px;
    height: 18px;
    border-radius: 2px;
    background: rgba(249,115,22,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 10px;
    color: #f97316;
  }

  .pr-features-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 12px;
  }

  .pr-feature-list {
    list-style: none;
    padding: 0;
    margin: 0 0 28px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pr-feature-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: #d1d5db;
    line-height: 1.4;
  }

  .pr-feature-list li::before {
    content: '✓';
    color: #f97316;
    font-weight: 700;
    font-size: 12px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .pr-feature-list li.dim { color: #6b7280; }
  .pr-feature-list li.dim::before { color: #2a2d35; }

  .pr-cta {
    display: block;
    width: 100%;
    padding: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: center;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    border: none;
  }

  .pr-cta-primary { background: #f97316; color: #0a0a0a; }
  .pr-cta-primary:hover { background: #c45c0e; color: #f5f5f0; }

  .pr-cta-outline { background: transparent; color: #d1d5db; border: 1px solid #2a2d35; }
  .pr-cta-outline:hover { border-color: #f97316; color: #f97316; }

  .pr-cta-gold { background: transparent; color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
  .pr-cta-gold:hover { background: rgba(245,158,11,0.1); border-color: #f59e0b; }

  /* SECTION HEADER */
  .pr-section-header {
    display: flex;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 32px;
    flex-wrap: wrap;
  }

  .pr-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 36px;
    text-transform: uppercase;
    color: #f5f5f0;
    line-height: 1;
    margin: 0;
  }

  .pr-section-title span { color: #f97316; }

  .pr-section-sub {
    font-size: 14px;
    color: #6b7280;
    max-width: 480px;
    padding-bottom: 2px;
    margin: 0;
  }

  /* PERPETUAL GRID */
  .pr-perpetual-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: #2a2d35;
    border: 1px solid #2a2d35;
    border-radius: 4px;
    overflow: hidden;
  }

  .pr-perp-card {
    background: #141414;
    padding: 32px 28px;
    transition: background 0.2s;
  }

  .pr-perp-card:hover { background: #1e2025; }

  .pr-perp-card.enterprise-perp {
    background: linear-gradient(135deg, rgba(245,158,11,0.06) 0%, #141414 100%);
    border-left: 2px solid rgba(245,158,11,0.2);
  }

  .pr-perp-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 12px;
  }

  .pr-perp-name.gold { color: #f59e0b; }

  .pr-perp-price {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 44px;
    color: #f5f5f0;
    line-height: 1;
    margin-bottom: 4px;
  }

  .pr-perp-price sup {
    font-size: 20px;
    vertical-align: top;
    margin-top: 8px;
    display: inline-block;
  }

  .pr-perp-price.custom {
    font-size: 32px;
    padding-top: 8px;
    color: #f59e0b;
    line-height: 1.2;
  }

  .pr-perp-note {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .pr-perp-note strong { color: #d1d5db; }

  .pr-perp-includes {
    list-style: none;
    padding: 0;
    margin: 0 0 24px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .pr-perp-includes li {
    font-size: 13px;
    color: #d1d5db;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .pr-perp-includes li::before {
    content: '→';
    color: #f97316;
    font-size: 11px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* UNIVERSAL GRID */
  .pr-universal-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: #2a2d35;
    border: 1px solid #2a2d35;
    border-radius: 4px;
    overflow: hidden;
  }

  .pr-universal-item {
    background: #141414;
    padding: 28px 24px;
    transition: background 0.2s;
  }

  .pr-universal-item:hover { background: #1e2025; }

  .pr-universal-icon { font-size: 24px; margin-bottom: 12px; }

  .pr-universal-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #f5f5f0;
    margin-bottom: 6px;
  }

  .pr-universal-desc { font-size: 13px; color: #6b7280; line-height: 1.5; }

  /* OVERAGES */
  .pr-overages-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #2a2d35;
    border: 1px solid #2a2d35;
    border-radius: 4px;
    overflow: hidden;
  }

  .pr-overage-item {
    background: #141414;
    padding: 24px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .pr-overage-label { font-size: 14px; color: #d1d5db; font-weight: 500; }
  .pr-overage-sub { font-size: 12px; color: #6b7280; margin-top: 3px; }

  .pr-overage-price {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 20px;
    color: #f97316;
    white-space: nowrap;
  }

  /* FOUNDING CARD */
  .pr-founding-card {
    background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(249,115,22,0.05) 100%);
    border: 1px solid rgba(245,158,11,0.25);
    border-radius: 4px;
    padding: 48px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 40px;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .pr-founding-card::before {
    content: '10';
    position: absolute;
    right: -20px;
    top: -40px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 200px;
    color: rgba(245,158,11,0.04);
    line-height: 1;
    pointer-events: none;
  }

  .pr-founding-card h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 36px;
    text-transform: uppercase;
    color: #f5f5f0;
    margin-bottom: 8px;
    line-height: 1;
  }

  .pr-founding-card h2 span { color: #f59e0b; }

  .pr-founding-card p {
    font-size: 15px;
    color: #6b7280;
    max-width: 520px;
    line-height: 1.6;
    margin: 0;
  }

  .pr-spots-count {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 64px;
    line-height: 1;
    color: #f59e0b;
    text-align: center;
  }

  .pr-spots-bar {
    width: 120px;
    height: 4px;
    background: #2a2d35;
    border-radius: 2px;
    margin: 10px auto 6px;
    overflow: hidden;
  }

  .pr-spots-fill {
    height: 100%;
    background: #f59e0b;
    border-radius: 2px;
    width: 0%;
  }

  .pr-spots-label {
    font-size: 12px;
    color: #6b7280;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    text-align: center;
  }

  /* FAQ */
  .pr-faq-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background: #2a2d35;
    border: 1px solid #2a2d35;
    border-radius: 4px;
    overflow: hidden;
  }

  .pr-faq-item {
    background: #141414;
    padding: 28px;
    transition: background 0.2s;
  }

  .pr-faq-item:hover { background: #1e2025; }

  .pr-faq-q {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 16px;
    color: #f5f5f0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 10px;
  }

  .pr-faq-a { font-size: 13px; color: #6b7280; line-height: 1.6; }

  /* FOOTER */
  .pr-footer {
    position: relative;
    z-index: 1;
    border-top: 1px solid #2a2d35;
    padding: 32px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pr-footer p { font-size: 13px; color: #6b7280; margin: 0; }
  .pr-footer a { color: #f97316; text-decoration: none; }

  @media (max-width: 1100px) {
    .pr-plans-grid { grid-template-columns: repeat(2, 1fr); }
    .pr-perpetual-grid { grid-template-columns: repeat(2, 1fr); }
    .pr-universal-grid { grid-template-columns: repeat(2, 1fr); }
    .pr-overages-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .pr-nav, .pr-hero, .pr-section, .pr-footer { padding-left: 20px; padding-right: 20px; }
    .pr-plans-grid, .pr-perpetual-grid, .pr-universal-grid, .pr-faq-grid { grid-template-columns: 1fr; }
    .pr-founding-card { grid-template-columns: 1fr; }
    .pr-nav { flex-direction: column; gap: 16px; }
    .pr-nav-links { flex-wrap: wrap; justify-content: center; }
  }
`;

const PLANS = {
  monthly: [
    {
      name: 'Solo',
      price: '$49',
      period: 'per month',
      setup: '$299',
      limits: ['2 admin users', 'Unlimited field users', '5 active projects', '10 GB storage'],
      featuresLabel: 'Includes',
      features: [
        { text: 'Contacts & lead management' },
        { text: 'Quotes with PDF generation' },
        { text: 'Invoices & payment tracking' },
        { text: 'QuickBooks integration' },
        { text: 'Mobile app (iOS & Android)' },
        { text: 'Data migration assistance' },
        { text: 'Jobs & scheduling', dim: true },
        { text: 'RFIs, change orders, punch lists', dim: true },
        { text: 'Time tracking & expenses', dim: true },
      ],
      cta: 'Start Free Trial',
      ctaClass: 'pr-cta-outline',
      ctaTo: '/signup',
    },
    {
      name: 'Starter',
      price: '$129',
      period: 'per month',
      setup: '$499',
      limits: ['5 admin users', 'Unlimited field users', '20 active projects', '25 GB storage'],
      featuresLabel: 'Everything in Solo, plus',
      features: [
        { text: 'Jobs, dispatch & scheduling' },
        { text: 'Drag-and-drop calendar' },
        { text: 'Document management' },
        { text: 'Free data migration from Jobber, Procore & others' },
        { text: 'Real-time WebSocket updates' },
        { text: 'RFIs, change orders, punch lists', dim: true },
        { text: 'Time tracking & expenses', dim: true },
        { text: 'Bid pipeline & win rate analytics', dim: true },
      ],
      cta: 'Start Free Trial',
      ctaClass: 'pr-cta-outline',
      ctaTo: '/signup',
    },
    {
      name: 'Pro',
      price: '$299',
      period: 'per month',
      setup: '$999',
      featured: true,
      limits: ['15 admin users', 'Unlimited field users', 'Unlimited projects', '100 GB storage'],
      featuresLabel: 'Everything in Starter, plus',
      features: [
        { text: 'RFIs with response workflow' },
        { text: 'Change orders & approvals' },
        { text: 'Punch lists & verification' },
        { text: 'Daily logs — weather, crew, work' },
        { text: 'Inspections (pass/fail workflow)' },
        { text: 'Time tracking & billable hours' },
        { text: 'Expenses & receipts' },
        { text: 'Bid pipeline & win rate analytics' },
        { text: 'Free white-glove data migration' },
      ],
      cta: 'Start Free Trial',
      ctaClass: 'pr-cta-primary',
      ctaTo: '/signup',
    },
    {
      name: 'Enterprise',
      price: '$85',
      priceSuffix: '/user',
      period: 'per month · 15 user minimum',
      setup: '$1,999',
      setupNote: 'Perpetual license: call us',
      limits: ['Unlimited admin users', 'Unlimited field users', 'Unlimited projects', '500 GB storage'],
      featuresLabel: 'Everything in Pro, plus',
      features: [
        { text: 'Custom branding & white-label' },
        { text: 'API access' },
        { text: 'Dedicated onboarding specialist' },
        { text: 'Priority support' },
        { text: 'Free white-glove data migration' },
        { text: 'Perpetual license available' },
        { text: 'Volume pricing available' },
      ],
      cta: 'Contact Sales',
      ctaClass: 'pr-cta-gold',
      ctaTo: '/signup',
      gold: true,
    },
  ],
  annual: [
    { price: '$539', period: 'per year' },
    { price: '$1,419', period: 'per year' },
    { price: '$3,289', period: 'per year' },
    { price: '$935', priceSuffix: '/user', period: 'per year · 15 user minimum' },
  ],
};

const PERPETUAL = [
  {
    name: 'Solo — Perpetual',
    price: '$1,764',
    note: 'One-time purchase. Own it forever. No setup fee for self-hosters. Optional: Updates sub $99/yr · Managed hosting $29/mo',
    includes: [
      'This version of the software, permanently',
      'Self-host on your own server — free',
      'New versions available as optional paid upgrades',
      'No recurring fees unless you choose them',
    ],
  },
  {
    name: 'Starter — Perpetual',
    price: '$4,644',
    note: 'One-time purchase. Own it forever. No setup fee for self-hosters. Optional: Updates sub $99/yr · Managed hosting $29/mo',
    includes: [
      'This version of the software, permanently',
      'Self-host on your own server — free',
      'New versions available as optional paid upgrades',
      'No recurring fees unless you choose them',
    ],
  },
  {
    name: 'Pro — Perpetual',
    price: '$10,764',
    note: 'One-time purchase. Own it forever. No setup fee for self-hosters. Optional: Updates sub $149/yr · Managed hosting $29/mo',
    includes: [
      'This version of the software, permanently',
      'Self-host on your own server — free',
      'New versions available as optional paid upgrades',
      'No recurring fees unless you choose them',
    ],
  },
  {
    name: 'Enterprise — Perpetual',
    custom: true,
    note: 'Priced for your operation. Built to your scale, your headcount, your needs. No setup fee for self-hosters. On-premise deployment available.',
    includes: [
      'Fully custom license quote',
      'On-premise or self-hosted deployment',
      'Commercial license with source access option',
      'Annual maintenance plan available',
    ],
  },
];

const UNIVERSAL = [
  { icon: '🛡️', title: 'Universal Support', desc: "Same support for every customer, regardless of plan. No second-class treatment." },
  { icon: '📦', title: 'Data Migration', desc: "We'll move your data from Jobber, Procore, Buildertrend, or spreadsheets. Free on Starter and above." },
  { icon: '🔄', title: '30-Day Money Back', desc: "Not the right fit? Full refund within 30 days, no questions asked, no hassle." },
  { icon: '🤝', title: 'Referral Program', desc: "Refer a contractor who signs up — you both get a free month. No limits on referrals." },
  { icon: '📱', title: 'Mobile App', desc: "iOS and Android apps included. Your whole crew in the system from the field." },
  { icon: '📊', title: 'QuickBooks Sync', desc: "Two-way QuickBooks integration keeps your books and your jobs in sync automatically." },
  { icon: '🔒', title: 'Security Included', desc: "JWT auth, bcrypt encryption, rate limiting, audit logs, and SQL injection protection — standard." },
  { icon: '⚡', title: 'Real-Time Updates', desc: "WebSocket-powered live sync. Everyone on your team sees changes the moment they happen." },
];

const FAQS = [
  {
    q: "What's the difference between admin and field users?",
    a: "Admin users have full platform access — project management, invoicing, reporting, settings. Field users can clock in, update job status, upload photos, view their schedule, and complete punch list items. Field users are always free, unlimited on every plan.",
  },
  {
    q: 'What does "own it forever" actually mean?',
    a: "You buy the software as it exists today. It runs on your infrastructure forever, with no ongoing fees required. When new versions release, you can buy the upgrade if you want it — or keep running what you have. No subscription, no renting, no gotchas.",
  },
  {
    q: 'Can you migrate our data from Jobber or Procore?',
    a: "Yes. We handle migrations from Jobber, Procore, Buildertrend, Housecall Pro, and most spreadsheet-based systems. Migration is free on Starter and above. Solo customers can reach out for a custom quote.",
  },
  {
    q: 'What happens if we need more users or projects?',
    a: "You pay a simple overage rate — $25/month per extra admin user, $10/month per extra active project. You don't have to upgrade your whole plan just because you hired one more person.",
  },
  {
    q: 'Is the annual plan a real commitment?',
    a: "Yes, annual plans are billed upfront and aren't refundable after 30 days. But you get one full month free. If you're unsure, start monthly and switch to annual once you know it's right for your operation.",
  },
  {
    q: 'What does the 30-day money back guarantee cover?',
    a: "Everything — monthly, annual, and perpetual purchases. Within 30 days of your first payment, if Twomiah Build isn't the right fit, we'll refund 100% with no questions asked. That includes the setup fee.",
  },
  {
    q: 'How does Enterprise per-user pricing work?',
    a: "Enterprise is $85 per admin user per month with a 15-user minimum, putting the floor at $1,275/month. Field workers remain free and unlimited. As your team grows, your cost scales with it.",
  },
  {
    q: 'Is a perpetual license available for Enterprise?',
    a: "Yes, and it's priced based on your specific headcount and requirements. Call us for a quote. Enterprise perpetual customers also have the option for on-premise deployment with full source access under a commercial license agreement.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');

  // Inject Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const plans = PLANS.monthly;

  return (
    <>
      <style>{styles}</style>
      <div className="pricing-root">

        {/* NAV */}
        <nav className="pr-nav">
          <Link to="/home" className="pr-logo">TWOMIAH <span>BUILD</span></Link>
          <ul className="pr-nav-links">
            <li><a href="#features">Features</a></li>
            <li><Link to="/demo">Demo</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/signup" className="pr-nav-cta">Start Free Trial</Link></li>
          </ul>
        </nav>

        {/* HERO */}
        <section className="pr-hero">
          <div className="pr-founding-badge">
            <span className="pr-badge-dot" />
            Founding Member Spots Available — First 10 Customers Lock Price Forever
          </div>
          <h1 className="pr-h1">Software Built<em>For Builders</em></h1>
          <p className="pr-hero-sub">
            All of Procore's power. None of the enterprise price tag. Built for the contractor who actually does the work.
          </p>

          <div className="pr-billing-toggle">
            <button
              className={`pr-toggle-btn${billing === 'monthly' ? ' active' : ''}`}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              className={`pr-toggle-btn${billing === 'annual' ? ' active' : ''}`}
              onClick={() => setBilling('annual')}
            >
              Annual <span className="pr-save-badge">1 MONTH FREE</span>
            </button>
          </div>
        </section>

        {/* PLANS */}
        <div className="pr-section">
          <div className="pr-plans-grid">
            {plans.map((plan, i) => {
              const annualOverride = PLANS.annual[i];
              const displayPrice = billing === 'annual' ? annualOverride.price : plan.price;
              const displaySuffix = billing === 'annual' ? (annualOverride.priceSuffix || '') : (plan.priceSuffix || '');
              const displayPeriod = billing === 'annual' ? annualOverride.period : plan.period;

              return (
                <div key={plan.name} className={`pr-plan${plan.featured ? ' featured' : ''}`}>
                  <div className="pr-plan-name" style={plan.gold ? { color: '#f59e0b' } : {}}>
                    {plan.name}
                  </div>

                  <div>
                    <div className="pr-price-amount" style={plan.gold ? { fontSize: 38, paddingTop: 9 } : {}}>
                      <sup>$</sup>{displayPrice.replace('$', '')}
                      {displaySuffix && (
                        <span style={{ fontSize: 18, color: '#6b7280' }}>{displaySuffix}</span>
                      )}
                    </div>
                    <div className="pr-price-period">{displayPeriod}</div>
                  </div>

                  <div className="pr-price-setup">
                    Setup fee: {plan.setup}
                    {plan.setupNote
                      ? <> · <span>{plan.setupNote}</span></>
                      : <> · <span>Free for self-hosters</span></>
                    }
                  </div>
                  <div className="pr-trial-badge">30-Day Free Trial</div>

                  <div className="pr-limits">
                    {plan.limits.map(l => (
                      <div key={l} className="pr-limit-item">
                        <span className="pr-limit-icon"
                          style={plan.gold ? { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' } : {}}
                        >■</span>
                        {l}
                      </div>
                    ))}
                  </div>

                  <div className="pr-divider" />
                  <div className="pr-features-label">{plan.featuresLabel}</div>
                  <ul className="pr-feature-list">
                    {plan.features.map(f => (
                      <li key={f.text} className={f.dim ? 'dim' : ''}>{f.text}</li>
                    ))}
                  </ul>

                  <Link to={plan.ctaTo} className={`pr-cta ${plan.ctaClass}`}>
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* PERPETUAL */}
        <div className="pr-section">
          <div className="pr-section-header">
            <div>
              <h2 className="pr-section-title">Own It.<span> Forever.</span></h2>
            </div>
            <p className="pr-section-sub">
              Buy it once, run it forever. No subscriptions, no renting your tools. That version is yours permanently.
            </p>
          </div>

          <div className="pr-perpetual-grid">
            {PERPETUAL.map(p => (
              <div key={p.name} className={`pr-perp-card${p.custom ? ' enterprise-perp' : ''}`}>
                <div className={`pr-perp-name${p.custom ? ' gold' : ''}`}>{p.name}</div>
                {p.custom
                  ? <div className="pr-perp-price custom">Custom<br />Made</div>
                  : <div className="pr-perp-price"><sup>$</sup>{p.price.replace('$', '')}</div>
                }
                <div className="pr-perp-note">
                  {p.note.split('Own it forever.').length > 1
                    ? <>{p.note.split('Own it forever.')[0]}<strong>Own it forever.</strong>{p.note.split('Own it forever.')[1]}</>
                    : p.note
                  }
                </div>
                <ul className="pr-perp-includes">
                  {p.includes.map(inc => <li key={inc}>{inc}</li>)}
                </ul>
                {p.custom
                  ? <a href="mailto:sales@twomiah.com" className="pr-cta pr-cta-gold">Get a Quote</a>
                  : <Link to="/signup" className="pr-cta pr-cta-outline">Buy Outright</Link>
                }
              </div>
            ))}
          </div>
        </div>

        {/* ALL PLANS INCLUDE */}
        <div className="pr-section">
          <div className="pr-section-header">
            <h2 className="pr-section-title">Every Plan.<span> Every Customer.</span></h2>
            <p className="pr-section-sub">We don't tier our support. Everyone gets the same treatment.</p>
          </div>
          <div className="pr-universal-grid">
            {UNIVERSAL.map(u => (
              <div key={u.title} className="pr-universal-item">
                <div className="pr-universal-icon">{u.icon}</div>
                <div className="pr-universal-title">{u.title}</div>
                <div className="pr-universal-desc">{u.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OVERAGES */}
        <div className="pr-section">
          <div className="pr-section-header">
            <h2 className="pr-section-title">Overage <span>Rates</span></h2>
            <p className="pr-section-sub">Scale beyond your plan without upgrading. Pay only for what you use.</p>
          </div>
          <div className="pr-overages-grid">
            <div className="pr-overage-item">
              <div>
                <div className="pr-overage-label">Extra Admin User</div>
                <div className="pr-overage-sub">Beyond your plan's included seats</div>
              </div>
              <div className="pr-overage-price">$25 / user / mo</div>
            </div>
            <div className="pr-overage-item">
              <div>
                <div className="pr-overage-label">Extra Active Project</div>
                <div className="pr-overage-sub">Beyond your plan's project limit</div>
              </div>
              <div className="pr-overage-price">$10 / project / mo</div>
            </div>
            <div className="pr-overage-item">
              <div>
                <div className="pr-overage-label">Extra Storage</div>
                <div className="pr-overage-sub">Beyond included GB limit</div>
              </div>
              <div className="pr-overage-price">$10 / 10 GB / mo</div>
            </div>
          </div>
        </div>

        {/* FOUNDING MEMBER */}
        <div className="pr-section">
          <div className="pr-founding-card">
            <div>
              <h2>Founding Member <span>Status</span></h2>
              <p>
                The first 10 contractors to sign up lock their price permanently — forever, as long as you stay subscribed.
                This isn't a promotional discount. It's a thank you for betting on us early. Your price will never increase, ever.
              </p>
            </div>
            <div>
              <div className="pr-spots-count">10</div>
              <div className="pr-spots-bar"><div className="pr-spots-fill" /></div>
              <div className="pr-spots-label">Spots Remaining</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="pr-section">
          <div className="pr-section-header">
            <h2 className="pr-section-title">Common <span>Questions</span></h2>
          </div>
          <div className="pr-faq-grid">
            {FAQS.map(f => (
              <div key={f.q} className="pr-faq-item">
                <div className="pr-faq-q">{f.q}</div>
                <div className="pr-faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pr-footer">
          <p>© 2025 Twomiah Build · A Twomiah Company · Eau Claire, WI</p>
          <p>Questions? <a href="mailto:sales@twomiah.com">sales@twomiah.com</a></p>
        </footer>

      </div>
    </>
  );
}
