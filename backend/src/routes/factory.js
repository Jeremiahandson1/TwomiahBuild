/**
 * Twomiah Build Factory — API Routes
 * 
 * POST /api/factory/generate  — Generate a new build from wizard config
 * GET  /api/factory/download/:buildId/:filename — Download generated zip
 * GET  /api/factory/templates  — List available templates
 * GET  /api/factory/features   — Get feature registry for wizard
 * POST /api/factory/cleanup    — Clean old builds
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generate, listTemplates, cleanOldBuilds } from '../services/factory/generator.js';
import factoryStripe from '../services/factory/stripe.js';
import deployService from '../services/factory/deploy.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { createMarketingTenant } from '../services/ads/factory.js';
import logger from '../services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUT_DIR = process.env.TWOMIAH_BUILD_OUTPUT_DIR || path.join(PROJECT_ROOT, 'generated');

// Skip auth for public endpoints
router.use((req, res, next) => {
  if (req.path === '/features' || req.path === '/templates') return next();
  authenticate(req, res, next);
});
router.use((req, res, next) => {
  if (req.path === '/features' || req.path === '/templates') return next();
  requireRole('owner', 'admin')(req, res, next);
});


/**
 * POST /api/factory/generate
 * 
 * Body: {
 *   products: ['website', 'cms', 'crm'],
 *   company: { name, email, phone, address, city, state, zip, domain, ... },
 *   branding: { primaryColor, secondaryColor, logo },
 *   features: {
 *     website: ['blog', 'gallery', 'contact_form', ...],
 *     crm: ['contacts', 'projects', 'invoices', ...]
 *   }
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const config = req.body;

    // Validate
    if (!config.products || !Array.isArray(config.products) || config.products.length === 0) {
      return res.status(400).json({ error: 'At least one product must be selected' });
    }

    const validProducts = ['website', 'cms', 'crm'];
    const invalid = config.products.filter(p => !validProducts.includes(p));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid products: ${invalid.join(', ')}` });
    }

    if (!config.company?.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    logger.info(`[Factory] Generating build for "${config.company.name}" — products: ${config.products.join(', ')}`);
    const startTime = Date.now();

    const result = await generate(config);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[Factory] Build complete in ${elapsed}s — ${result.zipName}`);

    // Track customer and build in database
    let customer = null;
    let build = null;
    try {
      
      const companyId = req.user.companyId;
      const c = config.company || {};
      const slug = result.slug;

      // Create or update customer record
      if (config.customerId) {
        // Updating existing customer
        customer = await prisma.factoryCustomer.update({
          where: { id: config.customerId },
          data: {
            products: config.products,
            features: config.features?.crm || [],
            primaryColor: config.branding?.primaryColor,
            secondaryColor: config.branding?.secondaryColor,
          }
        });
      } else {
        // New customer
        customer = await prisma.factoryCustomer.create({
          data: {
            companyId,
            name: c.name,
            slug,
            email: c.email || c.adminEmail || `info@${slug}.com`,
            phone: c.phone,
            domain: c.domain,
            industry: c.industry,
            products: config.products,
            features: config.features?.crm || [],
            primaryColor: config.branding?.primaryColor,
            secondaryColor: config.branding?.secondaryColor,
            logo: config.branding?.logo ? 'uploaded' : null,
            adminEmail: c.adminEmail || c.email,
            billingType: config.billing?.type || null,
            monthlyAmount: config.billing?.monthlyAmount || null,
            oneTimeAmount: config.billing?.oneTimeAmount || null,
            planId: config.billing?.planId || null,
          }
        });
      }

      // Track the build
      build = await prisma.factoryBuild.create({
        data: {
          companyId,
          customerId: customer.id,
          companyName: c.name,
          slug,
          products: config.products,
          features: config.features?.crm || [],
          config: config,
          buildId: result.buildId,
          zipPath: result.zipPath,
          zipName: result.zipName,
        }
      });
    } catch (dbErr) {
      // Don't fail the build if tracking fails
      logger.error('[Factory] Failed to track build in DB:', dbErr.message);
    }

    res.json({
      success: true,
      buildId: result.buildId,
      zipName: result.zipName,
      slug: result.slug,
      customerId: customer?.id || null,
      downloadUrl: `/api/factory/download/${result.buildId}/${result.zipName}`,
      generatedIn: `${elapsed}s`,
    });

  } catch (err) {
    logger.error('[Factory] Generation failed:', err);
    res.status(500).json({ error: 'Build generation failed', details: err.message });
  }
});


/**
 * GET /api/factory/download/:buildId/:filename
 */
router.get('/download/:buildId/:filename', async (req, res) => {
  const { buildId, filename } = req.params;

  // Sanitize
  if (!/^[a-f0-9-]+$/.test(buildId) || !/^[a-z0-9-]+\.zip$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid download parameters' });
  }

  // Look up build scoped to requesting company — prevents cross-tenant downloads
  
  const build = await prisma.factoryBuild.findFirst({
    where: { buildId: buildId, companyId: req.user.companyId },
  });

  if (!build || !build.zipPath) {
    return res.status(404).json({ error: 'Build not found. It may have expired.' });
  }

  const zipPath = build.zipPath;

  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'Build file not found. It may have expired.' });
  }

  res.download(zipPath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  });
});


/**
 * GET /api/factory/templates
 * Returns available template types
 */
router.get('/templates', (req, res) => {
  const templates = listTemplates();
  res.json({
    templates,
    products: [
      {
        id: 'website',
        name: 'Website',
        description: 'Server-rendered site with EJS templates, SEO optimized',
        icon: 'Globe',
        available: templates.includes('website'),
      },
      {
        id: 'cms',
        name: 'CMS',
        description: 'React admin panel for managing site content',
        icon: 'Layout',
        available: templates.includes('cms'),
        note: 'Bundled with Website when both selected',
      },
      {
        id: 'crm',
        name: 'CRM',
        description: 'Full business management with contacts, jobs, invoices, scheduling',
        icon: 'Briefcase',
        available: templates.includes('crm'),
      },
    ],
  });
});


/**
 * GET /api/factory/features
 * Returns feature categories for the wizard
 */
router.get('/features', (req, res) => {
  // Load from the CRM feature registry
  const registryPath = path.resolve(__dirname, '../config/featureRegistry.js');
  
  // Return the feature categories statically (they're defined in data/features.js on frontend)
  // This endpoint provides the backend's authoritative feature list
  res.json({
    website: [
      {
        category: 'Content',
        features: [
          { id: 'blog', name: 'Blog', description: 'Blog with categories and SEO' },
          { id: 'gallery', name: 'Gallery', description: 'Photo gallery with lightbox' },
          { id: 'testimonials', name: 'Testimonials', description: 'Customer testimonials section' },
          { id: 'services_pages', name: 'Service Pages', description: 'Individual service pages with SEO' },
        ]
      },
      {
        category: 'Lead Generation',
        features: [
          { id: 'contact_form', name: 'Contact Form', description: 'Lead capture with email notifications' },
          { id: 'service_area', name: 'Service Area Pages', description: 'Geo-targeted landing pages' },
          { id: 'financing_widget', name: 'Financing Widget', description: 'Embedded financing calculator' },
        ]
      },
      {
        category: 'SEO & Analytics',
        features: [
          { id: 'sitemap', name: 'XML Sitemap', description: 'Auto-generated sitemap' },
          { id: 'schema_markup', name: 'Schema Markup', description: 'Structured data for search' },
          { id: 'analytics', name: 'Analytics Integration', description: 'GA4, GTM, Facebook Pixel' },
        ]
      },
      {
        category: 'Tools',
        features: [
          { id: 'visualizer', name: 'Home Visualizer', description: 'AI-powered renovation visualizer' },
          { id: 'reviews_widget', name: 'Reviews Widget', description: 'Google reviews integration' },
        ]
      }
    ],
    crm: [
      {
        category: 'Core',
        features: [
          { id: 'contacts', name: 'Contacts', description: 'Client, lead, vendor management', core: true },
          { id: 'jobs', name: 'Jobs', description: 'Job tracking and management', core: true },
          { id: 'quotes', name: 'Quotes', description: 'Professional estimates and quotes', core: true },
          { id: 'invoices', name: 'Invoices', description: 'Invoice generation and tracking', core: true },
          { id: 'scheduling', name: 'Scheduling', description: 'Calendar and job scheduling', core: true },
          { id: 'team', name: 'Team', description: 'Team member management', core: true },
          { id: 'dashboard', name: 'Dashboard', description: 'Overview dashboard', core: true },
        ]
      },
      {
        category: 'Construction',
        features: [
          { id: 'projects', name: 'Projects', description: 'Multi-phase project management' },
          { id: 'rfis', name: 'RFIs', description: 'Request for information tracking' },
          { id: 'change_orders', name: 'Change Orders', description: 'Change order management' },
          { id: 'punch_lists', name: 'Punch Lists', description: 'Punch list tracking' },
          { id: 'daily_logs', name: 'Daily Logs', description: 'Field daily log reports' },
          { id: 'inspections', name: 'Inspections', description: 'Quality inspections' },
          { id: 'bid_management', name: 'Bid Management', description: 'Bid tracking and submission' },
          { id: 'takeoff_tools', name: 'Takeoff Tools', description: 'Material takeoff calculations' },
          { id: 'selections', name: 'Selections', description: 'Client material selections portal' },
        ]
      },
      {
        category: 'Service Trade',
        features: [
          { id: 'drag_drop_calendar', name: 'Drag & Drop Calendar', description: 'Visual job scheduling' },
          { id: 'recurring_jobs', name: 'Recurring Jobs', description: 'Automated recurring job creation' },
          { id: 'route_optimization', name: 'Route Optimization', description: 'Optimize daily service routes' },
          { id: 'online_booking', name: 'Online Booking', description: 'Customer self-scheduling' },
          { id: 'service_dispatch', name: 'Service Dispatch', description: 'Real-time dispatch board' },
          { id: 'service_agreements', name: 'Service Agreements', description: 'Maintenance agreement management' },
          { id: 'warranties', name: 'Warranties', description: 'Warranty tracking' },
          { id: 'pricebook', name: 'Pricebook', description: 'Standardized pricing catalog' },
        ]
      },
      {
        category: 'Field Operations',
        features: [
          { id: 'time_tracking', name: 'Time Tracking', description: 'Clock in/out with GPS' },
          { id: 'gps_tracking', name: 'GPS Tracking', description: 'Real-time crew location' },
          { id: 'photo_capture', name: 'Photo Capture', description: 'Job site photo documentation' },
          { id: 'equipment_tracking', name: 'Equipment', description: 'Equipment and tool tracking' },
          { id: 'fleet', name: 'Fleet Management', description: 'Vehicle fleet tracking' },
        ]
      },
      {
        category: 'Finance',
        features: [
          { id: 'online_payments', name: 'Online Payments', description: 'Stripe payment processing' },
          { id: 'expense_tracking', name: 'Expense Tracking', description: 'Expense logging and receipts' },
          { id: 'job_costing', name: 'Job Costing', description: 'Detailed job cost analysis' },
          { id: 'consumer_financing', name: 'Consumer Financing', description: 'Wisetack financing integration' },
          { id: 'quickbooks', name: 'QuickBooks', description: 'QuickBooks sync' },
        ]
      },
      {
        category: 'Communication',
        features: [
          { id: 'two_way_texting', name: 'Two-Way Texting', description: 'SMS communication with clients' },
          { id: 'call_tracking', name: 'Call Tracking', description: 'Inbound call tracking and recording' },
          { id: 'client_portal', name: 'Client Portal', description: 'Customer-facing project portal' },
        ]
      },
      {
        category: 'Marketing',
        features: [
          { id: 'paid_ads', name: 'Paid Ads Hub (Google + Meta)', description: 'Google & Meta campaign management, lead tracking, monthly ROI reports' },
          { id: 'google_reviews', name: 'Google Reviews', description: 'Review request automation' },
          { id: 'email_marketing', name: 'Email Marketing', description: 'Drip campaigns and newsletters' },
          { id: 'referral_program', name: 'Referral Program', description: 'Customer referral tracking' },
        ]
      },
      {
        category: 'Advanced',
        features: [
          { id: 'inventory', name: 'Inventory', description: 'Warehouse and material inventory' },
          { id: 'documents', name: 'Documents', description: 'Document management and storage' },
          { id: 'reports', name: 'Reports', description: 'Custom reporting dashboard' },
          { id: 'custom_dashboards', name: 'Custom Dashboards', description: 'Drag-and-drop widget dashboards' },
          { id: 'ai_receptionist', name: 'AI Receptionist', description: 'AI-powered call handling' },
          { id: 'map_view', name: 'Map View', description: 'Map-based job visualization' },
        ]
      }
    ]
  });
});


/**
 * POST /api/factory/cleanup
 * Clean old generated builds
 */
router.post('/cleanup', (req, res) => {
  const maxAge = req.body?.maxAge || 24 * 60 * 60 * 1000; // 24 hours default
  const cleaned = cleanOldBuilds(maxAge);
  res.json({ cleaned, message: `Removed ${cleaned} old builds` });
});


// ═══════════════════════════════════════════════════════════════════
// CUSTOMER MANAGEMENT & BILLING
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/factory/stats
 * Dashboard stats for operator
 */
router.get('/stats', async (req, res) => {
  try {
    
    const companyId = req.user.companyId;

    const [totalCustomers, totalBuilds, activeCustomers, recentBuilds] = await Promise.all([
      prisma.factoryCustomer.count({ where: { companyId } }),
      prisma.factoryBuild.count({ where: { companyId } }),
      prisma.factoryCustomer.count({ where: { companyId, status: 'active' } }),
      prisma.factoryBuild.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: { select: { name: true } } }
      }),
    ]);

    // Calculate monthly revenue from active subscriptions
    const activeSubscriptions = await prisma.factoryCustomer.findMany({
      where: { 
        companyId, 
        billingStatus: 'active',
        billingType: 'subscription',
        monthlyAmount: { not: null }
      },
      select: { monthlyAmount: true }
    });
    const monthlyRevenue = activeSubscriptions.reduce(
      (sum, c) => sum + (parseFloat(c.monthlyAmount) || 0), 0
    );

    // One-time revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const oneTimeRevenue = await prisma.factoryCustomer.aggregate({
      where: {
        companyId,
        billingType: 'one_time',
        paidAt: { gte: startOfMonth }
      },
      _sum: { oneTimeAmount: true }
    });

    res.json({
      totalCustomers,
      totalBuilds,
      activeCustomers,
      monthlyRevenue: monthlyRevenue + (parseFloat(oneTimeRevenue._sum.oneTimeAmount) || 0),
      recentBuilds: recentBuilds.map(b => ({
        companyName: b.customer?.name || b.companyName,
        products: b.products,
        status: b.status,
        createdAt: b.createdAt,
        buildId: b.buildId,
      })),
    });
  } catch (err) {
    logger.error('Stats error:', err);
    res.json({
      totalCustomers: 0,
      totalBuilds: 0,
      activeCustomers: 0,
      monthlyRevenue: 0,
      recentBuilds: [],
    });
  }
});


/**
 * GET /api/factory/customers
 * List all factory customers
 */
/**
 * DELETE /api/factory/builds/:id
 */
router.delete('/builds/:id', async (req, res) => {
  try {
    
    const build = await prisma.factoryBuild.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!build) return res.status(404).json({ error: 'Build not found' });

    // Delete zip from disk if it exists
    if (build.zipPath && fs.existsSync(build.zipPath)) {
      fs.unlinkSync(build.zipPath);
    }

    await prisma.factoryBuild.delete({ where: { id: build.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete build error:', err);
    res.status(500).json({ error: 'Failed to delete build' });
  }
});

router.get('/builds', async (req, res, next) => {
  try {
    
    const companyId = req.user.companyId;
    const builds = await prisma.factoryBuild.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        slug: true,
        products: true,
        buildId: true,
        zipName: true,
        zipPath: true,
        createdAt: true,
        customer: { select: { name: true, status: true } }
      }
    });
    res.json({ builds });
  } catch (err) { next(err); }
});

router.get('/customers', async (req, res) => {
  try {
    
    const companyId = req.user.companyId;
    const { status, billing, search } = req.query;

    const where = { companyId };
    if (status) where.status = status;
    if (billing) where.billingStatus = billing;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.factoryCustomer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        builds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, buildId: true, status: true }
        }
      }
    });

    res.json(customers);
  } catch (err) {
    logger.error('Customers error:', err);
    res.json([]);
  }
});


/**
 * GET /api/factory/customers/:id
 * Get single customer with full detail
 */
router.get('/customers/:id', async (req, res) => {
  try {
    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: {
        builds: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    logger.error('Customer detail error:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});


/**
 * PATCH /api/factory/customers/:id
 * Update customer (status, billing, notes, urls)
 */
router.patch('/customers/:id', async (req, res) => {
  try {
    // Verify ownership before update
    const owned = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId }
    });
    if (!owned) return res.status(404).json({ error: 'Customer not found' });

    const { 
      status, billingType, billingStatus, planId, 
      monthlyAmount, oneTimeAmount, paidAt, nextBillingDate,
      deployedUrl, apiUrl, siteUrl, notes,
      stripeCustomerId, stripeSubscriptionId
    } = req.body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (billingType !== undefined) updateData.billingType = billingType;
    if (billingStatus !== undefined) updateData.billingStatus = billingStatus;
    if (planId !== undefined) updateData.planId = planId;
    if (monthlyAmount !== undefined) updateData.monthlyAmount = monthlyAmount;
    if (oneTimeAmount !== undefined) updateData.oneTimeAmount = oneTimeAmount;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
    if (nextBillingDate !== undefined) updateData.nextBillingDate = nextBillingDate ? new Date(nextBillingDate) : null;
    if (deployedUrl !== undefined) updateData.deployedUrl = deployedUrl;
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (siteUrl !== undefined) updateData.siteUrl = siteUrl;
    if (notes !== undefined) updateData.notes = notes;
    if (stripeCustomerId !== undefined) updateData.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = stripeSubscriptionId;

    const customer = await prisma.factoryCustomer.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(customer);
  } catch (err) {
    logger.error('Customer update error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});


/**
 * DELETE /api/factory/customers/:id
 * Delete customer record
 */
router.delete('/customers/:id', async (req, res) => {
  try {
    const existing = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId }
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    await prisma.factoryCustomer.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('Customer delete error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});


/**
 * GET /api/factory/billing/summary
 * Revenue summary for operator dashboard
 */
router.get('/billing/summary', async (req, res) => {
  try {
    
    const companyId = req.user.companyId;

    const [subscriptions, oneTime, pastDue] = await Promise.all([
      prisma.factoryCustomer.findMany({
        where: { companyId, billingType: 'subscription', billingStatus: 'active' },
        select: { name: true, monthlyAmount: true, planId: true, nextBillingDate: true }
      }),
      prisma.factoryCustomer.findMany({
        where: { companyId, billingType: 'one_time' },
        select: { name: true, oneTimeAmount: true, paidAt: true }
      }),
      prisma.factoryCustomer.findMany({
        where: { companyId, billingStatus: 'past_due' },
        select: { name: true, monthlyAmount: true, email: true }
      }),
    ]);

    const mrr = subscriptions.reduce(
      (sum, c) => sum + (parseFloat(c.monthlyAmount) || 0), 0
    );
    const arr = mrr * 12;
    const totalOneTime = oneTime.reduce(
      (sum, c) => sum + (parseFloat(c.oneTimeAmount) || 0), 0
    );

    res.json({
      mrr,
      arr,
      totalOneTimeRevenue: totalOneTime,
      activeSubscriptions: subscriptions.length,
      pastDueCount: pastDue.length,
      pastDueCustomers: pastDue,
      subscriptions,
      oneTimeCustomers: oneTime,
    });
  } catch (err) {
    logger.error('Billing summary error:', err);
    res.json({ mrr: 0, arr: 0, totalOneTimeRevenue: 0, activeSubscriptions: 0, pastDueCount: 0 });
  }
});


// ═══════════════════════════════════════════════════════════════════
// AUTO-DEPLOY TO RENDER
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/factory/deploy/config
 * Check if auto-deploy is configured (boolean only — no env var names exposed)
 */
router.get('/deploy/config', (req, res) => {
  res.json({
    configured: deployService.isConfigured(),
  });
});


/**
 * POST /api/factory/customers/:id/deploy
 * Deploy a customer to Render (full pipeline)
 * Body: { region, plan }
 */
router.post('/customers/:id/deploy', async (req, res) => {
  try {
    if (!deployService.isConfigured()) {
      return res.status(400).json({
        error: 'Deploy not configured',
        missing: deployService.getMissingConfig(),
      });
    }

    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: { builds: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Find latest build zip
    const latestBuild = customer.builds[0];
    if (!latestBuild?.zipPath) {
      return res.status(400).json({ error: 'No build found. Generate a package first.' });
    }

    // Check zip exists — if not, regenerate it
    const { existsSync } = await import('fs');
    let zipPath = latestBuild.zipPath;
    if (!existsSync(zipPath)) {
      logger.info(`[Deploy] Zip not on disk, regenerating for ${customer.slug}...`);
      try {
        const { generatePackage } = await import('../services/factory/generator.js');
        const regen = await generatePackage(customer.wizardConfig || {
          products: customer.products,
          company: {
            name: customer.name,
            slug: customer.slug,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            domain: customer.domain,
          },
          branding: {
            primaryColor: customer.primaryColor || '#f97316',
            secondaryColor: customer.secondaryColor || '#1e293b',
          },
          features: customer.enabledFeatures || [],
        });
        zipPath = regen.zipPath;
        // Update the build record with new zip path
        await prisma.factoryBuild.update({
          where: { id: latestBuild.id },
          data: { zipPath: regen.zipPath },
        });
      } catch (regenErr) {
        return res.status(500).json({ error: `Could not regenerate package: ${regenErr.message}` });
      }
    }

    // Update status to deploying
    await prisma.factoryCustomer.update({
      where: { id: customer.id },
      data: { status: 'deploying' },
    });

    // Deploy async — don't block the response
    const { region, plan } = req.body;

    // Send immediate response
    res.json({ message: 'Deployment started', status: 'deploying' });

    // Run deployment in background
    try {
      const result = await deployService.deployCustomer(customer, zipPath, {
        region: region || 'ohio',
        plan: plan || 'free',
      });

      // Store service IDs and URLs
      const updateData = {
        status: result.success ? 'deployed' : 'generated',
      };

      if (result.apiUrl) updateData.apiUrl = result.apiUrl;
      if (result.deployedUrl) updateData.deployedUrl = result.deployedUrl;
      if (result.siteUrl) updateData.siteUrl = result.siteUrl;
      if (result.repoUrl) updateData.notes = `${customer.notes || ''}\nGitHub: ${result.repoUrl}`.trim();

        // Store Render service IDs for status tracking
        if (result.services) {
          const serviceIds = {};
          if (result.services.backend?.id) serviceIds.backend = result.services.backend.id;
          if (result.services.frontend?.id) serviceIds.frontend = result.services.frontend.id;
          if (result.services.site?.id) serviceIds.site = result.services.site.id;
          if (result.services.database?.id) serviceIds.database = result.services.database.id;
          updateData.renderServiceIds = JSON.stringify(serviceIds);
        }

      await prisma.factoryCustomer.update({
        where: { id: customer.id },
        data: updateData,
      });

      // ── Spin up marketing tenant if paid_ads was selected ─────────────────
      const customerFeatures = Array.isArray(customer.features) ? customer.features : [];
      if (result.success && customerFeatures.includes('paid_ads')) {
        try {
          await createMarketingTenant(customer.id, {
            client:      customer.slug,
            vertical:    customer.industry || 'general_contractor',
            city:        customer.city,
            state:       customer.state,
            websiteUrl:  result.siteUrl || customer.domain,
            notifyPhone: customer.phone,
            notifyEmail: customer.email,
            tier:        customer.planId || 'starter',
          });
          logger.info(`[Factory] Marketing tenant created for ${customer.slug}`);
        } catch (mktErr) {
          // Non-fatal — marketing setup can be triggered manually from the hub
          logger.error(`[Factory] Marketing tenant setup failed for ${customer.slug}:`, mktErr.message);
        }
      }

      logger.info(`Deploy ${customer.slug}:`, result.success ? 'SUCCESS' : 'PARTIAL', result.errors);
    } catch (deployErr) {
      logger.error(`Deploy ${customer.slug} FAILED:`, deployErr);
      await prisma.factoryCustomer.update({
        where: { id: customer.id },
        data: { status: 'generated' },
      });
    }
  } catch (err) {
    logger.error('Deploy endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * GET /api/factory/customers/:id/deploy/status
 * Check deploy status for a customer's Render services
 */
router.get('/customers/:id/deploy/status', async (req, res) => {
  try {
    if (!deployService.isConfigured()) {
      return res.json({ configured: false });
    }

    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Parse service IDs from renderServiceIds field
    let renderServiceIds = null;
    try {
      if (customer.renderServiceIds) {
        renderServiceIds = JSON.parse(customer.renderServiceIds);
      }
    } catch (e) { /* malformed JSON */ }

    if (!renderServiceIds) {
      return res.json({ status: 'not_deployed', services: {} });
    }

    const result = await deployService.checkDeployStatus({ renderServiceIds });
    res.json(result);
  } catch (err) {
    logger.error('Deploy status error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * POST /api/factory/customers/:id/redeploy
 * Trigger a redeploy of all services
 */
router.post('/customers/:id/redeploy', async (req, res) => {
  try {
    if (!deployService.isConfigured()) {
      return res.status(400).json({ error: 'Deploy not configured' });
    }

    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let renderServiceIds = null;
    try {
      if (customer.renderServiceIds) renderServiceIds = JSON.parse(customer.renderServiceIds);
    } catch (e) { /* */ }

    if (!renderServiceIds) {
      return res.status(400).json({ error: 'No deployed services found' });
    }

    const result = await deployService.redeployCustomer({ renderServiceIds });
    res.json(result);
  } catch (err) {
    logger.error('Redeploy error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
// STRIPE CHECKOUT & BILLING
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/factory/stripe/config
 * Returns publishable key and whether Stripe is configured
 */
router.get('/stripe/config', (req, res) => {
  res.json({
    configured: factoryStripe.isConfigured(),
    publishableKey: factoryStripe.getPublishableKey(),
  });
});


/**
 * POST /api/factory/customers/:id/checkout/subscription
 * Create a Stripe Checkout session for subscription billing
 * Body: { planId, monthlyAmount, billingCycle, trialDays }
 */
router.post('/customers/:id/checkout/subscription', async (req, res) => {
  try {
    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { planId, monthlyAmount, billingCycle, trialDays } = req.body;

    const result = await factoryStripe.createSubscriptionCheckout(customer, {
      planId: planId || customer.planId || 'custom',
      monthlyAmount: monthlyAmount || parseFloat(customer.monthlyAmount) || 149,
      billingCycle: billingCycle || 'monthly',
      trialDays: trialDays || 0,
    });

    // Save Stripe customer ID if new
    if (result.stripeCustomerId && result.stripeCustomerId !== customer.stripeCustomerId) {
      await prisma.factoryCustomer.update({
        where: { id: customer.id },
        data: { stripeCustomerId: result.stripeCustomerId },
      });
    }

    res.json(result);
  } catch (err) {
    logger.error('Subscription checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * POST /api/factory/customers/:id/checkout/license
 * Create a Stripe Checkout session for one-time license purchase
 * Body: { planId, amount, description }
 */
router.post('/customers/:id/checkout/license', async (req, res) => {
  try {
    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { planId, amount, description } = req.body;

    const result = await factoryStripe.createLicenseCheckout(customer, {
      planId: planId || customer.planId || 'custom',
      amount: amount || parseFloat(customer.oneTimeAmount) || 2497,
      description,
    });

    if (result.stripeCustomerId && result.stripeCustomerId !== customer.stripeCustomerId) {
      await prisma.factoryCustomer.update({
        where: { id: customer.id },
        data: { stripeCustomerId: result.stripeCustomerId },
      });
    }

    res.json(result);
  } catch (err) {
    logger.error('License checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * POST /api/factory/customers/:id/portal
 * Create a Stripe Customer Portal session (self-service billing)
 */
router.post('/customers/:id/portal', async (req, res) => {
  try {
    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!customer.stripeCustomerId) {
      return res.status(400).json({ error: 'Customer has no Stripe billing set up' });
    }

    const result = await factoryStripe.createPortalSession(customer);
    res.json(result);
  } catch (err) {
    logger.error('Portal session error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * POST /api/factory/customers/:id/cancel
 * Cancel a customer's subscription
 * Body: { immediate: boolean }
 */
router.post('/customers/:id/cancel', async (req, res) => {
  try {
    
    const customer = await prisma.factoryCustomer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const result = await factoryStripe.cancelSubscription(customer, {
      atPeriodEnd: !req.body.immediate,
    });

    // Update local record
    await prisma.factoryCustomer.update({
      where: { id: customer.id },
      data: {
        billingStatus: result.immediate ? 'canceled' : 'canceling',
        status: result.immediate ? 'suspended' : customer.status,
      },
    });

    res.json(result);
  } catch (err) {
    logger.error('Cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
