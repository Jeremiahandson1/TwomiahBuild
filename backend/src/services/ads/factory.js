/**
 * Factory — Marketing Tenant Service
 *
 * Provisions a new marketing tenant in the Twomiah Ads platform
 * via webhook when a client is onboarded through the Factory.
 */

import { prisma } from '../../config/prisma.js';
import leadNotification from '../leadNotification.js';

const TWOMIAH_ADS_URL = process.env.TWOMIAH_ADS_URL || 'https://twomiah-ads.onrender.com';
const FACTORY_WEBHOOK_SECRET = process.env.FACTORY_WEBHOOK_SECRET || 'twomiah_factory_secret_2026';

const INDUSTRY_TO_TEMPLATE = {
  roofing:             'roofing-contractor',
  siding:              'roofing-contractor',
  windows:             'roofing-contractor',
  gutters:             'roofing-contractor',
  painting:            'roofing-contractor',
  hvac:                'roofing-contractor',
  plumbing:            'roofing-contractor',
  general_contractor:  'roofing-contractor',
  remodeling:          'roofing-contractor',
  home_care:           'roofing-contractor',
};

export async function createMarketingTenant(companyId, config = {}) {
  const { client, vertical = 'general_contractor', city, state, websiteUrl, notifyPhone, notifyEmail, tier = 'starter' } = config;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, phone: true, email: true } });
  if (!company) throw new Error(`Company not found: ${companyId}`);

  const results = { companyId, client, campaigns: [], errors: [] };

  // Step 1: Lead notifications
  await leadNotification.updateLeadNotificationSettings(companyId, {
    enabled: true, smsEnabled: true, emailEnabled: true,
    notifyPhone: notifyPhone || company.phone || '',
    notifyEmail: notifyEmail || company.email || '',
  });
  results.leadNotifications = true;

  // Step 2: Review automation
  await prisma.company.update({
    where: { id: companyId },
    data: { settings: await getUpdatedSettings(companyId, {
      reviewRequestEnabled: true, reviewSmsEnabled: true, reviewEmailEnabled: true,
      reviewRequestDelay: 72, reviewFollowUpDelay: 3,
      reportEmail: notifyEmail || company.email || '',
      alertEmail: notifyEmail || company.email || '',
    })},
  });
  results.reviewAutomation = true;

  // Step 3: Provision Twomiah Ads tenant
  try {
    const templateId = INDUSTRY_TO_TEMPLATE[vertical] || 'roofing-contractor';
    const payload = {
      tenantName: company.name,
      industry: vertical,
      subdomain: client,
      factoryInstanceId: companyId,
      templateId,
      clientData: {
        business_name: company.name,
        city, state,
        phone: notifyPhone || company.phone || '',
        website_url: websiteUrl || '',
        email: notifyEmail || company.email || '',
      },
      addons: websiteUrl?.includes('visualize') ? ['visualizer'] : [],
    };

    const response = await fetch(`${TWOMIAH_ADS_URL}/factory/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-factory-signature': FACTORY_WEBHOOK_SECRET },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Twomiah Ads API returned ${response.status}`);

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: await getUpdatedSettings(companyId, {
        twomiahAdsTenantId: data.tenantId,
        twomiahAdsApiKey: data.apiKey,
      })},
    });

    results.twomiahAds = { success: true, tenantId: data.tenantId, campaign: data.campaign };
    console.log(`[Factory/Ads] Provisioned ${company.name}: tenant ${data.tenantId}`);

  } catch (err) {
    results.errors.push({ service: 'twomiah_ads', error: err.message });
    results.twomiahAds = { success: false, error: err.message };
    console.error(`[Factory/Ads] Provisioning failed for ${company.name}:`, err.message);
  }

  // Step 4: Audit log
  await prisma.auditLog.create({
    data: {
      companyId, action: 'MARKETING_TENANT_CREATED', entity: 'company', entityId: companyId,
      metadata: { client, vertical, city, tier, twomiahAds: results.twomiahAds, errors: results.errors.length },
    },
  }).catch(() => {});

  return results;
}

export async function removeMarketingTenant(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { settings: true, name: true } });
  const tenantId = company?.settings?.twomiahAdsTenantId;
  if (!tenantId) return;
  console.log(`[Factory/Ads] Tenant removal for ${company.name} — manual step required in Twomiah Ads (tenantId: ${tenantId})`);
}

export async function getMarketingTenantStatus(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { settings: true } });
  const tenantId = company?.settings?.twomiahAdsTenantId;
  if (!tenantId) return { connected: false };
  try {
    const response = await fetch(`${TWOMIAH_ADS_URL}/api/campaigns?tenantId=${tenantId}`, {
      headers: { 'x-factory-signature': FACTORY_WEBHOOK_SECRET },
    });
    const data = await response.json();
    return { connected: true, tenantId, ...data };
  } catch (err) {
    return { connected: true, tenantId, error: err.message };
  }
}

async function getUpdatedSettings(companyId, updates) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { settings: true } });
  return { ...(company?.settings || {}), ...updates };
}

export default { createMarketingTenant, removeMarketingTenant, getMarketingTenantStatus };
