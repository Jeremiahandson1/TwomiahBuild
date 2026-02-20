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

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
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
        description: description || `BuildPro customer: ${slug}`,
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
        description: description || `BuildPro customer: ${slug}`,
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
async function pushToGitHub(repoFullName, extractDir) {
  const token = process.env.GITHUB_TOKEN;
  // NOTE: remoteUrl contains the token — never log this variable or include it in error messages
  const remoteUrl = `https://${token}@github.com/${repoFullName}.git`;
  const safeRemoteUrl = `https://github.com/${repoFullName}.git`; // token-free URL for logging

  try {
    // Initialize git, add all files, commit, and push
    const cmds = [
      `cd "${extractDir}" && git init`,
      `cd "${extractDir}" && git checkout -b main`,
      `cd "${extractDir}" && git config user.email "factory@buildpro.app"`,
      `cd "${extractDir}" && git config user.name "BuildPro Factory"`,
      `cd "${extractDir}" && git add -A`,
      `cd "${extractDir}" && git commit -m "Initial BuildPro deployment"`,
      `cd "${extractDir}" && git remote add origin "${remoteUrl}" 2>/dev/null || git remote set-url origin "${remoteUrl}"`,
      `cd "${extractDir}" && git push -u origin main --force`,
    ];

    for (const cmd of cmds) {
      try {
        execSync(cmd, { stdio: 'pipe', timeout: 60000 });
      } catch (cmdErr) {
        // Sanitize error message — replace token with [REDACTED] before surfacing (Bug #21)
        const safeMessage = token
          ? (cmdErr.message || '').replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]')
          : cmdErr.message;
        throw new Error(`Git command failed for ${safeRemoteUrl}: ${safeMessage}`);
      }
    }

    return { success: true };
  } catch (err) {
    // Re-throw without re-wrapping if already sanitized above
    throw err;
  }
}


// ============================================
// RENDER OPERATIONS
// ============================================

/**
 * Create a Render Postgres database
 */
async function createRenderDatabase(slug, region = 'ohio') {
  const res = await fetch(`${RENDER_API}/postgres`, {
    method: 'POST',
    headers: renderHeaders(),
    body: JSON.stringify({
      databaseName: slug.replace(/-/g, '_'),
      databaseUser: slug.replace(/-/g, '_'),
      name: `${slug}-db`,
      ownerId: process.env.RENDER_OWNER_ID,
      plan: 'free', // Start free, customer can upgrade
      region: region,
      version: '16',
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Render DB creation failed: ${JSON.stringify(err)}`);
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
        region,
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
export async function deployCustomer(factoryCustomer, zipPath, options = {}) {
  const {
    region = 'ohio',
    plan = 'free',
    products = factoryCustomer.products || ['crm'],
  } = options;

  const slug = factoryCustomer.slug;
  const results = { steps: [], services: {}, errors: [] };

  const generateJwtSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  try {
    // ── Step 1: Extract zip ────────────────────────────
    const extractDir = path.join('/tmp', `deploy-${slug}-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'pipe' });
    results.steps.push({ step: 'extract', status: 'ok' });

    // ── Step 2: Create GitHub repo ─────────────────────
    const repo = await createGitHubRepo(slug, `BuildPro: ${factoryCustomer.name}`);
    results.steps.push({ step: 'github_repo', status: 'ok', repo: repo.full_name });
    results.repoUrl = `https://github.com/${repo.full_name}`;

    // ── Step 3: Push code to GitHub ────────────────────
    await pushToGitHub(repo.full_name, extractDir);
    results.steps.push({ step: 'github_push', status: 'ok' });

    // ── Step 4: Create Render Postgres ─────────────────
    let dbInfo = null;
    let dbConnectionInfo = null;

    try {
      const db = await createRenderDatabase(slug, region);
      results.steps.push({ step: 'render_db', status: 'ok', dbId: db.id });
      results.services.database = db;

      // Wait a moment for DB to initialize, then get connection info
      await new Promise(resolve => setTimeout(resolve, 5000));
      dbConnectionInfo = await getDatabaseConnectionInfo(db.id);
      dbInfo = dbConnectionInfo;
    } catch (dbErr) {
      results.steps.push({ step: 'render_db', status: 'error', error: dbErr.message });
      results.errors.push(`Database: ${dbErr.message}`);
    }

    const jwtSecret = generateJwtSecret();
    const jwtRefreshSecret = generateJwtSecret();

    // ── Step 5: Create Backend Service ─────────────────
    if (products.includes('crm')) {
      try {
        const backendEnvVars = [
          { key: 'NODE_ENV', value: 'production' },
          { key: 'JWT_SECRET', value: jwtSecret },
          { key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecret },
          { key: 'PORT', value: '10000' },
        ];

        // Add database URL if we got it
        if (dbInfo?.internalConnectionString) {
          backendEnvVars.push({ key: 'DATABASE_URL', value: dbInfo.internalConnectionString });
        } else if (dbInfo?.externalConnectionString) {
          backendEnvVars.push({ key: 'DATABASE_URL', value: dbInfo.externalConnectionString });
        }

        const backend = await createRenderWebService({
          name: `${slug}-api`,
          repoFullName: repo.full_name,
          rootDir: 'backend',
          buildCommand: 'npm install && npx prisma generate && npx prisma db push',
          startCommand: 'npm start',
          envVars: backendEnvVars,
          plan,
          region,
        });

        results.steps.push({ step: 'render_backend', status: 'ok', serviceId: backend.service?.id });
        results.services.backend = backend.service;

        const backendUrl = `https://${slug}-api.onrender.com`;
        results.apiUrl = backendUrl;

        // ── Step 6: Create Frontend Service ───────────
        const frontend = await createRenderStaticSite({
          name: `${slug}-crm`,
          repoFullName: repo.full_name,
          rootDir: 'frontend',
          buildCommand: 'npm install && npm run build',
          publishPath: 'dist',
          envVars: [
            { key: 'VITE_API_URL', value: `${backendUrl}/api` },
          ],
          region,
        });

        results.steps.push({ step: 'render_frontend', status: 'ok', serviceId: frontend.service?.id });
        results.services.frontend = frontend.service;
        results.deployedUrl = `https://${slug}-crm.onrender.com`;

        // Update backend with frontend URL for CORS
        // (would need to update env vars after creation)

      } catch (err) {
        results.steps.push({ step: 'render_backend', status: 'error', error: err.message });
        results.errors.push(`Backend: ${err.message}`);
      }
    }

    // ── Step 7: Create Site Service (if website product) ──
    if (products.includes('website')) {
      try {
        const site = await createRenderWebService({
          name: `${slug}-site`,
          repoFullName: repo.full_name,
          rootDir: 'site',
          buildCommand: 'npm install',
          startCommand: 'node server-static.js',
          envVars: [
            { key: 'NODE_ENV', value: 'production' },
            { key: 'PORT', value: '10000' },
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

    // ── Cleanup temp dir ──────────────────────────────
    try {
      execSync(`rm -rf "${extractDir}"`, { stdio: 'pipe' });
    } catch (e) { /* ignore cleanup errors */ }

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
