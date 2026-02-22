/**
 * Factory — Marketing Tenant Service
 *
 * Spins up the full marketing stack for a new contractor in one call.
 * This is the "Factory-First" philosophy from the plan — every contractor
 * onboards the same way.
 *
 * Usage:
 *   await createMarketingTenant('companyId', { client: 'claflin', vertical: 'roofing', ... })
 *
 * What it does:
 *   1. Creates AdAccount records for Google + Meta
 *   2. Builds campaign suite from vertical templates
 *   3. Wires up lead notification settings
 *   4. Configures review request automation
 *   5. Sets up monthly report delivery
 *   6. Returns everything needed to show the contractor their dashboard
 */

import { prisma } from '../../config/prisma.js';
import googleAds from './google.js';
import metaAds from './meta.js';
import leadNotification from '../leadNotification.js';

/**
 * Full marketing stack setup for a new contractor.
 *
 * @param {string} companyId
 * @param {object} config
 *   client         — client slug (e.g. 'claflin')
 *   vertical       — service vertical (roofing|siding|windows|gutters|painting|hvac|plumbing|general_contractor|remodeling)
 *   city           — primary service city
 *   state          — state abbreviation
 *   googleBudget   — daily Google Ads budget (default: $50)
 *   metaBudget     — daily Meta Ads budget (default: $30)
 *   enableVisualizer — create visualizer campaigns (default: true)
 *   websiteUrl     — contractor's website (for retargeting pixel + landing pages)
 *   notifyPhone    — contractor's cell for lead alerts
 *   notifyEmail    — contractor's email for lead alerts + reports
 *   tier           — pricing tier: starter | growth | scale
 */
export async function createMarketingTenant(companyId, config = {}) {
  const {
    client,
    vertical       = 'general_contractor',
    city,
    state,
    googleBudget   = 50,
    metaBudget     = 30,
    enableVisualizer = true,
    websiteUrl,
    notifyPhone,
    notifyEmail,
    tier           = 'starter',
  } = config;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, phone: true, email: true },
  });
  if (!company) throw new Error(`Company not found: ${companyId}`);

  const results = { companyId, client, campaigns: [], errors: [] };

  // ── Step 1: Lead notifications ────────────────────────────────────────────
  await leadNotification.updateLeadNotificationSettings(companyId, {
    enabled:      true,
    smsEnabled:   true,
    emailEnabled: true,
    notifyPhone:  notifyPhone || company.phone || '',
    notifyEmail:  notifyEmail || company.email || '',
  });
  results.leadNotifications = true;

  // ── Step 2: Review request automation ────────────────────────────────────
  await prisma.company.update({
    where: { id: companyId },
    data: {
      settings: await getUpdatedSettings(companyId, {
        reviewRequestEnabled: true,
        reviewSmsEnabled:     true,
        reviewEmailEnabled:   true,
        reviewRequestDelay:   72, // 3 days in hours
        reviewFollowUpDelay:  3,  // 3 days
        reportEmail:          notifyEmail || company.email || '',
        alertEmail:           notifyEmail || company.email || '',
      }),
    },
  });
  results.reviewAutomation = true;

  // ── Step 3: Google Ads campaigns ──────────────────────────────────────────
  try {
    const googleCampaigns = await googleAds.createContractorCampaigns(companyId, {
      vertical,
      city,
      state,
      dailyBudget: googleBudget,
      enableVisualizer,
    });
    results.campaigns.push(...googleCampaigns.map(c => ({ ...c, platform: 'google' })));
    results.googleAds = { success: true, count: googleCampaigns.length };
  } catch (err) {
    results.errors.push({ service: 'google_ads', error: err.message });
    results.googleAds = { success: false, error: err.message };
  }

  // ── Step 4: Meta Ads campaigns ────────────────────────────────────────────
  const metaTiers = ['growth', 'scale'];
  if (metaTiers.includes(tier)) {
    try {
      const metaCampaigns = await metaAds.createContractorCampaigns(companyId, {
        vertical,
        city,
        state,
        dailyBudget: metaBudget,
        enableVisualizer,
        websiteUrl,
      });
      results.campaigns.push(...metaCampaigns.map(c => ({ ...c, platform: 'meta' })));
      results.metaAds = { success: true, count: metaCampaigns.length };
    } catch (err) {
      results.errors.push({ service: 'meta_ads', error: err.message });
      results.metaAds = { success: false, error: err.message };
    }
  } else {
    results.metaAds = { skipped: true, reason: `Tier '${tier}' — Meta Ads available on Growth and Scale` };
  }

  // ── Step 5: Log the onboarding ────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      companyId,
      action: 'MARKETING_TENANT_CREATED',
      entity: 'company',
      entityId: companyId,
      metadata: {
        client,
        vertical,
        city,
        tier,
        campaignsCreated: results.campaigns.length,
        errors:           results.errors.length,
      },
    },
  }).catch(() => {});

  console.log(`[Factory/Marketing] Tenant created: ${company.name} (${client}) — ${results.campaigns.length} campaigns, ${results.errors.length} errors`);

  return results;
}

/**
 * Tear down all ad campaigns for a company.
 * Called when a contractor's subscription is cancelled.
 */
export async function removeMarketingTenant(companyId) {
  const campaigns = await prisma.adCampaign.findMany({
    where: { companyId },
    include: { adAccount: true },
  });

  for (const campaign of campaigns) {
    if (campaign.platformCampaignId && campaign.adAccount?.status === 'connected') {
      // Pause rather than delete — preserves history
      if (campaign.platform === 'google') {
        await googleAds.pauseCampaign(campaign.id, companyId).catch(() => {});
      } else if (campaign.platform === 'meta') {
        await metaAds.pauseCampaign(campaign.id, companyId).catch(() => {});
      }
    }
  }

  // Update all to ended
  await prisma.adCampaign.updateMany({
    where: { companyId },
    data: { status: 'ended' },
  });

  console.log(`[Factory/Marketing] Tenant removed: ${companyId}`);
}

/**
 * Get marketing tenant status — summary of all campaigns + settings for a contractor.
 */
export async function getMarketingTenantStatus(companyId) {
  const [campaigns, leadSettings] = await Promise.all([
    prisma.adCampaign.findMany({
      where: { companyId },
      include: { adAccount: { select: { platform: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    leadNotification.getLeadNotificationSettings(companyId),
  ]);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { settings: true },
  });

  const stats = campaigns.reduce((acc, c) => ({
    totalSpend:  acc.totalSpend  + Number(c.totalSpend || 0),
    totalLeads:  acc.totalLeads  + (c.leads || 0),
    activeCampaigns: acc.activeCampaigns + (c.status === 'active' ? 1 : 0),
  }), { totalSpend: 0, totalLeads: 0, activeCampaigns: 0 });

  return {
    campaigns,
    stats: {
      ...stats,
      costPerLead: stats.totalLeads > 0 ? stats.totalSpend / stats.totalLeads : 0,
    },
    leadNotifications: leadSettings,
    reviewSettings: {
      enabled: company?.settings?.reviewRequestEnabled !== false,
      delay:   company?.settings?.reviewRequestDelay || 72,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUpdatedSettings(companyId, updates) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { settings: true },
  });
  return { ...(company?.settings || {}), ...updates };
}

export default {
  createMarketingTenant,
  removeMarketingTenant,
  getMarketingTenantStatus,
};
