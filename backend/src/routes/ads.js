/**
 * Ads API Routes
 *
 * /api/v1/ads
 *   GET    /campaigns              — all campaigns (both platforms)
 *   GET    /performance            — company's full performance view
 *   POST   /campaigns/google       — create Google campaign manually
 *   POST   /campaigns/meta         — create Meta campaign manually
 *   POST   /campaigns/:id/pause    — pause a campaign
 *   POST   /campaigns/:id/resume   — resume a campaign
 *   GET    /accounts               — ad account connection status
 *   POST   /accounts/google/connect — connect Google Ads account
 *   POST   /accounts/meta/connect  — connect Meta Ads account
 *   GET    /reports                — list monthly reports
 *   POST   /reports/generate       — manually generate a report
 *   GET    /admin/dashboard        — all clients (agency owner only)
 *   POST   /factory/create         — onboard a new marketing tenant
 *   DELETE /factory/:companyId     — remove a marketing tenant
 *   POST   /sync                   — manually trigger metrics sync
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import googleAds from '../services/ads/google.js';
import metaAds from '../services/ads/meta.js';
import reporting from '../services/ads/reporting.js';
import marketingFactory from '../services/ads/factory.js';
import { prisma } from '../config/prisma.js';

const router = Router();
router.use(authenticate);

// ─── Campaigns ────────────────────────────────────────────────────────────────

/** GET /api/v1/ads/campaigns — all campaigns for this company */
router.get('/campaigns', async (req, res, next) => {
  try {
    const [google, meta] = await Promise.all([
      googleAds.getCampaigns(req.user.companyId),
      metaAds.getCampaigns(req.user.companyId),
    ]);
    res.json({ google, meta, total: google.length + meta.length });
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/campaigns/google — create Google campaign */
router.post('/campaigns/google', requirePermission('marketing:create'), async (req, res, next) => {
  try {
    const account = await googleAds.getOrCreateAccount(req.user.companyId);
    const campaign = await googleAds.createCampaign(req.user.companyId, account.id, req.body);
    res.status(201).json(campaign);
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/campaigns/meta — create Meta campaign */
router.post('/campaigns/meta', requirePermission('marketing:create'), async (req, res, next) => {
  try {
    const account = await metaAds.getOrCreateAccount(req.user.companyId);
    const campaign = await metaAds.createCampaign(req.user.companyId, account.id, req.body);
    res.status(201).json(campaign);
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/campaigns/:id/pause */
router.post('/campaigns/:id/pause', requirePermission('marketing:update'), async (req, res, next) => {
  try {
    const campaign = await prisma.adCampaign.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const updated = campaign.platform === 'google'
      ? await googleAds.pauseCampaign(campaign.id, req.user.companyId)
      : await metaAds.pauseCampaign(campaign.id, req.user.companyId);

    res.json(updated);
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/campaigns/:id/resume */
router.post('/campaigns/:id/resume', requirePermission('marketing:update'), async (req, res, next) => {
  try {
    const campaign = await prisma.adCampaign.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const updated = campaign.platform === 'google'
      ? await googleAds.resumeCampaign(campaign.id, req.user.companyId)
      : await metaAds.resumeCampaign(campaign.id, req.user.companyId);

    res.json(updated);
  } catch (error) { next(error); }
});

// ─── Performance ──────────────────────────────────────────────────────────────

/** GET /api/v1/ads/performance */
router.get('/performance', async (req, res, next) => {
  try {
    const data = await reporting.getCompanyAdPerformance(req.user.companyId);
    res.json(data);
  } catch (error) { next(error); }
});

// ─── Accounts ────────────────────────────────────────────────────────────────

/** GET /api/v1/ads/accounts */
router.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await prisma.adAccount.findMany({
      where: { companyId: req.user.companyId },
      select: { id: true, platform: true, status: true, accountName: true, accountId: true, createdAt: true },
    });
    res.json(accounts);
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/accounts/google/connect */
router.post('/accounts/google/connect', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { authCode, refreshToken } = req.body;
    const account = await googleAds.connectAccount(req.user.companyId, { authCode, refreshToken });
    res.json(account);
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/accounts/meta/connect */
router.post('/accounts/meta/connect', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { accessToken, adAccountId } = req.body;
    const account = await metaAds.connectAccount(req.user.companyId, { accessToken, adAccountId });
    res.json(account);
  } catch (error) { next(error); }
});

// ─── Reports ─────────────────────────────────────────────────────────────────

/** GET /api/v1/ads/reports */
router.get('/reports', async (req, res, next) => {
  try {
    const reports = await prisma.adReport.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { periodStart: 'desc' },
      take: 24,
    });
    res.json(reports);
  } catch (error) { next(error); }
});

/** POST /api/v1/ads/reports/generate — manual report trigger */
router.post('/reports/generate', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = req.body;
    const start = periodStart ? new Date(periodStart) : (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1, 1); d.setHours(0,0,0,0); return d;
    })();
    const end = periodEnd ? new Date(periodEnd) : (() => {
      const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
    })();

    const result = await reporting.generateMonthlyReport(req.user.companyId, start, end);
    res.json(result);
  } catch (error) { next(error); }
});

// ─── Admin (agency dashboard) ─────────────────────────────────────────────────

/** GET /api/v1/ads/admin/dashboard — all clients overview */
router.get('/admin/dashboard', requireRole('owner'), async (req, res, next) => {
  try {
    const data = await reporting.getAdminDashboard();
    res.json(data);
  } catch (error) { next(error); }
});

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ads/factory/create
 *
 * Onboard a new contractor's marketing stack. Owner-only (Twomiah Build admin).
 * Body: { companyId, vertical, city, state, googleBudget, metaBudget, tier, ... }
 */
router.post('/factory/create', requireRole('owner'), async (req, res, next) => {
  try {
    const { companyId, ...config } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId required' });

    const result = await marketingFactory.createMarketingTenant(companyId, config);
    res.status(201).json(result);
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/ads/factory/status/:companyId
 */
router.get('/factory/status/:companyId', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const status = await marketingFactory.getMarketingTenantStatus(req.params.companyId);
    res.json(status);
  } catch (error) { next(error); }
});

/**
 * DELETE /api/v1/ads/factory/:companyId — cancel/remove marketing for a client
 */
router.delete('/factory/:companyId', requireRole('owner'), async (req, res, next) => {
  try {
    await marketingFactory.removeMarketingTenant(req.params.companyId);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// ─── Sync (cron + manual) ─────────────────────────────────────────────────────

/**
 * POST /api/v1/ads/sync — manually trigger metrics sync
 * Also callable by cron with CRON_SECRET header
 */
router.post('/sync', async (req, res, next) => {
  try {
    // Allow cron with secret, or authenticated owner
    const cronSecret = req.headers['x-cron-secret'];
    const isCron = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
    if (!isCron && req.user?.role !== 'owner' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const companyId = req.body.companyId || req.user?.companyId;

    const [google, meta] = await Promise.all([
      googleAds.syncPerformance(companyId),
      metaAds.syncPerformance(companyId),
    ]);

    res.json({ google, meta });
  } catch (error) { next(error); }
});

/**
 * POST /api/v1/ads/process-monthly-reports — cron endpoint
 */
router.post('/process-monthly-reports', async (req, res, next) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const results = await reporting.processMonthlyReports();
    res.json({ processed: results.length, results });
  } catch (error) { next(error); }
});

export default router;
