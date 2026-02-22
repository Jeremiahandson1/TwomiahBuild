/**
 * Google Ads Service
 *
 * Full campaign management logic. All platform API calls go through
 * the GoogleAdsAdapter at the bottom of this file. When the API
 * access application is approved, replace the stub adapter with
 * real google-ads-api calls — nothing else in this file changes.
 *
 * Supports:
 *   - Search campaigns (keyword-based)
 *   - Local Service Ads (pay-per-lead, highest priority for contractors)
 *   - Performance Max
 *   - Call-only ads
 *
 * Contractor verticals with keyword templates:
 *   roofing | siding | windows | gutters | painting | flooring |
 *   hvac | plumbing | electrical | general_contractor | remodeling
 */

import { prisma } from '../../config/prisma.js';

// ─── Keyword templates by vertical ────────────────────────────────────────────
const KEYWORD_TEMPLATES = {
  roofing: {
    exact: ['roof replacement', 'roofing contractor', 'new roof cost', 'roof repair near me'],
    phrase: ['roofing company', 'roof installation', 'shingle replacement', 'roof leak repair'],
    broad:  ['roofing services', 'local roofer', 'best roofing contractor'],
  },
  siding: {
    exact: ['siding replacement', 'siding contractor', 'vinyl siding installation', 'siding repair'],
    phrase: ['siding company', 'house siding', 'siding cost', 'siding near me'],
    broad:  ['exterior siding', 'siding services', 'home siding'],
  },
  windows: {
    exact: ['window replacement', 'new windows cost', 'window installation near me', 'replacement windows'],
    phrase: ['window company', 'energy efficient windows', 'window contractor'],
    broad:  ['window services', 'home windows', 'window upgrade'],
  },
  gutters: {
    exact: ['gutter installation', 'gutter replacement', 'gutter cleaning near me', 'seamless gutters'],
    phrase: ['gutter company', 'gutter guard installation', 'new gutters cost'],
    broad:  ['gutter services', 'rain gutters', 'gutter contractor'],
  },
  painting: {
    exact: ['exterior painting', 'house painter near me', 'interior painting contractor', 'painting company'],
    phrase: ['residential painter', 'home painting cost', 'painting services near me'],
    broad:  ['house painting', 'professional painter', 'paint contractor'],
  },
  hvac: {
    exact: ['hvac contractor', 'ac installation', 'furnace replacement', 'hvac repair near me'],
    phrase: ['heating cooling company', 'air conditioning installation', 'hvac services'],
    broad:  ['hvac company', 'heating cooling contractor', 'ac repair'],
  },
  plumbing: {
    exact: ['plumber near me', 'plumbing contractor', 'water heater replacement', 'drain cleaning'],
    phrase: ['plumbing company', 'emergency plumber', 'plumbing services near me'],
    broad:  ['local plumber', 'plumbing repair', 'plumbing installation'],
  },
  general_contractor: {
    exact: ['general contractor near me', 'home renovation contractor', 'remodeling contractor'],
    phrase: ['home improvement company', 'construction contractor', 'renovation services'],
    broad:  ['general contractor', 'home remodeling', 'construction company'],
  },
  remodeling: {
    exact: ['kitchen remodel cost', 'bathroom remodel contractor', 'basement remodel near me'],
    phrase: ['home remodeling company', 'kitchen renovation', 'bathroom renovation cost'],
    broad:  ['remodeling services', 'home renovation', 'remodel contractor'],
  },
};

// ─── Ad copy templates by vertical ───────────────────────────────────────────
const AD_COPY_TEMPLATES = {
  default: {
    headlines: [
      '{{COMPANY_NAME}} — Free Estimates',
      'Licensed & Insured Contractor',
      'Local {{VERTICAL}} Experts',
      'See Your Home Transformed — AI Preview',
      'Top-Rated {{VERTICAL}} in {{CITY}}',
      'Fast, Reliable, Affordable',
      'Call for a Free Quote Today',
    ],
    descriptions: [
      'Professional {{VERTICAL}} services in {{CITY}}. Licensed, insured, and local. Get a free estimate today.',
      'See exactly how your home will look before we start. Try our free AI home visualizer.',
      '{{COMPANY_NAME}} has served {{CITY}} homeowners for years. Trusted local contractor.',
    ],
    callToAction: 'Get Free Estimate',
  },
  visualizer: {
    headlines: [
      'See Your Home Transformed',
      'AI Home Visualizer — Free',
      'Preview New {{VERTICAL}} Now',
      'Upload Your Photo, See Results',
      'No Obligation Preview',
      '{{COMPANY_NAME}} — {{CITY}}',
      'Instant Before & After View',
    ],
    descriptions: [
      'Upload a photo of your home and see exactly how new {{VERTICAL}} will look. Free AI preview tool.',
      'Stop guessing — see your home transformed with our free visualizer. Then get a real quote.',
    ],
    callToAction: 'Try Free Visualizer',
  },
};

// ─── Main service functions ───────────────────────────────────────────────────

/**
 * Get or create an AdAccount record for a company.
 * Called during Factory onboarding — creates the DB record.
 * Actual platform account connection happens separately.
 */
export async function getOrCreateAccount(companyId) {
  const existing = await prisma.adAccount.findUnique({
    where: { companyId_platform: { companyId, platform: 'google' } },
  });
  if (existing) return existing;

  return prisma.adAccount.create({
    data: {
      companyId,
      platform: 'google',
      managerId: process.env.GOOGLE_ADS_MCC_ID || null,
      status: 'pending',
    },
  });
}

/**
 * Connect a real Google Ads account.
 * Called after contractor completes OAuth or provides credentials.
 * Stores tokens, creates customer account under Twomiah Build MCC.
 */
export async function connectAccount(companyId, { authCode, refreshToken }) {
  const account = await getOrCreateAccount(companyId);

  // Exchange auth code for tokens via adapter
  const tokens = await GoogleAdsAdapter.exchangeAuthCode(authCode);

  // Create customer account under MCC
  const customer = await GoogleAdsAdapter.createCustomerAccount(companyId, {
    refreshToken: tokens.refreshToken || refreshToken,
  });

  return prisma.adAccount.update({
    where: { id: account.id },
    data: {
      accountId: customer.id,
      accountName: customer.name,
      customerId: customer.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || refreshToken,
      tokenExpiry: tokens.expiry ? new Date(tokens.expiry) : null,
      status: 'connected',
    },
  });
}

/**
 * Create full campaign suite for a contractor.
 * This is what Factory calls during onboarding.
 *
 * Creates:
 *  1. Search campaign with vertical keywords
 *  2. Local Service Ads campaign (pay-per-lead)
 *  3. Visualizer landing page campaign (if visualizer is enabled)
 */
export async function createContractorCampaigns(companyId, {
  vertical = 'general_contractor',
  city,
  state,
  dailyBudget = 50,
  enableVisualizer = true,
}) {
  const account = await getOrCreateAccount(companyId);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  const campaigns = [];

  // 1. Search campaign
  const searchCampaign = await createCampaign(companyId, account.id, {
    campaignType: 'search',
    name: `${company.name} — Search — ${vertical}`,
    dailyBudget,
    config: {
      vertical,
      city,
      state,
      keywords: KEYWORD_TEMPLATES[vertical] || KEYWORD_TEMPLATES.general_contractor,
      adCopy: buildAdCopy('default', { company: company.name, vertical, city }),
      targetingRadius: 30, // miles
      deviceBidAdjustments: { mobile: 1.2, desktop: 1.0, tablet: 0.9 },
    },
  });
  campaigns.push(searchCampaign);

  // 2. Local Service Ads
  const lsaCampaign = await createCampaign(companyId, account.id, {
    campaignType: 'lsa',
    name: `${company.name} — Local Service Ads`,
    dailyBudget: Math.round(dailyBudget * 0.5),
    config: {
      vertical,
      city,
      state,
      serviceTypes: getServiceTypes(vertical),
    },
  });
  campaigns.push(lsaCampaign);

  // 3. Visualizer campaign (optional)
  if (enableVisualizer) {
    const vizCampaign = await createCampaign(companyId, account.id, {
      campaignType: 'performance_max',
      name: `${company.name} — Visualizer`,
      dailyBudget: Math.round(dailyBudget * 0.3),
      config: {
        vertical,
        city,
        state,
        landingPage: 'visualizer',
        adCopy: buildAdCopy('visualizer', { company: company.name, vertical, city }),
        conversionGoal: 'visualizer_lead',
      },
    });
    campaigns.push(vizCampaign);
  }

  return campaigns;
}

/**
 * Create a single campaign (DB record + platform call).
 */
export async function createCampaign(companyId, adAccountId, {
  campaignType,
  name,
  dailyBudget,
  config = {},
  cplAlertThreshold,
}) {
  // Create DB record first
  const campaign = await prisma.adCampaign.create({
    data: {
      companyId,
      adAccountId,
      platform: 'google',
      campaignType,
      name,
      dailyBudget,
      monthlyBudget: dailyBudget * 30.4,
      cplAlertThreshold: cplAlertThreshold || dailyBudget * 3,
      config,
      status: 'draft',
    },
  });

  // Create on platform (stubbed until API approval)
  try {
    const account = await prisma.adAccount.findUnique({ where: { id: adAccountId } });
    if (account.status === 'connected') {
      const platformId = await GoogleAdsAdapter.createCampaign(account, campaign);
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: { platformCampaignId: platformId, status: 'active' },
      });
    }
  } catch (err) {
    console.error('[GoogleAds] Platform campaign creation failed:', err.message);
    // Campaign stays in draft — will be activated when account connects
  }

  return campaign;
}

/**
 * Pause a campaign on the platform.
 */
export async function pauseCampaign(campaignId, companyId) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, companyId, platform: 'google' },
    include: { adAccount: true },
  });
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.platformCampaignId && campaign.adAccount.status === 'connected') {
    await GoogleAdsAdapter.pauseCampaign(campaign.adAccount, campaign.platformCampaignId);
  }

  return prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: 'paused' },
  });
}

/**
 * Resume a paused campaign.
 */
export async function resumeCampaign(campaignId, companyId) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, companyId, platform: 'google' },
    include: { adAccount: true },
  });
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.platformCampaignId && campaign.adAccount.status === 'connected') {
    await GoogleAdsAdapter.enableCampaign(campaign.adAccount, campaign.platformCampaignId);
  }

  return prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: 'active' },
  });
}

/**
 * Sync performance metrics from Google Ads.
 * Called by cron daily. Updates DB records with latest numbers.
 */
export async function syncPerformance(companyId) {
  const account = await prisma.adAccount.findUnique({
    where: { companyId_platform: { companyId, platform: 'google' } },
    include: { campaigns: { where: { status: 'active' } } },
  });

  if (!account || account.status !== 'connected') return null;

  const updates = [];
  for (const campaign of account.campaigns) {
    try {
      const metrics = await GoogleAdsAdapter.getCampaignMetrics(account, campaign.platformCampaignId);
      const costPerLead = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;

      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          totalSpend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          leads: metrics.leads,
          costPerLead,
          ctr: metrics.clicks > 0 ? metrics.clicks / metrics.impressions : 0,
        },
      });

      // Check CPL alert threshold
      if (campaign.cplAlertThreshold && costPerLead > campaign.cplAlertThreshold) {
        await fireCPLAlert(campaign, costPerLead);
      }

      updates.push({ campaignId: campaign.id, metrics });
    } catch (err) {
      console.error(`[GoogleAds] Metrics sync failed for ${campaign.id}:`, err.message);
    }
  }

  return updates;
}

/**
 * Get all campaigns for a company with current metrics.
 */
export async function getCampaigns(companyId) {
  return prisma.adCampaign.findMany({
    where: { companyId, platform: 'google' },
    include: { adAccount: { select: { status: true, accountName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAdCopy(type, { company, vertical, city }) {
  const template = AD_COPY_TEMPLATES[type] || AD_COPY_TEMPLATES.default;
  const replace = (s) => s
    .replace(/\{\{COMPANY_NAME\}\}/g, company)
    .replace(/\{\{VERTICAL\}\}/g, formatVertical(vertical))
    .replace(/\{\{CITY\}\}/g, city || 'Your Area');

  return {
    headlines:    template.headlines.map(replace),
    descriptions: template.descriptions.map(replace),
    callToAction: template.callToAction,
  };
}

function formatVertical(v) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getServiceTypes(vertical) {
  const map = {
    roofing:    ['Roof Installation', 'Roof Repair', 'Roof Inspection'],
    siding:     ['Siding Installation', 'Siding Repair', 'Siding Replacement'],
    windows:    ['Window Installation', 'Window Replacement', 'Window Repair'],
    gutters:    ['Gutter Installation', 'Gutter Cleaning', 'Gutter Repair'],
    painting:   ['Exterior Painting', 'Interior Painting', 'Deck Staining'],
    hvac:       ['AC Installation', 'Furnace Installation', 'HVAC Repair'],
    plumbing:   ['Pipe Repair', 'Water Heater Installation', 'Drain Cleaning'],
    general_contractor: ['Home Renovation', 'Remodeling', 'Construction'],
  };
  return map[vertical] || map.general_contractor;
}

async function fireCPLAlert(campaign, currentCPL) {
  const now = new Date();
  // Don't alert more than once per 24 hours
  if (campaign.lastAlertSentAt) {
    const hoursSince = (now - new Date(campaign.lastAlertSentAt)) / 1000 / 60 / 60;
    if (hoursSince < 24) return;
  }

  await prisma.adCampaign.update({
    where: { id: campaign.id },
    data: { lastAlertSentAt: now },
  });

  // Alert will be picked up by reporting service and emailed
  console.warn(`[GoogleAds] CPL alert: ${campaign.name} — $${currentCPL.toFixed(2)} exceeds threshold $${campaign.cplAlertThreshold}`);
}

// ─── Platform Adapter (STUB — swap for real API on approval) ─────────────────
/**
 * GoogleAdsAdapter
 *
 * All methods are stubbed. When Google Ads API access is approved:
 *   npm install google-ads-api
 *   Replace each method body with real API calls.
 *   Nothing else in this file changes.
 *
 * Approval: https://developers.google.com/google-ads/api/docs/access-levels
 */
const GoogleAdsAdapter = {
  async exchangeAuthCode(code) {
    console.log('[GoogleAds] STUB: exchangeAuthCode', code ? '***' : 'none');
    return { accessToken: 'stub_token', refreshToken: 'stub_refresh', expiry: null };
  },

  async createCustomerAccount(companyId, { refreshToken }) {
    console.log('[GoogleAds] STUB: createCustomerAccount for', companyId);
    return { id: `STUB_${companyId}`, name: `Twomiah Build — ${companyId}` };
  },

  async createCampaign(account, campaign) {
    console.log('[GoogleAds] STUB: createCampaign', campaign.name);
    // Real implementation:
    // const client = new GoogleAdsClient({ customer_id: account.customerId, refresh_token: account.refreshToken, ... })
    // const response = await client.campaigns.create({ name, budget, keywords, adGroups, ... })
    // return response.campaign.id
    return `STUB_CAMPAIGN_${campaign.id}`;
  },

  async pauseCampaign(account, platformCampaignId) {
    console.log('[GoogleAds] STUB: pauseCampaign', platformCampaignId);
  },

  async enableCampaign(account, platformCampaignId) {
    console.log('[GoogleAds] STUB: enableCampaign', platformCampaignId);
  },

  async getCampaignMetrics(account, platformCampaignId) {
    console.log('[GoogleAds] STUB: getCampaignMetrics', platformCampaignId);
    // Real implementation pulls from Google Ads reporting API (GAQL)
    // Returns last 30 days of spend, impressions, clicks, conversions
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
    };
  },
};

export default {
  getOrCreateAccount,
  connectAccount,
  createContractorCampaigns,
  createCampaign,
  pauseCampaign,
  resumeCampaign,
  syncPerformance,
  getCampaigns,
};
