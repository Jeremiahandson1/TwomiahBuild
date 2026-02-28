/**
 * Render Deploy Service
 * 
 * Automates the full deployment pipeline for Factory customers:
 * 1. Push generated code to a new GitHub repo
 * 2. Create Render Postgres database
 * 3. Create Render web services (backend, frontend, site)
 * 4. Set environment variables
 * 5. Track deployment status
 * 
 * Required env vars:
 *   RENDER_API_KEY     - Render API key (from dashboard.render.com → Account → API Keys)
 *   RENDER_OWNER_ID    - Render workspace/owner ID (from dashboard URL or API)
 *   GITHUB_TOKEN       - GitHub personal access token with 'repo' scope
 *   GITHUB_ORG         - GitHub org or username to create repos under
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import logger from '../logger.js';

const RENDER_API = 'https://api.render.com/v1';
const GITHUB_API = 'https://api.github.com';

function renderHeaders() {
  return {
    'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function githubHeaders() {
  return {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}


// ============================================
// CONFIGURATION CHECK
// ============================================

export function isConfigured() {
  return !!(
    process.env.RENDER_API_KEY &&
    process.env.RENDER_OWNER_ID &&
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_ORG
  );
}

export function getMissingConfig() {
  const missing = [];
  if (!process.env.RENDER_API_KEY) missing.push('RENDER_API_KEY');
  if (!process.env.RENDER_OWNER_ID) missing.push('RENDER_OWNER_ID');
  if (!process.env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!process.env.GITHUB_ORG) missing.push('GITHUB_ORG');
  return missing;
}


// ============================================
// GITHUB OPERATIONS
// ============================================

/**
 * Create a GitHub repo and push the generated customer code to it
 */
async function deleteGitHubRepo(repoFullName) {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repoFullName}`, {
      method: 'DELETE',
      headers: githubHeaders(),
    });
    if (res.status === 204) {
      logger.info(`[Deploy] Deleted existing repo ${repoFullName}, waiting for GitHub...`);
      // Poll until repo is actually gone (max 30s)
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const check = await fetch(`${GITHUB_API}/repos/${repoFullName}`, { headers: githubHeaders() });
        if (check.status === 404) {
          logger.info(`[Deploy] Repo ${repoFullName} confirmed deleted`);
          return;
        }
        logger.info(`[Deploy] Waiting for repo deletion... attempt ${i + 1}`);
      }
    } else if (res.status === 404) {
      logger.info(`[Deploy] Repo ${repoFullName} does not exist, nothing to delete`);
    } else {
      logger.warn(`[Deploy] Delete returned status ${res.status} for ${repoFullName}`);
    }
  } catch (e) {
    logger.warn(`[Deploy] Could not delete repo ${repoFullName}: ${e.message}`);
  }
}

async function createGitHubRepo(slug, description) {
  const org = process.env.GITHUB_ORG;

  // Try creating under org first, fall back to user repo
  let res;
  try {
    res = await fetch(`${GITHUB_API}/orgs/${org}/repos`, {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({
        name: slug,
        description: description || `Twomiah Build customer: ${slug}`,
        private: true,
        auto_init: true, // Creates initial commit so we can push
      }),
    });
  } catch (e) {
    // Not an org, try as user
  }

  if (!res || !res.ok) {
    // Try as user repo
    res = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({
        name: slug,
        description: description || `Twomiah Build customer: ${slug}`,
        private: true,
        auto_init: true,
      }),
    });
  }

  if (!res.ok) {
    const err = await res.json();
    // If repo already exists, that's fine — we'll push to it
    if (err.errors?.[0]?.message?.includes('already exists')) {
      console.log(`Repo ${org}/${slug} already exists, will push to it`);
      return { full_name: `${org}/${slug}`, clone_url: `https://github.com/${org}/${slug}.git`, existed: true };
    }
    throw new Error(`GitHub repo creation failed: ${JSON.stringify(err)}`);
  }

  return await res.json();
}


/**
 * Push extracted zip contents to the GitHub repo
 */
export async function pushToGitHub(repoFullName, extractDir) {
  const token = process.env.GITHUB_TOKEN;
  const remoteUrl = `https://${token}@github.com/${repoFullName}.git`;

  try {
    const cmds = [
      `cd "${extractDir}" && git init`,
      `cd "${extractDir}" && git checkout -b main`,
      `cd "${extractDir}" && git config user.email "factory@twomiah-build.app"`,
      `cd "${extractDir}" && git config user.name "Twomiah Build Factory"`,
      `cd "${extractDir}" && git add -A`,
      `cd "${extractDir}" && git commit -m "Initial Twomiah Build deployment"`,
      `cd "${extractDir}" && git remote add origin "${remoteUrl}" 2>/dev/null || git remote set-url origin "${remoteUrl}"`,
      // --force alone leaves old files; push a new orphan root so repo is completely replaced
      `cd "${extractDir}" && git push origin main --force --no-verify`,
    ];

    for (const cmd of cmds) {
      execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    }

    return { success: true };
  } catch (err) {
    throw new Error(`Git push failed: ${err.message}`);
  }
}


// ============================================
// RENDER OPERATIONS
// ============================================

/**
 * Create a Render Postgres database
 */
async function findExistingDatabase(name) {
  const res = await fetch(`${RENDER_API}/postgres?limit=20`, {
    headers: renderHeaders(),
  });
  if (!res.ok) return null;
  const list = await res.json();
  const match = (Array.isArray(list) ? list : []).find(item => {
    const db = item.postgres || item;
    return db.name === name;
  });
  return match ? (match.postgres || match) : null;
}

async function createRenderDatabase(slug, region = 'ohio') {
  const dbName = `${slug}-db`;

  const res = await fetch(`${RENDER_API}/postgres`, {
    method: 'POST',
    headers: renderHeaders(),
    body: JSON.stringify({
      databaseName: slug.replace(/-/g, '_'),
      databaseUser: slug.replace(/-/g, '_'),
      name: dbName,
      ownerId: process.env.RENDER_OWNER_ID,
      plan: 'free',
      region: region,
      version: '16',
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    const errStr = JSON.stringify(err);
    // If name already taken, find and reuse existing DB
    if (res.status === 400 || res.status === 409 || errStr.includes('already') || errStr.includes('exists')) {
      logger.info(`[Deploy] DB ${dbName} already exists, looking it up...`);
      const existing = await findExistingDatabase(dbName);
      if (existing) {
        logger.info(`[Deploy] Reusing existing DB id=${existing.id}`);
        return existing;
      }
    }
    throw new Error(`Render DB creation failed (${res.status}): ${errStr}`);
  }

  return await res.json();
}


/**
 * Get Postgres connection info
 */
async function getDatabaseConnectionInfo(databaseId) {
  const res = await fetch(`${RENDER_API}/postgres/${databaseId}/connection-info`, {
    headers: renderHeaders(),
  });

  if (!res.ok) throw new Error('Failed to get DB connection info');
  return await res.json();
}


/**
 * Create a Render web service
 */
async function createRenderWebService(config) {
  const {
    name,
    repoFullName,
    rootDir = '',
    buildCommand = 'npm install',
    startCommand = 'npm start',
    envVars = [],
    plan = 'free',
    region = 'ohio',
  } = config;

  const res = await fetch(`${RENDER_API}/services`, {
    method: 'POST',
    headers: renderHeaders(),
    body: JSON.stringify({
      type: 'web_service',
      name,
      ownerId: process.env.RENDER_OWNER_ID,
      repo: `https://github.com/${repoFullName}`,
      autoDeploy: 'yes',
      branch: 'main',
      rootDir,
      serviceDetails: {
        envSpecificDetails: {
          buildCommand,
          startCommand,
        },
        plan,
        region,
        runtime: 'node',
        numInstances: 1,
      },
      envVars: envVars.map(ev => ({
        key: ev.key,
        value: ev.value,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Render service creation failed: ${JSON.stringify(err)}`);
  }

  return await res.json();
}


/**
 * Create a Render static site
 */
async function createRenderStaticSite(config) {
  const {
    name,
    repoFullName,
    rootDir = '',
    buildCommand = 'npm run build',
    publishPath = 'dist',
    envVars = [],
    region = 'ohio',
  } = config;

  const res = await fetch(`${RENDER_API}/services`, {
    method: 'POST',
    headers: renderHeaders(),
    body: JSON.stringify({
      type: 'static_site',
      name,
      ownerId: process.env.RENDER_OWNER_ID,
      repo: `https://github.com/${repoFullName}`,
      autoDeploy: 'yes',
      branch: 'main',
      rootDir,
      serviceDetails: {
        buildCommand,
        publishPath,
      },
      envVars: envVars.map(ev => ({
        key: ev.key,
        value: ev.value,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Render static site creation failed: ${JSON.stringify(err)}`);
  }

  return await res.json();
}


/**
 * Update env vars on an existing Render service
 */
async function updateRenderEnvVars(serviceId, envVars) {
  const res = await fetch(`${RENDER_API}/services/${serviceId}/env-vars`, {
    method: 'PUT',
    headers: renderHeaders(),
    body: JSON.stringify(envVars.map(ev => ({ key: ev.key, value: ev.value }))),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.warn(`[Deploy] Failed to update env vars for service ${serviceId}:`, err);
  }
  return res.ok;
}


/**
 * Get service deploy status
 */
async function getServiceStatus(serviceId) {
  const res = await fetch(`${RENDER_API}/services/${serviceId}`, {
    headers: renderHeaders(),
  });

  if (!res.ok) return null;
  return await res.json();
}


/**
 * List recent deploys for a service
 */
async function getServiceDeploys(serviceId, limit = 5) {
  const res = await fetch(`${RENDER_API}/services/${serviceId}/deploys?limit=${limit}`, {
    headers: renderHeaders(),
  });

  if (!res.ok) return [];
  return await res.json();
}


// ============================================
// FULL DEPLOYMENT PIPELINE
// ============================================

/**
 * Deploy a Factory customer to Render
 * 
 * @param {Object} factoryCustomer - The FactoryCustomer record
 * @param {string} zipPath - Path to the generated zip file
 * @param {Object} options - Deployment options
 * @returns {Object} Deployment results with service URLs
 */
/**
 * Send a branded onboarding email to the client after successful deployment
 */
async function sendOnboardingEmail(factoryCustomer, deployResults) {
  const sgApiKey = process.env.SENDGRID_API_KEY;
  if (!sgApiKey) throw new Error('SENDGRID_API_KEY not set');

  const { default: sgMail } = await import('@sendgrid/mail');
  sgMail.setApiKey(sgApiKey);

  const config = factoryCustomer.config || {};
  const company = config.company || {};
  const clientEmail = company.email;
  const clientName = company.ownerName || company.name || 'there';
  const companyName = company.name || factoryCustomer.slug;
  const siteUrl = deployResults.siteUrl || `https://${factoryCustomer.slug}-site.onrender.com`;
  const adminUrl = `${siteUrl}/admin`;
  const crmUrl = deployResults.crmUrl || '';
  const defaultPassword = config.defaultPassword || '(set at generation)';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:26px;">🎉 Your Site is Live!</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Welcome to Twomiah Build, ${clientName}</p>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
        <p style="font-size:16px;">Hi ${clientName},</p>
        <p>Your <strong>${companyName}</strong> website and tools are deployed and ready to go. Here's everything you need to get started:</p>
        
        <div style="background:white;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e5e7eb;">
          <h3 style="margin:0 0 16px;color:#374151;font-size:15px;text-transform:uppercase;letter-spacing:0.05em;">Your Links</h3>
          ${siteUrl ? `<div style="margin-bottom:12px;"><strong>🌐 Your Website:</strong> <a href="${siteUrl}" style="color:#0ea5e9;">${siteUrl}</a></div>` : ''}
          <div style="margin-bottom:12px;"><strong>⚙️ Admin Panel:</strong> <a href="${adminUrl}" style="color:#0ea5e9;">${adminUrl}</a></div>
          ${crmUrl ? `<div style="margin-bottom:12px;"><strong>📊 CRM Dashboard:</strong> <a href="${crmUrl}" style="color:#0ea5e9;">${crmUrl}</a></div>` : ''}
        </div>

        <div style="background:white;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e5e7eb;">
          <h3 style="margin:0 0 16px;color:#374151;font-size:15px;text-transform:uppercase;letter-spacing:0.05em;">Admin Login</h3>
          <div style="margin-bottom:8px;"><strong>Email / Username:</strong> ${clientEmail}</div>
          <div><strong>Temporary Password:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:6px;font-size:14px;">${defaultPassword}</code></div>
          <p style="font-size:13px;color:#6b7280;margin-top:12px;">Please change your password after your first login: Admin → Settings → Change Password</p>
        </div>

        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin:20px 0;">
          <strong>⏱ Note:</strong> Render's free tier takes 1-2 minutes to spin up on first load. Your site will be fast once it's warmed up. Consider upgrading to a paid Render plan for instant load times.
        </div>

        <h3 style="color:#374151;">Getting Started</h3>
        <ol style="color:#374151;line-height:2;">
          <li>Log into your admin panel and change your password</li>
          <li>Upload your logo and hero photo (Admin → Site Settings → Branding)</li>
          <li>Review and update your services list (Admin → Services)</li>
          <li>Add your first testimonial (Admin → Testimonials)</li>
          <li>Test your contact form by submitting a message</li>
        </ol>

        <p>Need help? Reply to this email or reach out to Jeremiah at Twomiah.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
          Built with ❤️ by <a href="https://twomiah.com" style="color:#0ea5e9;">Twomiah</a>
        </p>
      </div>
    </div>`;

  await sgMail.send({
    to: clientEmail,
    from: process.env.FROM_EMAIL || 'hello@twomiah.com',
    subject: `🎉 Your ${companyName} site is live on Twomiah Build!`,
    html,
    text: `Hi ${clientName}! Your ${companyName} site is live.\n\nWebsite: ${siteUrl}\nAdmin: ${adminUrl}\nTemp password: ${defaultPassword}\n\nChange your password after first login.\n\n— Twomiah Build`,
  });

  console.log(`[Deploy] Onboarding email sent to ${clientEmail}`);
}



export async function deployCustomer(factoryCustomer, zipPath, options = {}) {
  const {
    region = 'ohio',
    plan = 'free',
    products = factoryCustomer.products || ['crm'],
  } = options;

  const slug = factoryCustomer.slug;
  const isHomeCare = factoryCustomer.industry === 'home_care' || factoryCustomer.config?.company?.industry === 'home_care';
  const results = { steps: [], services: {}, errors: [] };

  const generateJwtSecret = () => {
    return crypto.randomBytes(48).toString('base64');
  };

  try {
    // ── Step 1: Extract zip ────────────────────────────
    const extractDir = path.join('/tmp', `deploy-${slug}-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);
    results.steps.push({ step: 'extract', status: 'ok' });

    // ── Step 2: Delete existing repo if present, then create fresh ──
    const org = process.env.GITHUB_ORG || process.env.GITHUB_USER;
    await deleteGitHubRepo(`${org}/${slug}`);
    const repo = await createGitHubRepo(slug, `Twomiah Build: ${factoryCustomer.name}`);
    results.steps.push({ step: 'github_repo', status: 'ok', repo: repo.full_name });
    results.repoUrl = `https://github.com/${repo.full_name}`;

    // ── Step 3: Push code to GitHub ────────────────────
    await pushToGitHub(repo.full_name, extractDir);
    results.steps.push({ step: 'github_push', status: 'ok' });

    // ── Step 4: Create Render Postgres ─────────────────
    let dbInfo = null;
    let dbConnectionInfo = null;

    try {
      const dbSlug = isHomeCare ? `${slug}-care` : slug;
      logger.info(`[Deploy] Creating DB: ${dbSlug}-db in ${region}`);
      const db = await createRenderDatabase(dbSlug, region);
      logger.info(`[Deploy] DB created successfully: ${dbSlug}-db, id=${db.id}`);
      results.steps.push({ step: 'render_db', status: 'ok', dbId: db.id });
      results.services.database = db;

      logger.info(`[Deploy] Waiting 30s for DB to initialize...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      dbConnectionInfo = await getDatabaseConnectionInfo(db.id);
      dbInfo = dbConnectionInfo;
      logger.info(`[Deploy] DB connection info retrieved. Keys: ${Object.keys(dbConnectionInfo || {}).join(', ')}`);
    } catch (dbErr) {
      logger.error(`[Deploy] DB creation FAILED for ${slug}: ${dbErr.message}`);
      results.steps.push({ step: 'render_db', status: 'error', error: dbErr.message });
      results.errors.push(`Database creation failed: ${dbErr.message}`);
      results.success = false;
      results.status = 'failed';
      return results;
    }

    const jwtSecret = generateJwtSecret();
    const jwtRefreshSecret = generateJwtSecret();

    // ── Step 5: Create Backend Service ─────────────────
    if (products.includes('crm')) {
      try {
        const backendEnvVars = [
          { key: 'NODE_ENV', value: 'production' },
          { key: 'JWT_SECRET', value: jwtSecret },
          { key: 'FRONTEND_URL', value: isHomeCare ? `https://${slug}-care.onrender.com` : `https://${slug}-crm.onrender.com` },
          { key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecret },
          { key: 'PORT', value: '10000' },
        ];

        if (factoryCustomer.planId === 'enterprise') {
          backendEnvVars.push({ key: 'FEATURE_PACKAGE', value: 'enterprise' });
        }

        if (dbInfo?.internalConnectionString) {
          backendEnvVars.push({ key: 'DATABASE_URL', value: dbInfo.internalConnectionString });
        } else if (dbInfo?.externalConnectionString) {
          backendEnvVars.push({ key: 'DATABASE_URL', value: dbInfo.externalConnectionString });
        }

        const crmApiName = isHomeCare ? `${slug}-care-api` : `${slug}-api`;
        const backend = await createRenderWebService({
          name: crmApiName,
          repoFullName: repo.full_name,
          rootDir: 'crm/backend',
          buildCommand: 'npm install && npx prisma generate && npx prisma migrate deploy',
          startCommand: 'npm run db:seed && npm start',
          envVars: backendEnvVars,
          plan,
          region,
        });

        results.steps.push({ step: 'render_backend', status: 'ok', serviceId: backend.service?.id });
        results.services.backend = backend.service;

        // Use actual slug from Render response (may have random suffix like -pjhh)
        const actualApiSlug = backend.service?.slug || crmApiName;
        const backendUrl = `https://${actualApiSlug}.onrender.com`;
        results.apiUrl = backendUrl;

        // ── Step 6: Create Frontend Service ───────────
        const crmFrontName = isHomeCare ? `${slug}-care` : `${slug}-crm`;
        const frontend = await createRenderStaticSite({
          name: crmFrontName,
          repoFullName: repo.full_name,
          rootDir: 'crm/frontend',
          buildCommand: 'npm install --include=dev && npm run build',
          publishPath: 'dist',
          envVars: [
            { key: 'VITE_API_URL', value: backendUrl },
          ],
        });

        results.steps.push({ step: 'render_frontend', status: 'ok', serviceId: frontend.service?.id });
        results.services.frontend = frontend.service;

        // Use actual slug from Render response for frontend URL too
        const actualFrontSlug = frontend.service?.slug || crmFrontName;
        const frontendUrl = `https://${actualFrontSlug}.onrender.com`;
        results.deployedUrl = frontendUrl;

        // Update backend FRONTEND_URL with the real frontend URL
        if (backend.service?.id && frontendUrl !== `https://${slug}-care.onrender.com` && frontendUrl !== `https://${slug}-crm.onrender.com`) {
          await updateRenderEnvVars(backend.service.id, [
            { key: 'FRONTEND_URL', value: frontendUrl },
          ]);
          logger.info(`[Deploy] Updated FRONTEND_URL to ${frontendUrl}`);
        }

      } catch (err) {
        results.steps.push({ step: 'render_backend', status: 'error', error: err.message });
        results.errors.push(`Backend: ${err.message}`);
      }
    }

    // ── Step 7: Create Site Service ────────────────────
    if (products.includes('website')) {
      try {
        const site = await createRenderWebService({
          name: `${slug}-site`,
          repoFullName: repo.full_name,
          rootDir: 'website',
          buildCommand: 'npm install && cd admin && npm install --include=dev && npm run build',
          startCommand: 'node server.js',
          envVars: [
            { key: 'NODE_ENV', value: 'production' },
            { key: 'PORT', value: '10000' },
            { key: 'JWT_SECRET', value: jwtSecret },
          ],
          plan,
          region,
        });

        results.steps.push({ step: 'render_site', status: 'ok', serviceId: site.service?.id });
        results.services.site = site.service;
        results.siteUrl = `https://${slug}-site.onrender.com`;
      } catch (err) {
        results.steps.push({ step: 'render_site', status: 'error', error: err.message });
        results.errors.push(`Site: ${err.message}`);
      }
    }

    // ── Send onboarding email ──────────────────────────
    if (results.success && factoryCustomer.config?.company?.email) {
      try {
        await sendOnboardingEmail(factoryCustomer, results);
        results.steps.push({ step: 'onboarding_email', status: 'ok' });
      } catch (emailErr) {
        logger.warn('[Deploy] Onboarding email failed:', emailErr.message);
        results.steps.push({ step: 'onboarding_email', status: 'skipped', reason: emailErr.message });
      }
    }

    // ── Cleanup ────────────────────────────────────────
    try { execSync(`rm -rf "${extractDir}"`, { stdio: 'pipe' }); } catch (e) { /* ignore */ }

    results.success = results.errors.length === 0;
    results.status = results.success ? 'deployed' : 'partial';

  } catch (err) {
    results.success = false;
    results.status = 'failed';
    results.errors.push(err.message);
  }

  return results;
}


/**
 * Check deployment status for all services of a customer
 */
export async function checkDeployStatus(factoryCustomer) {
  const statuses = {};

  // Check each service stored in the customer record
  // Service IDs would be stored as JSON in the customer record
  const serviceIds = factoryCustomer.renderServiceIds;
  if (!serviceIds) return { status: 'no_services' };

  for (const [role, serviceId] of Object.entries(serviceIds)) {
    try {
      const deploys = await getServiceDeploys(serviceId, 1);
      const latest = deploys[0];

      statuses[role] = {
        serviceId,
        status: latest?.deploy?.status || 'unknown',
        finishedAt: latest?.deploy?.finishedAt,
        commit: latest?.deploy?.commit?.message,
      };
    } catch (err) {
      statuses[role] = { serviceId, status: 'error', error: err.message };
    }
  }

  // Determine overall status
  const allStatuses = Object.values(statuses).map(s => s.status);
  const overallStatus = allStatuses.every(s => s === 'live') ? 'live'
    : allStatuses.some(s => s === 'build_in_progress' || s === 'update_in_progress') ? 'deploying'
    : allStatuses.some(s => s === 'deactivated') ? 'suspended'
    : 'unknown';

  return { services: statuses, overallStatus };
}


/**
 * Redeploy all services for a customer (trigger new deploy)
 */
export async function redeployCustomer(factoryCustomer) {
  const serviceIds = factoryCustomer.renderServiceIds;
  if (!serviceIds) throw new Error('No services to redeploy');

  const results = {};

  for (const [role, serviceId] of Object.entries(serviceIds)) {
    try {
      const res = await fetch(`${RENDER_API}/services/${serviceId}/deploys`, {
        method: 'POST',
        headers: renderHeaders(),
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const deploy = await res.json();
        results[role] = { status: 'triggered', deployId: deploy.id };
      } else {
        results[role] = { status: 'failed', error: (await res.json()).message };
      }
    } catch (err) {
      results[role] = { status: 'error', error: err.message };
    }
  }

  return results;
}


export default {
  isConfigured,
  getMissingConfig,
  deployCustomer,
  checkDeployStatus,
  redeployCustomer,
};
