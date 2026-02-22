/**
 * Meta Marketing Service (Facebook + Instagram)
 *
 * All platform API calls go through MetaAdsAdapter at the bottom.
 * Swap the stub for real facebook-nodejs-business-sdk calls on approval.
 *
 * Approval: https://developers.facebook.com/docs/marketing-api/access
 *
 * Campaign types:
 *   lead_form     — Facebook Lead Ads (name/email captured in-app)
 *   visualizer    — Traffic to AI Visualizer page (our differentiator)
 *   retargeting   — Re-engage website visitors
 *   lookalike     — Find new homeowners like existing clients
 */

import { prisma } from '../../config/prisma.js';

// ─── Audience templates by vertical ──────────────────────────────────────────
const AUDIENCE_TEMPLATES = {
  roofing: {
    interests: ['Home improvement', 'Roofing', 'Home renovation', 'Real estate'],
    behaviors: ['Homeowners', 'Recently moved'],
    ageRange: { min: 30, max: 65 },
  },
  siding: {
    interests: ['Home improvement', 'Exterior design', 'Home renovation'],
    behaviors: ['Homeowners', 'Recently moved'],
    ageRange: { min: 30, max: 65 },
  },
  windows: {
    interests: ['Home improvement', 'Energy efficiency', 'Home renovation', 'Interior design'],
    behaviors: ['Homeowners', 'Recently moved'],
    ageRange: { min: 28, max: 65 },
  },
  painting: {
    interests: ['Home improvement', 'Interior design', 'DIY', 'Home renovation'],
    behaviors: ['Homeowners'],
    ageRange: { min: 25, max: 60 },
  },
  general_contractor: {
    interests: ['Home improvement', 'Home renovation', 'Real estate', 'Construction'],
    behaviors: ['Homeowners', 'Recently moved', 'Home improvement store visitors'],
    ageRange: { min: 28, max: 65 },
  },
};

// ─── Main service functions ───────────────────────────────────────────────────

/**
 * Get or create Meta AdAccount record.
 */
export async function getOrCreateAccount(companyId) {
  const existing = await prisma.adAccount.findUnique({
    where: { companyId_platform: { companyId, platform: 'meta' } },
  });
  if (existing) return existing;

  return prisma.adAccount.create({
    data: {
      companyId,
      platform: 'meta',
      managerId: process.env.META_BUSINESS_MANAGER_ID || null,
      status: 'pending',
    },
  });
}

/**
 * Connect Meta account via OAuth.
 * Contractor authorizes Twomiah Build's Business Manager to manage their ad account.
 */
export async function connectAccount(companyId, { accessToken, adAccountId }) {
  const account = await getOrCreateAccount(companyId);

  // Verify account access
  const accountInfo = await MetaAdsAdapter.verifyAdAccount(accessToken, adAccountId);

  return prisma.adAccount.update({
    where: { id: account.id },
    data: {
      accountId: adAccountId,
      accountName: accountInfo.name,
      accessToken,
      status: 'connected',
    },
  });
}

/**
 * Create full Meta campaign suite for a contractor.
 * Called by Factory during onboarding.
 */
export async function createContractorCampaigns(companyId, {
  vertical = 'general_contractor',
  city,
  state,
  dailyBudget = 30,
  enableVisualizer = true,
  websiteUrl,
}) {
  const account = await getOrCreateAccount(companyId);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  const campaigns = [];

  // 1. Lead form campaign — highest ROI for contractors
  const leadCampaign = await createCampaign(companyId, account.id, {
    campaignType: 'lead_form',
    name: `${company.name} — Lead Forms`,
    dailyBudget: Math.round(dailyBudget * 0.5),
    config: {
      vertical,
      city,
      state,
      audience: AUDIENCE_TEMPLATES[vertical] || AUDIENCE_TEMPLATES.general_contractor,
      adCopy: buildLeadFormCopy({ company: company.name, vertical, city }),
      leadFormFields: ['full_name', 'phone_number', 'email', 'zip_code'],
      leadFormQuestion: getLeadQuestion(vertical),
    },
  });
  campaigns.push(leadCampaign);

  // 2. Visualizer traffic campaign
  if (enableVisualizer && websiteUrl) {
    const vizCampaign = await createCampaign(companyId, account.id, {
      campaignType: 'visualizer',
      name: `${company.name} — AI Visualizer`,
      dailyBudget: Math.round(dailyBudget * 0.35),
      config: {
        vertical,
        city,
        state,
        audience: AUDIENCE_TEMPLATES[vertical] || AUDIENCE_TEMPLATES.general_contractor,
        adCopy: buildVisualizerCopy({ company: company.name, vertical, city }),
        destinationUrl: `${websiteUrl}/visualizer`,
        conversionEvent: 'Lead',
      },
    });
    campaigns.push(vizCampaign);
  }

  // 3. Retargeting — website visitors who didn't convert
  if (websiteUrl) {
    const retargetCampaign = await createCampaign(companyId, account.id, {
      campaignType: 'retargeting',
      name: `${company.name} — Retargeting`,
      dailyBudget: Math.round(dailyBudget * 0.15),
      config: {
        vertical,
        city,
        state,
        customAudience: 'website_visitors_30d',
        adCopy: buildRetargetingCopy({ company: company.name, vertical }),
        exclusions: ['existing_customers'],
      },
    });
    campaigns.push(retargetCampaign);
  }

  return campaigns;
}

/**
 * Create a single Meta campaign.
 */
export async function createCampaign(companyId, adAccountId, {
  campaignType,
  name,
  dailyBudget,
  config = {},
  cplAlertThreshold,
}) {
  const campaign = await prisma.adCampaign.create({
    data: {
      companyId,
      adAccountId,
      platform: 'meta',
      campaignType,
      name,
      dailyBudget,
      monthlyBudget: dailyBudget * 30.4,
      cplAlertThreshold: cplAlertThreshold || dailyBudget * 4,
      config,
      status: 'draft',
    },
  });

  try {
    const account = await prisma.adAccount.findUnique({ where: { id: adAccountId } });
    if (account.status === 'connected') {
      const platformId = await MetaAdsAdapter.createCampaign(account, campaign);
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: { platformCampaignId: platformId, status: 'active' },
      });
    }
  } catch (err) {
    console.error('[MetaAds] Platform campaign creation failed:', err.message);
  }

  return campaign;
}

/**
 * Pause a Meta campaign.
 */
export async function pauseCampaign(campaignId, companyId) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, companyId, platform: 'meta' },
    include: { adAccount: true },
  });
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.platformCampaignId && campaign.adAccount.status === 'connected') {
    await MetaAdsAdapter.pauseCampaign(campaign.adAccount, campaign.platformCampaignId);
  }

  return prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
}

/**
 * Resume a Meta campaign.
 */
export async function resumeCampaign(campaignId, companyId) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, companyId, platform: 'meta' },
    include: { adAccount: true },
  });
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.platformCampaignId && campaign.adAccount.status === 'connected') {
    await MetaAdsAdapter.enableCampaign(campaign.adAccount, campaign.platformCampaignId);
  }

  return prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'active' } });
}

/**
 * Sync performance from Meta Ads.
 */
export async function syncPerformance(companyId) {
  const account = await prisma.adAccount.findUnique({
    where: { companyId_platform: { companyId, platform: 'meta' } },
    include: { campaigns: { where: { status: 'active' } } },
  });

  if (!account || account.status !== 'connected') return null;

  for (const campaign of account.campaigns) {
    try {
      const metrics = await MetaAdsAdapter.getCampaignInsights(account, campaign.platformCampaignId);
      const costPerLead = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;

      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          totalSpend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          leads: metrics.leads,
          costPerLead,
          ctr: metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0,
        },
      });
    } catch (err) {
      console.error(`[MetaAds] Metrics sync failed for ${campaign.id}:`, err.message);
    }
  }
}

/**
 * Get all Meta campaigns for a company.
 */
export async function getCampaigns(companyId) {
  return prisma.adCampaign.findMany({
    where: { companyId, platform: 'meta' },
    include: { adAccount: { select: { status: true, accountName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Ad copy helpers ──────────────────────────────────────────────────────────
function buildLeadFormCopy({ company, vertical, city }) {
  const v = formatVertical(vertical);
  return {
    headline: `Free ${v} Estimate — ${city || 'Local'}`,
    body: `${company} is offering free estimates for homeowners in ${city || 'your area'}. Licensed, insured, and locally trusted.`,
    cta: 'Get Free Quote',
    imageHook: `Get a free ${v.toLowerCase()} estimate from ${company}`,
  };
}

function buildVisualizerCopy({ company, vertical, city }) {
  const v = formatVertical(vertical);
  return {
    headline: `See Your Home With New ${v}`,
    body: `Upload a photo of your home and instantly see how new ${v.toLowerCase()} would look. Free AI preview — no obligation.`,
    cta: 'Try Free Visualizer',
    imageHook: 'Before & After — See the transformation',
  };
}

function buildRetargetingCopy({ company, vertical }) {
  const v = formatVertical(vertical);
  return {
    headline: `Still Thinking About New ${v}?`,
    body: `${company} is ready to help. Get your free estimate today — it only takes 2 minutes.`,
    cta: 'Get My Free Estimate',
  };
}

function getLeadQuestion(vertical) {
  const questions = {
    roofing:    'What type of roofing project are you planning?',
    siding:     'What type of siding project are you planning?',
    windows:    'How many windows are you looking to replace?',
    gutters:    'What type of gutter project do you need?',
    painting:   'Interior, exterior, or both?',
    default:    'What type of project are you planning?',
  };
  return questions[vertical] || questions.default;
}

function formatVertical(v) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Platform Adapter (STUB — swap for real API on approval) ─────────────────
/**
 * MetaAdsAdapter
 *
 * All methods are stubbed. When Meta Marketing API access is approved:
 *   npm install facebook-nodejs-business-sdk
 *   Replace each method body with real API calls using bizSdk.
 *   Nothing else in this file changes.
 *
 * Approval: https://developers.facebook.com/docs/marketing-api/access
 */
const MetaAdsAdapter = {
  async verifyAdAccount(accessToken, adAccountId) {
    console.log('[MetaAds] STUB: verifyAdAccount', adAccountId);
    return { id: adAccountId, name: `Ad Account ${adAccountId}` };
  },

  async createCampaign(account, campaign) {
    console.log('[MetaAds] STUB: createCampaign', campaign.name);
    // Real implementation:
    // const api = FacebookAdsApi.init(account.accessToken)
    // const adAccount = new AdAccount(`act_${account.accountId}`)
    // const campaign = await adAccount.createCampaign([], { name, objective, status, special_ad_categories })
    // const adSet = await campaign.createAdSet([], { ... targeting, budget, optimization_goal })
    // const creative = await adAccount.createAdCreative([], { ... copy })
    // const ad = await adAccount.createAd([], { ... })
    // return campaign.id
    return `STUB_META_${campaign.id}`;
  },

  async pauseCampaign(account, platformCampaignId) {
    console.log('[MetaAds] STUB: pauseCampaign', platformCampaignId);
  },

  async enableCampaign(account, platformCampaignId) {
    console.log('[MetaAds] STUB: enableCampaign', platformCampaignId);
  },

  async getCampaignInsights(account, platformCampaignId) {
    console.log('[MetaAds] STUB: getCampaignInsights', platformCampaignId);
    // Real implementation:
    // const campaign = new Campaign(platformCampaignId)
    // const insights = await campaign.getInsights(['spend', 'impressions', 'clicks', 'leads'], { date_preset: 'last_30d' })
    return { spend: 0, impressions: 0, clicks: 0, leads: 0 };
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
