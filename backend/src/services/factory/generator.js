/**
 * Twomiah Build Factory — Generator Service
 * 
 * Takes wizard config and produces deployable zip packages from templates.
 * 
 * Flow:
 *   1. Copy selected template dirs to temp workspace
 *   2. Run token injection across all text files
 *   3. For CRM: populate seed.js with company + features, generate .env
 *   4. For Website/CMS: inject CSS variables, update settings
 *   5. Zip the workspace
 *   6. Return download path
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import archiver from 'archiver';
import bcrypt from 'bcryptjs';
import factoryStorage from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template and output directories — configurable via env vars
// Walks up from generator.js → services/factory/ → services/ → src/ → backend/ → project root
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = process.env.TWOMIAH_BUILD_TEMPLATES_DIR || path.join(PROJECT_ROOT, 'templates');
const OUTPUT_DIR = process.env.TWOMIAH_BUILD_OUTPUT_DIR || path.join(PROJECT_ROOT, 'generated');

// Text file extensions to process for token injection
const TEXT_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.ejs', '.html', '.css', '.json',
  '.md', '.txt', '.yml', '.yaml', '.xml', '.svg', '.env', '.sql',
  '.prisma', '.template', '.mjs'
]);

// Files to always skip
const SKIP_PATTERNS = ['node_modules', '.git', 'package-lock.json', '.DS_Store'];


/**
 * Main generate function
 * @param {Object} config - Wizard output
 * @returns {Object} { zipPath, zipName, buildId }
 */
export async function generate(config) {
  // Validate templates exist
  if (!fs.existsSync(TEMPLATES_ROOT)) {
    throw new Error(
      `Templates directory not found at ${TEMPLATES_ROOT}. ` +
      `Set TWOMIAH_BUILD_TEMPLATES_DIR env var or ensure templates/ exists at project root.`
    );
  }

  const buildId = crypto.randomUUID();
  const workDir = path.join(OUTPUT_DIR, buildId);
  const slug = slugify(config.company.name);
  
  // Ensure output dir exists
  fs.mkdirSync(workDir, { recursive: true });

  // Generate password first so it's in scope for the return value
  const defaultPassword = config.company?.defaultPassword || generatePassword();
  config = { ...config, company: { ...config.company, defaultPassword } };

  // Build the token map from config
  const tokens = buildTokenMap(config, slug);

  try {
    // 1. Copy selected products into workspace
    const products = config.products || [];
    
    if (products.includes('website')) {
      // Pick the right website template based on industry
      const industry = config.company?.industry || '';
      let websiteTemplate = 'website-general'; // blank slate default
      if (industry === 'home_care') {
        websiteTemplate = 'website-homecare';
      } else if (industry && industry !== 'other') {
        // All contractor/trade industries use the contractor template
        websiteTemplate = 'website-contractor';
      }
      copyTemplate(websiteTemplate, path.join(workDir, 'website'), tokens);
      // Inject CSS custom property values
      injectCSSColors(path.join(workDir, 'website'), config.branding || {}, industry);
      // Strip disabled website features
      stripWebsiteFeatures(path.join(workDir, 'website'), config.features?.website || []);
      // Write logo + favicon files
      writeBrandingAssets(path.join(workDir, 'website'), config.branding || {});
      // Inject content from wizard (services, about text, testimonials)
      injectWizardContent(path.join(workDir, 'website'), config);
      // Process website render.yaml.template if present (website-only builds)
      const websiteRenderTemplate = path.join(workDir, 'website', 'render.yaml.template');
      if (fs.existsSync(websiteRenderTemplate)) {
        let renderContent = fs.readFileSync(websiteRenderTemplate, 'utf8');
        renderContent = injectTokens(renderContent, tokens);
        // Write to repo root for Render Blueprint discovery
        fs.writeFileSync(path.join(workDir, 'render.yaml'), renderContent, 'utf8');
        fs.writeFileSync(path.join(workDir, 'website', 'render.yaml'), renderContent, 'utf8');
        fs.unlinkSync(websiteRenderTemplate);
      }
      // If CMS is also selected, nest it inside website
      if (products.includes('cms')) {
        copyTemplate('cms', path.join(workDir, 'website', 'admin'), tokens);
      }
    } else if (products.includes('cms')) {
      // CMS standalone
      copyTemplate('cms', path.join(workDir, 'cms'), tokens);
    }

    if (products.includes('crm')) {
      // Pick the right CRM template based on industry
      const crmIndustry = config.company?.industry || '';
      const crmTemplate = crmIndustry === 'home_care' ? 'crm-homecare' : 'crm';
      copyTemplate(crmTemplate, path.join(workDir, 'crm'), tokens);
      // Process CRM-specific files
      processCRM(path.join(workDir, 'crm'), config, tokens);
      // Write logo to CRM frontend public dir
      writeBrandingAssets(path.join(workDir, 'crm', 'frontend', 'public'), config.branding || {});
    }

    // 2. Generate deployment configs at root
    generateReadme(workDir, config, tokens);
    generateDeployScript(workDir, config, products);

    // 3. Zip everything
    const zipName = `${slug}-twomiah-build.zip`;
    const zipPath = path.join(OUTPUT_DIR, zipName);
    await createZip(workDir, zipPath);

    // 4. Clean up workspace (keep zip)
    fs.rmSync(workDir, { recursive: true, force: true });

    // 5. Upload to S3/R2 for persistent storage (no-op if local)
    const { storageKey, storageType } = await factoryStorage.uploadZip(zipPath, zipName);

    return { zipPath: storageKey, zipName, buildId, slug, storageType, defaultPassword };

  } catch (err) {
    // Clean up on failure
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
    throw err;
  }
}


/**
 * Build the complete token replacement map
 */
function buildTokenMap(config, slug) {
  const c = config.company || {};
  const b = config.branding || {};
  const industry = c.industry || '';
  
  const ownerParts = (c.ownerName || 'Admin User').split(' ');
  const firstName = ownerParts[0] || 'Admin';
  const lastName = ownerParts.slice(1).join(' ') || 'User';
  const defaultPassword = c.defaultPassword || generatePassword();

  return {
    // Company
    '{{COMPANY_NAME}}': c.name || 'My Company',
    '{{COMPANY_LEGAL_NAME}}': c.legalName || `${c.name || 'My Company'} LLC`,
    '{{COMPANY_NAME_UPPER}}': (c.name || 'My Company').toUpperCase(),
    '{{COMPANY_SLUG}}': slug,
    '{{COMPANY_NAME_SLUG}}': pascalCase(c.name || 'MyCompany'),
    '{{COMPANY_EMAIL}}': c.email || `info@${slug}.com`,
    '{{COMPANY_SHORT}}': (c.name || 'Co').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 4),
    '{{COMPANY_PHONE}}': c.phone || '(555) 000-0000',
    '{{COMPANY_PHONE_RAW}}': (c.phone || '5550000000').replace(/\D/g, ''),
    '{{COMPANY_ADDRESS}}': c.address || '123 Main St',
    '{{COMPANY_DESCRIPTION}}': c.description || `Professional services from ${c.name || 'our company'}.`,

    // Location
    '{{CITY}}': c.city || 'Your City',
    '{{STATE}}': c.state || 'ST',
    '{{STATE_FULL}}': c.stateFull || c.state || 'State',
    '{{ZIP}}': c.zip || '00000',
    '{{SERVICE_REGION}}': c.serviceRegion || c.city || 'the area',
    '{{NEARBY_CITY_1}}': (c.nearbyCities || [])[0] || 'Nearby City 1',
    '{{NEARBY_CITY_2}}': (c.nearbyCities || [])[1] || 'Nearby City 2',
    '{{NEARBY_CITY_3}}': (c.nearbyCities || [])[2] || 'Nearby City 3',
    '{{NEARBY_CITY_4}}': (c.nearbyCities || [])[3] || 'Nearby City 4',

    // Domain / URLs
    '{{DOMAIN}}': c.domain || `${slug}.com`,
    '{{COMPANY_DOMAIN}}': c.domain || `${slug}.com`,
    '{{SITE_URL}}': c.siteUrl || `https://${c.domain || slug + '.com'}`,
    '{{FRONTEND_URL}}': c.frontendUrl || (c.industry === 'home_care' ? `https://${slug}-care.onrender.com` : `https://${slug}-crm.onrender.com`),
    '{{BACKEND_URL}}': c.backendUrl || (c.industry === 'home_care' ? `https://${slug}-care-api.onrender.com` : `https://${slug}-api.onrender.com`),

    // Industry
    '{{INDUSTRY}}': c.industry || 'Contractor',
    '{{META_DESCRIPTION}}': c.metaDescription || (
      c.industry === 'home_care'
        ? `Professional in-home care services in ${c.city || 'your area'}. Licensed, insured, compassionate caregivers serving ${c.serviceRegion || c.city || 'the area'}.`
        : `Professional services in ${c.city || 'your area'}.`
    ),
    '{{HERO_TAGLINE}}': c.heroTagline || (
      c.industry === 'home_care' ? 'VA APPROVED PROVIDER' : `Trusted ${c.industry || 'Contractor'}`
    ),
    '{{HERO_TITLE}}': c.heroTitle || (
      c.industry === 'home_care'
        ? `Compassionate Home Care for Your Loved Ones`
        : `${c.name || 'Your Company'} — Quality You Can Trust`
    ),
    '{{HERO_DESCRIPTION}}': c.heroDescription || (
      c.industry === 'home_care'
        ? `Helping families in ${c.city || 'your area'} and surrounding communities with personalized, professional in-home care. Licensed, insured, and here when you need us.`
        : `Serving ${c.serviceRegion || c.city || 'the area'} with quality workmanship and customer-first service.`
    ),

    // Website content tokens
    '{{HERO_BADGE}}': c.heroBadge || (c.industry === 'home_care' ? 'Compassionate In-Home Care' : 'Licensed & Insured'),
    '{{TRUST_BADGE_1}}': c.trustBadge1 || (c.industry === 'home_care' ? 'Licensed & Insured' : 'Licensed & Insured'),
    '{{TRUST_BADGE_2}}': c.trustBadge2 || (c.industry === 'home_care' ? 'Background Checked Caregivers' : 'Free Estimates'),
    '{{RENDER_DOMAIN}}': c.renderDomain || `${slug}-site.onrender.com`,
    '{{ABOUT_TEXT}}': config.content?.aboutText || c.aboutText || (
      c.industry === 'home_care'
        ? `${c.name || 'We'} provide compassionate, professional in-home care services to seniors and families throughout ${c.city || 'the area'}. Our trained caregivers are dedicated to helping your loved ones maintain independence and dignity at home.`
        : `${c.name || 'We'} deliver quality workmanship and outstanding service to homeowners throughout ${c.serviceRegion || c.city || 'the area'}. Licensed, insured, and committed to getting the job done right.`
    ),
    '{{CTA_TEXT}}': config.content?.ctaText || c.ctaText || (
      c.industry === 'home_care'
        ? `Ready to discuss care options for your loved one?`
        : `Ready to start your project? Get a free estimate today.`
    ),

    // Owner / Admin
    '{{OWNER_NAME}}': c.ownerName || 'Admin',
    '{{OWNER_FIRST_NAME}}': firstName,
    '{{OWNER_LAST_NAME}}': lastName,
    '{{ADMIN_EMAIL}}': c.adminEmail || c.email || `admin@${slug}.com`,
    '{{DEFAULT_PASSWORD}}': defaultPassword,
    '{{HASHED_DEFAULT_PASSWORD}}': bcrypt.hashSync(defaultPassword, 10),

    // Branding / Colors
    '{{PRIMARY_COLOR}}': b.primaryColor || (industry === 'home_care' ? '#009688' : '#c9a227'),
    '{{SECONDARY_COLOR}}': b.secondaryColor || (industry === 'home_care' ? '#004d40' : '#1a2744'),
    '{{ACCENT_COLOR}}': b.accentColor || '#f59e0b',
    '{{OFF_WHITE_COLOR}}': b.offWhiteColor || (industry === 'home_care' ? '#f0fdf9' : '#f8f9fa'),

    // Products selected
    '{{PRODUCTS_JSON}}': JSON.stringify(config.products || ['crm']),
    '{{CMS_URL}}': c.siteUrl 
      ? `${c.siteUrl}/admin` 
      : (config.products || []).includes('cms') 
        ? `https://${slug}-site.onrender.com/admin` 
        : '',

    // Generated secrets
    '{{JWT_SECRET}}': crypto.randomBytes(32).toString('hex'),
    '{{DATABASE_URL}}': c.databaseUrl || `postgresql://user:pass@localhost:5432/${slug}_crm`,

    // Integrations — populated from wizard, fall back to empty (user configures post-deploy)
    '{{TWILIO_ACCOUNT_SID}}':    (config.integrations?.twilio?.accountSid  || '').trim(),
    '{{TWILIO_AUTH_TOKEN}}':     (config.integrations?.twilio?.authToken   || '').trim(),
    '{{TWILIO_PHONE_NUMBER}}':   (config.integrations?.twilio?.phoneNumber || '').trim(),
    '{{SENDGRID_API_KEY}}':      (config.integrations?.sendgrid?.apiKey    || '').trim(),
    '{{STRIPE_SECRET_KEY}}':     (config.integrations?.stripe?.secretKey   || '').trim(),
    '{{STRIPE_PUBLISHABLE_KEY}}': (config.integrations?.stripe?.publishableKey || '').trim(),
    '{{STRIPE_WEBHOOK_SECRET}}': (config.integrations?.stripe?.webhookSecret   || '').trim(),
    '{{GOOGLE_MAPS_API_KEY}}':   (config.integrations?.googleMaps?.apiKey || '').trim(),
    '{{SENTRY_DSN}}':            (config.integrations?.sentry?.dsn        || '').trim(),
  };
}


/**
 * Copy a template directory to dest, injecting tokens into text files
 */
function copyTemplate(templateName, destDir, tokens) {
  const srcDir = path.join(TEMPLATES_ROOT, templateName);
  
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Template not found: ${templateName} (looked in ${srcDir})`);
  }

  fs.mkdirSync(destDir, { recursive: true });
  copyAndInject(srcDir, destDir, tokens);
}


/**
 * Recursively copy files, injecting tokens into text files
 */
function copyAndInject(src, dest, tokens) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIP_PATTERNS.includes(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyAndInject(srcPath, destPath, tokens);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const baseName = entry.name.toLowerCase();

      if (TEXT_EXTS.has(ext) || baseName === '.env' || baseName === '.env.example' || baseName.endsWith('.template')) {
        // Text file — inject tokens
        let content = fs.readFileSync(srcPath, 'utf8');
        content = injectTokens(content, tokens);
        fs.writeFileSync(destPath, content, 'utf8');
      } else {
        // Binary — copy as-is
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}


/**
 * Replace all {{TOKEN}} placeholders in content
 */
function injectTokens(content, tokens) {
  for (const [token, value] of Object.entries(tokens)) {
    content = content.split(token).join(value);
  }
  return content;
}


/**
 * CRM-specific processing
 */
function processCRM(crmDir, config, tokens) {
  const features = config.features?.crm || [];
  const manifest = loadManifest(crmDir);
  
  // 1. Generate seed.js from template
  const seedTemplatePath = path.join(crmDir, 'backend', 'prisma', 'seed.template.js');
  const seedOutputPath = path.join(crmDir, 'backend', 'prisma', 'seed.js');
  
  if (fs.existsSync(seedTemplatePath)) {
    let seedContent = fs.readFileSync(seedTemplatePath, 'utf8');
    
    // Inject the enabled features array
    const featuresJson = JSON.stringify(features, null, 6).replace(/\n/g, '\n      ');
    seedContent = seedContent.replace('{{ENABLED_FEATURES_JSON}}', featuresJson);
    seedContent = seedContent.replace('{{ENABLED_FEATURES_COUNT}}', `${features.length} features`);
    
    // Inject remaining tokens
    seedContent = injectTokens(seedContent, tokens);
    
    fs.writeFileSync(seedOutputPath, seedContent, 'utf8');
    fs.unlinkSync(seedTemplatePath); // remove template file
  }

  // 2. Strip unused backend routes/services using manifest
  if (manifest) {
    stripUnusedCRMFiles(crmDir, features, manifest);
  }

  // 3. Generate backend .env from template
  processEnvTemplate(path.join(crmDir, 'backend'), tokens);
  
  // 4. Generate frontend .env from template
  processEnvTemplate(path.join(crmDir, 'frontend'), tokens);

  // 5. Generate render.yaml from template and write to REPO ROOT for Render Blueprint
  const renderTemplatePath = path.join(crmDir, 'render.yaml.template');
  if (fs.existsSync(renderTemplatePath)) {
    let renderContent = fs.readFileSync(renderTemplatePath, 'utf8');
    renderContent = injectTokens(renderContent, tokens);
    // Write to repo root so Render Blueprint discovers it automatically
    const repoRootRenderYaml = path.join(path.dirname(crmDir), 'render.yaml');
    fs.writeFileSync(repoRootRenderYaml, renderContent, 'utf8');
    // Also keep one inside crm/ for reference
    fs.writeFileSync(path.join(crmDir, 'render.yaml'), renderContent, 'utf8');
    fs.unlinkSync(renderTemplatePath);
  }

  // 6. Clean up other template files
  const otherTemplates = findFiles(crmDir, f => f.endsWith('.template'));
  otherTemplates.forEach(f => {
    const output = f.replace('.template', '');
    let content = fs.readFileSync(f, 'utf8');
    content = injectTokens(content, tokens);
    fs.writeFileSync(output, content, 'utf8');
    fs.unlinkSync(f);
  });

  // 7. Remove manifest from output (internal-only file)
  const manifestPath = path.join(crmDir, 'feature-manifest.json');
  if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
}


/**
 * Strip unused CRM backend route/service files and prune index.js imports
 */
function stripUnusedCRMFiles(crmDir, enabledFeatures, manifest) {
  // Collect all route/service files needed by enabled features
  const neededRoutes = new Set();
  const neededServices = new Set();

  // Core files are always needed
  if (manifest.core?.backend) {
    (manifest.core.backend.routes || []).forEach(f => neededRoutes.add(f));
    (manifest.core.backend.services || []).forEach(f => neededServices.add(f));
    (manifest.core.backend.middleware || []).forEach(() => {}); // middleware always kept
  }

  // Add files for each enabled feature
  for (const featureId of enabledFeatures) {
    const feature = manifest.features?.[featureId];
    if (!feature?.backend) continue;
    (feature.backend.routes || []).forEach(f => neededRoutes.add(f));
    (feature.backend.services || []).forEach(f => neededServices.add(f));
  }

  // Remove unneeded route files
  const routesDir = path.join(crmDir, 'backend', 'src', 'routes');
  if (fs.existsSync(routesDir)) {
    for (const file of fs.readdirSync(routesDir)) {
      if (file === 'auth.js' || file === 'factory.js') continue; // always keep
      if (!neededRoutes.has(file)) {
        fs.unlinkSync(path.join(routesDir, file));
      }
    }
  }

  // Remove unneeded service files
  const servicesDir = path.join(crmDir, 'backend', 'src', 'services');
  if (fs.existsSync(servicesDir)) {
    for (const entry of fs.readdirSync(servicesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) continue; // keep subdirectories (like factory/)
      if (!neededServices.has(entry.name)) {
        fs.unlinkSync(path.join(servicesDir, entry.name));
      }
    }
  }

  // Prune index.js imports/mounts for removed routes
  const indexPath = path.join(crmDir, 'backend', 'src', 'index.js');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    const allRouteFiles = new Set(
      (indexContent.match(/from '\.\/routes\/([^']+)'/g) || [])
        .map(m => m.match(/\/([^/]+)'/)[1])
    );

    for (const routeFile of allRouteFiles) {
      if (neededRoutes.has(routeFile) || routeFile === 'auth.js' || routeFile === 'factory.js') continue;
      // Remove the import line
      indexContent = indexContent.replace(
        new RegExp(`import \\w+ from './routes/${routeFile}';?\\n?`, 'g'), ''
      );
      // Remove the app.use mount line
      const routeName = routeFile.replace('.js', '');
      indexContent = indexContent.replace(
        new RegExp(`app\\.use\\('/api/[^']*',\\s*\\w*${routeName}\\w*Routes?\\);?\\n?`, 'gi'), ''
      );
    }

    fs.writeFileSync(indexPath, indexContent, 'utf8');
  }
}


/**
 * Process .env.template → .env
 */
function processEnvTemplate(dir, tokens) {
  const templatePath = path.join(dir, '.env.template');
  if (fs.existsSync(templatePath)) {
    let content = fs.readFileSync(templatePath, 'utf8');
    content = injectTokens(content, tokens);
    fs.writeFileSync(path.join(dir, '.env'), content, 'utf8');
    fs.unlinkSync(templatePath);
  }
}


/**
 * Load feature manifest
 */
function loadManifest(crmDir) {
  const manifestPath = path.join(crmDir, 'feature-manifest.json');
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  return null;
}


/**
 * Generate a root README for the package
 */
function generateReadme(workDir, config, tokens) {
  const products = config.products || [];
  const name = config.company?.name || 'Your Company';
  const slug = tokens['{{COMPANY_SLUG}}'];
  
  let readme = `# ${name} — Software Package\n\n`;
  readme += `Generated by Twomiah Build Factory on ${new Date().toISOString().split('T')[0]}\n\n`;
  
  readme += `## Quick Start\n\n`;
  readme += `Run \`bash deploy.sh\` to install all dependencies, or follow the manual steps below.\n\n`;

  readme += `## Admin Credentials\n\n`;
  readme += `- **Email:** \`${tokens['{{ADMIN_EMAIL}}']}\`\n`;
  readme += `- **Password:** \`${tokens['{{DEFAULT_PASSWORD}}']}\`\n`;
  readme += `- ⚠️ **Change the default password after first login!**\n\n`;

  readme += `## Included Products\n\n`;

  if (products.includes('crm')) {
    readme += `### CRM (\`/crm\`)\n`;
    readme += `Full construction management CRM with PostgreSQL backend and React frontend.\n\n`;
    readme += `**Requirements:** Node.js 18+, PostgreSQL 14+\n\n`;
    readme += `\`\`\`bash\n`;
    readme += `# 1. Set up database\n`;
    readme += `createdb ${slug}_crm\n\n`;
    readme += `# 2. Configure environment\n`;
    readme += `cd crm/backend\n`;
    readme += `# Edit .env — set DATABASE_URL to your PostgreSQL connection string\n\n`;
    readme += `# 3. Install & migrate\n`;
    readme += `npm install\n`;
    readme += `npx prisma migrate deploy\n`;
    readme += `npx prisma db seed\n`;
    readme += `npm start\n\n`;
    readme += `# 4. Frontend (separate terminal)\n`;
    readme += `cd crm/frontend\n`;
    readme += `npm install\n`;
    readme += `npm run build   # For production\n`;
    readme += `npm run dev     # For development\n`;
    readme += `\`\`\`\n\n`;
    
    const features = config.features?.crm || [];
    if (features.length > 0) {
      readme += `**Enabled Features (${features.length}):** ${features.join(', ')}\n\n`;
    }
  }

  if (products.includes('website')) {
    readme += `### Website (\`/website\`)\n`;
    readme += `Server-rendered EJS site with Express backend and JSON data storage.\n\n`;
    readme += `\`\`\`bash\ncd website\nnpm install\nnpm start\n\`\`\`\n\n`;
    
    if (products.includes('cms')) {
      readme += `### CMS Admin Panel (\`/website/admin\`)\n`;
      readme += `React admin panel for managing site content. Accessible at \`/admin\` on the website.\n\n`;
      readme += `\`\`\`bash\ncd website/admin\nnpm install\nnpm run build\n\`\`\`\n\n`;
    }
  } else if (products.includes('cms')) {
    readme += `### CMS (\`/cms\`)\nStandalone React admin panel.\n\n`;
    readme += `\`\`\`bash\ncd cms\nnpm install\nnpm run build\n\`\`\`\n\n`;
  }

  readme += `## Deploy to Render (Recommended)\n\n`;
  readme += `Each product includes a \`render.yaml\` blueprint for one-click deployment:\n\n`;
  readme += `1. Push this code to a GitHub/GitLab repo\n`;
  readme += `2. Go to [render.com](https://render.com) → New → Blueprint\n`;
  readme += `3. Connect your repo and select \`render.yaml\`\n`;
  readme += `4. Render will automatically create all services and database\n\n`;
  
  readme += `## Customer Portal\n\n`;
  readme += `After deploying the CRM, your customers log in and see a unified portal at the root URL.\n`;
  readme += `From there they can access:\n`;
  readme += `- **Business CRM** → Full CRM at \`/crm\`\n`;
  if (products.includes('website')) readme += `- **Live Website** → Public site\n`;
  if (products.includes('cms')) readme += `- **Website Manager** → CMS admin at \`/admin\`\n`;
  readme += `- **Account Settings** → Company config, users, integrations\n\n`;

  readme += `## Support\n\n`;
  readme += `Generated by Twomiah Build — [twomiah-build.dev](https://twomiah-build.dev)\n`;

  fs.writeFileSync(path.join(workDir, 'README.md'), readme, 'utf8');
}


/**
 * Generate a quick deploy script
 */
function generateDeployScript(workDir, config, products) {
  let script = `#!/bin/bash\n# Quick deploy script\nset -e\n\n`;
  
  if (products.includes('website')) {
    script += `echo "Installing website dependencies..."\ncd website && npm install\n`;
    if (products.includes('cms')) {
      script += `echo "Building CMS admin panel..."\ncd admin && npm install && npm run build\ncd ..\n`;
    }
    script += `echo "Website ready! Run: cd website && npm start"\ncd ..\n\n`;
  } else if (products.includes('cms')) {
    script += `echo "Installing CMS dependencies..."\ncd cms && npm install && npm run build\n`;
    script += `echo "CMS built!"\ncd ..\n\n`;
  }

  if (products.includes('crm')) {
    script += `echo "Installing CRM backend..."\ncd crm/backend && npm install\n`;
    script += `echo "Running database migrations..."\nnpx prisma migrate deploy\n`;
    script += `echo "Seeding database..."\nnpx prisma db seed\n`;
    script += `echo "CRM backend ready!"\ncd ../..\n\n`;
    script += `echo "Installing CRM frontend..."\ncd crm/frontend && npm install && npm run build\n`;
    script += `echo "CRM frontend built!"\ncd ../..\n\n`;
  }

  script += `echo "\\n✅ All products deployed!"\n`;

  const scriptPath = path.join(workDir, 'deploy.sh');
  fs.writeFileSync(scriptPath, script, 'utf8');
  fs.chmodSync(scriptPath, '755');
}


/**
 * Create a zip archive from a directory
 */
function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}


/**
 * Inject wizard-supplied content (services, about, testimonials) into generated site data files
 */
function injectWizardContent(websiteDir, config) {
  const dataDir = path.join(websiteDir, 'data');
  const wizardContent = config.content || {};
  const industry = config.company?.industry || '';

  // --- services.json ---
  const servicesFile = path.join(dataDir, 'services.json');
  if (fs.existsSync(servicesFile) && (wizardContent.services || wizardContent.customServices)) {
    try {
      let services = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));

      // Filter to only selected services if wizard made a selection
      if (wizardContent.services && wizardContent.services.length > 0) {
        services = services.filter(s => wizardContent.services.includes(s.id));
        // Re-order to match wizard selection order
        services.sort((a, b) =>
          wizardContent.services.indexOf(a.id) - wizardContent.services.indexOf(b.id)
        );
      }

      // Add custom services
      if (wizardContent.customServices && wizardContent.customServices.length > 0) {
        for (const custom of wizardContent.customServices) {
          if (!services.find(s => s.id === custom.id)) {
            services.push({
              id: custom.id,
              name: custom.name,
              slug: custom.id,
              shortDescription: custom.desc || `Professional ${custom.name.toLowerCase()} services.`,
              description: custom.desc || `We offer professional ${custom.name.toLowerCase()} services.`,
              icon: 'star',
              image: '',
              features: [],
              visible: true,
              order: services.length + 1,
            });
          }
        }
      }

      // Apply AI-generated service descriptions if provided
      if (wizardContent.serviceDescriptions) {
        services = services.map(s => ({
          ...s,
          shortDescription: wizardContent.serviceDescriptions[s.id]?.short || s.shortDescription,
          description: wizardContent.serviceDescriptions[s.id]?.long || s.description,
        }));
      }

      // Re-number order
      services = services.map((s, i) => ({ ...s, order: i + 1 }));
      fs.writeFileSync(servicesFile, JSON.stringify(services, null, 2));
      console.log(`[Factory] Injected ${services.length} services`);
    } catch (e) {
      console.warn('[Factory] Could not inject services:', e.message);
    }
  }

  // --- homepage.json - about text and CTA ---
  const homepageFile = path.join(dataDir, 'homepage.json');
  if (fs.existsSync(homepageFile)) {
    try {
      const homepage = JSON.parse(fs.readFileSync(homepageFile, 'utf8'));
      if (wizardContent.aboutText) homepage.aboutText = wizardContent.aboutText;
      if (wizardContent.ctaText) homepage.ctaText = wizardContent.ctaText;
      if (wizardContent.heroTagline) homepage.heroTagline = wizardContent.heroTagline;
      fs.writeFileSync(homepageFile, JSON.stringify(homepage, null, 2));
    } catch (e) {
      console.warn('[Factory] Could not inject homepage content:', e.message);
    }
  }
}



/**
 * Write logo and favicon from base64 data URLs to disk
 */
function writeBrandingAssets(targetDir, branding) {
  // Logo goes in build/images/ — committed to git, always deployed
  const imagesDir = path.join(targetDir, 'build', 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  // build/ for favicon — served as static root, before /:slug wildcard
  const buildDir = path.join(targetDir, 'build');

  if (branding.logo && branding.logo.startsWith('data:')) {
    const ext = getExtFromDataUrl(branding.logo) || 'png';
    const logoPath = path.join(imagesDir, `logo.${ext}`);
    writeDataUrl(branding.logo, logoPath);
    updateSettingsField(targetDir, 'logo', `/images/logo.${ext}`);
  }

  if (branding.favicon && branding.favicon.startsWith('data:')) {
    // Always write as .png (more reliable than .ico across browsers)
    const pngPath = path.join(buildDir, 'favicon.png');
    const icoPath = path.join(buildDir, 'favicon.ico');
    writeDataUrl(branding.favicon, pngPath);
    writeDataUrl(branding.favicon, icoPath);
    updateSettingsField(targetDir, 'favicon', `/favicon.png`);
  }

  // Hero photo → build/images/hero.jpg
  if (branding.heroPhoto && branding.heroPhoto.startsWith('data:')) {
    const ext = getExtFromDataUrl(branding.heroPhoto) || 'jpg';
    const heroPath = path.join(imagesDir, `hero.${ext}`);
    writeDataUrl(branding.heroPhoto, heroPath);
    // Update homepage.json hero.image so it shows immediately
    const homepageFile = path.join(targetDir, 'data', 'homepage.json');
    if (fs.existsSync(homepageFile)) {
      try {
        const hp = JSON.parse(fs.readFileSync(homepageFile, 'utf8'));
        if (!hp.hero) hp.hero = {};
        hp.hero.image = `/images/hero.${ext}`;
        fs.writeFileSync(homepageFile, JSON.stringify(hp, null, 2));
      } catch (e) { /* ignore */ }
    }
  }
}


/**
 * Extract file extension from data URL
 */
function getExtFromDataUrl(dataUrl) {
  const match = dataUrl.match(/data:image\/(\w+)/);
  if (match) {
    const type = match[1].toLowerCase();
    if (type === 'jpeg') return 'jpg';
    if (type === 'svg+xml') return 'svg';
    if (type === 'x-icon' || type === 'vnd.microsoft.icon') return 'ico';
    return type;
  }
  return null;
}


/**
 * Write base64 data URL to file
 */
function writeDataUrl(dataUrl, filePath) {
  const base64 = dataUrl.split(',')[1];
  if (base64) {
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  }
}


/**
 * Update a field in settings.json if it exists
 */
function updateSettingsField(dir, field, value) {
  // Check multiple possible locations
  const paths = [
    path.join(dir, 'data', 'settings.json'),
    path.join(dir, 'settings.json'),
  ];
  for (const settingsPath of paths) {
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        settings[field] = value;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      } catch (e) { /* skip if JSON parse fails */ }
      break;
    }
  }
}


/**
 * Strip disabled website features — removes view files, updates nav config
 */
function stripWebsiteFeatures(websiteDir, enabledFeatures) {
  // Map feature IDs to their files
  const featureFiles = {
    blog: {
      views: ['blog.ejs', 'blog-post.ejs'],
      data: ['posts.json'],
    },
    gallery: {
      views: ['gallery.ejs'],
      data: ['gallery.json'],
    },
    testimonials: {
      data: ['testimonials.json'],
    },
    services_pages: {
      views: ['service.ejs', 'subservice.ejs'],
      data: ['services.json'],
      routes: ['services.js'],
    },
    contact_form: {
      views: ['contact.ejs'],
      routes: ['leads.js'],
    },
    visualizer: {
      views: ['visualize.html'],
    },
  };

  // For each disabled feature, remove its files
  for (const [featureId, files] of Object.entries(featureFiles)) {
    if (enabledFeatures.includes(featureId)) continue;

    // Remove view files
    if (files.views) {
      for (const view of files.views) {
        const viewPath = path.join(websiteDir, 'views', view);
        if (fs.existsSync(viewPath)) fs.unlinkSync(viewPath);
      }
    }

    // Remove route files (optional features only)
    if (files.routes) {
      for (const route of files.routes) {
        const routePath = path.join(websiteDir, 'routes', route);
        if (fs.existsSync(routePath)) fs.unlinkSync(routePath);
      }
    }

    // Empty data files (set to [] so JSON parsing doesn't break)
    if (files.data) {
      for (const dataFile of files.data) {
        const dataPath = path.join(websiteDir, 'data', dataFile);
        if (fs.existsSync(dataPath)) {
          fs.writeFileSync(dataPath, '[]', 'utf8');
        }
      }
    }
  }

  // Update nav-config.json to only show enabled features
  const navConfigPath = path.join(websiteDir, 'data', 'nav-config.json');
  if (fs.existsSync(navConfigPath)) {
    const navConfig = JSON.parse(fs.readFileSync(navConfigPath, 'utf8'));
    const featureToNav = {
      services_pages: 'services',
      gallery: 'gallery',
      blog: 'blog',
      contact_form: 'contact',
    };
    
    if (navConfig.items) {
      navConfig.items = navConfig.items.map(item => {
        // Find if this nav item maps to a feature
        const featureId = Object.entries(featureToNav).find(([, navId]) => navId === item.id)?.[0];
        if (featureId) {
          item.visible = enabledFeatures.includes(featureId);
        }
        return item;
      });
    }
    
    fs.writeFileSync(navConfigPath, JSON.stringify(navConfig, null, 2), 'utf8');
  }

  // Handle analytics — add a flag file if not enabled
  if (!enabledFeatures.includes('analytics')) {
    const settingsPath = path.join(websiteDir, 'data', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      settings.analytics = { googleAnalyticsId: '', facebookPixelId: '', googleTagManagerId: '' };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
  }
}


/**
 * Inject CSS custom property values into :root blocks
 */
function injectCSSColors(websiteDir, branding, industry) {
  // Industry-aware color defaults
  const defaults = industry === 'home_care'
    ? { primary: '#009688', secondary: '#004d40', accent: '#f59e0b' }
    : { primary: '#c9a227', secondary: '#1a2744', accent: '#c9a227' };

  const primary = branding.primaryColor || defaults.primary;
  const secondary = branding.secondaryColor || defaults.secondary;
  const accent = branding.accentColor || defaults.accent;
  
  // Derive lighter shade from primary
  const primaryLight = lightenHex(primary, 20);
  const accentLight = lightenHex(accent, 20);

  // Semantic aliases used by home care + contractor templates
  const navyColor   = secondary;                   // --navy = secondary brand color
  const navyLight   = lightenHex(secondary, 12);
  const navyDark    = lightenHex(secondary, -15);
  const goldColor   = primary;                     // --gold = primary brand color
  const goldLight   = lightenHex(primary, 15);
  const goldDark    = lightenHex(primary, -15);
  const warmColor   = branding.accentColor || '#f59e0b'; // --warm = accent (amber)
  const warmDark    = lightenHex(warmColor, -15);
  const offWhite    = branding.offWhiteColor || '#f0fdf9'; // mint tint — can be overridden
  
  const cssFiles = findFiles(websiteDir, f => f.endsWith('.css'));
  
  for (const cssPath of cssFiles) {
    let content = fs.readFileSync(cssPath, 'utf8');
    
    // Replace CSS custom properties line by line (supports multi-line :root blocks)
    const lines = content.split('\n');
    let inRoot = false;
    let braceDepth = 0;
    const output = lines.map(line => {
      if (line.includes(':root')) inRoot = true;
      if (inRoot) {
        if (line.includes('{')) braceDepth++;
        if (line.includes('}')) { braceDepth--; if (braceDepth <= 0) inRoot = false; }
        
        // Standard factory color tokens
        if (line.includes('--color-primary-light:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, primaryLight);
        }
        if (line.includes('--color-primary:') && !line.includes('--color-primary-')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, primary);
        }
        if (line.includes('--color-secondary:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, secondary);
        }
        if (line.includes('--color-accent-light:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, accentLight);
        }
        if (line.includes('--color-accent:') && !line.includes('--color-accent-')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, accent);
        }

        // Semantic palette tokens (home care + contractor templates)
        if (line.includes('--navy-light:')) return line.replace(/#[0-9a-fA-F]{3,8}/, navyLight);
        if (line.includes('--navy-dark:'))  return line.replace(/#[0-9a-fA-F]{3,8}/, navyDark);
        if (line.includes('--navy:') && !line.includes('--navy-')) return line.replace(/#[0-9a-fA-F]{3,8}/, navyColor);
        if (line.includes('--gold-light:')) return line.replace(/#[0-9a-fA-F]{3,8}/, goldLight);
        if (line.includes('--gold-dark:'))  return line.replace(/#[0-9a-fA-F]{3,8}/, goldDark);
        if (line.includes('--gold:') && !line.includes('--gold-')) return line.replace(/#[0-9a-fA-F]{3,8}/, goldColor);
        if (line.includes('--warm-dark:'))  return line.replace(/#[0-9a-fA-F]{3,8}/, warmDark);
        if (line.includes('--warm:') && !line.includes('--warm-')) return line.replace(/#[0-9a-fA-F]{3,8}/, warmColor);
        if (line.includes('--off-white:'))  return line.replace(/#[0-9a-fA-F]{3,8}/, offWhite);
      }
      return line;
    });
    
    fs.writeFileSync(cssPath, output.join('\n'), 'utf8');
  }
}


/**
 * Lighten a hex color by a percentage
 */
function lightenHex(hex, percent) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  let r = (num >> 16) + Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) + Math.round(255 * percent / 100);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


// ─── UTILS ─────────────────────────────────────────────────────────

function slugify(str) {
  return (str || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pascalCase(str) {
  return (str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pw = '';
  for (let i = 0; i < 12; i++) {
    pw += chars[crypto.randomInt(chars.length)];
  }
  return pw;
}

function findFiles(dir, filterFn, result = []) {
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_PATTERNS.includes(entry.name)) {
      findFiles(fullPath, filterFn, result);
    } else if (entry.isFile() && filterFn(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}


/**
 * List available templates
 */

/**
 * Generate a preview of the website home page with tokens filled in
 * Returns rendered HTML string — no files written to disk
 */
export function previewWebsite(config) {
  const industry = config.company?.industry || 'contractor';
  const websiteTemplate = industry === 'home_care' ? 'website-homecare'
    : industry === 'contractor' ? 'website-contractor'
    : 'website-general';

  const TEMPLATES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..', 'templates');
  const templateDir = path.join(TEMPLATES_DIR, websiteTemplate);

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template not found: ${websiteTemplate}`);
  }

  const tokens = buildTokenMap(config);

  // Read home.ejs and base.ejs
  const homeEjs = path.join(templateDir, 'views', 'home.ejs');
  const baseEjs = path.join(templateDir, 'views', 'base.ejs');
  const cssFile = path.join(templateDir, 'build', 'styles', 'main.css');

  if (!fs.existsSync(homeEjs) || !fs.existsSync(baseEjs)) {
    throw new Error('Template views not found');
  }

  let homeContent = injectTokens(fs.readFileSync(homeEjs, 'utf8'), tokens);
  let baseContent = injectTokens(fs.readFileSync(baseEjs, 'utf8'), tokens);
  let css = '';
  if (fs.existsSync(cssFile)) {
    css = injectTokens(fs.readFileSync(cssFile, 'utf8'), tokens);
  }

  // Load template data files with token replacement
  const dataDir = path.join(templateDir, 'data');
  const loadData = (file) => {
    const fp = path.join(dataDir, file);
    if (!fs.existsSync(fp)) return null;
    try { return JSON.parse(injectTokens(fs.readFileSync(fp, 'utf8'), tokens)); }
    catch (e) { return null; }
  };

  const settings = loadData('settings.json') || {};
  const services = loadData('services.json') || [];
  const testimonials = loadData('testimonials.json') || [];
  const homepage = loadData('homepage.json') || {};

  // Apply branding colors to CSS
  const b = config.branding || {};
  if (b.primaryColor) css = css.replace(/--gold:\s*[^;]+;/, `--gold: ${b.primaryColor};`);
  if (b.secondaryColor) css = css.replace(/--navy:\s*[^;]+;/, `--navy: ${b.secondaryColor};`);

  // Simple EJS-like variable substitution for preview
  // Replace <%- varName %> and <%= varName %> with actual values
  const ejsVars = {
    settings: JSON.stringify(settings),
    services: JSON.stringify(services),
    testimonials: JSON.stringify(testimonials),
    homepage: JSON.stringify(homepage),
    siteName: settings.siteName || tokens['{{COMPANY_NAME}}'],
    companyName: tokens['{{COMPANY_NAME}}'],
    phone: tokens['{{COMPANY_PHONE}}'],
    city: tokens['{{CITY}}'],
    state: tokens['{{STATE}}'],
  };

  // Build a self-contained HTML preview
  const logoSrc = b.logo || '';
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tokens['{{COMPANY_NAME}}']} — Preview</title>
  <style>
    ${css}
    /* Preview banner */
    .twomiah-preview-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(90deg, #7c3aed, #4f46e5);
      color: white; text-align: center; padding: 8px 16px;
      font-size: 13px; font-family: sans-serif; font-weight: 600;
      letter-spacing: 0.05em;
    }
    body { padding-top: 36px; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="twomiah-preview-bar">⚡ TWOMIAH FACTORY PREVIEW — ${tokens['{{COMPANY_NAME}}']}</div>

  <nav class="hc-nav">
    <div class="hc-nav-inner">
      <a class="hc-nav-brand" href="#">
        ${logoSrc ? `<img src="${logoSrc}" alt="${tokens['{{COMPANY_NAME}}']}" class="hc-nav-logo">` : `<span class="hc-nav-brand-text">${tokens['{{COMPANY_NAME}}']}</span>`}
      </a>
      <div class="hc-nav-links">
        <a href="#about" class="hc-nav-link">About</a>
        <a href="#services" class="hc-nav-link">Services</a>
        <a href="#areas" class="hc-nav-link">Service Areas</a>
        <a href="#contact" class="hc-nav-link hc-nav-cta">Free Consultation</a>
      </div>
    </div>
  </nav>

  <section class="hero-split" id="home">
    <div class="hero-split-inner">
      <div class="hero-split-text">
        <div class="hero-badge-pill">${tokens['{{HERO_BADGE}}'] || 'Professional Services'}</div>
        <h1 class="hero-split-headline">${tokens['{{HERO_TITLE}}']}</h1>
        <p class="hero-split-sub">${tokens['{{HERO_DESCRIPTION}}']}</p>
        <div class="hero-split-buttons">
          <a href="#contact" class="btn btn-warm btn-lg">Get a Free Consultation</a>
          <a href="#services" class="btn btn-outline-teal btn-lg">Our Services</a>
        </div>
      </div>
      <div class="hero-split-photo">
        ${b.heroPhoto ? `<img src="${b.heroPhoto}" alt="Hero" class="hero-photo-img">` : `<div class="hero-photo-placeholder" style="background:linear-gradient(135deg,#e0f2fe,#bae6fd);border-radius:20px;height:340px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#0284c7;font-family:sans-serif;"><span style="font-size:48px">📸</span><span style="font-size:14px;font-weight:600">Upload a hero photo in Branding step</span></div>`}
      </div>
    </div>
  </section>

  <section class="hc-services-section" id="services">
    <div class="hc-services-inner">
      <div class="section-eyebrow">What We Offer</div>
      <h2 class="section-headline-serif">Our Services</h2>
      <div class="hc-services-grid">
        ${services.slice(0,6).map(s => `
          <div class="hc-service-card">
            <div class="hc-service-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <h3 class="hc-service-name">${s.name}</h3>
            <p class="hc-service-desc">${s.shortDescription || ''}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>

  ${testimonials.length > 0 ? `
  <section style="padding:60px 20px;background:white;">
    <div style="max-width:1100px;margin:0 auto;text-align:center;">
      <div class="section-eyebrow">What Families Say</div>
      <h2 class="section-headline-serif">Client Testimonials</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:32px;">
        ${testimonials.slice(0,3).map(t => `
          <div style="background:#f8fafc;border-radius:16px;padding:28px;text-align:left;">
            <div style="color:#f59e0b;font-size:18px;margin-bottom:12px;">${'★'.repeat(t.rating||5)}</div>
            <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px">"${t.text}"</p>
            <div style="font-weight:700;font-size:14px">${t.name}</div>
            <div style="font-size:13px;color:#6b7280">${t.role||''} — ${t.location||''}</div>
          </div>`).join('')}
      </div>
    </div>
  </section>` : ''}

  <section class="hc-cta-banner" id="contact">
    <div class="hc-cta-inner">
      <h2 class="hc-cta-headline">${tokens['{{CTA_TEXT}}'] || 'Ready to get started?'}</h2>
      <p class="hc-cta-sub">Call us at <strong>${tokens['{{COMPANY_PHONE}}']}</strong> or send a message below.</p>
    </div>
  </section>

  <footer class="hc-footer">
    <div class="hc-footer-inner">
      <div class="hc-footer-col">
        <div class="hc-footer-brand">${tokens['{{COMPANY_NAME}}']}</div>
        <div class="hc-footer-contact">
          <div>${tokens['{{COMPANY_PHONE}}']}</div>
          <div>${tokens['{{COMPANY_EMAIL}}']}</div>
          <div>${tokens['{{CITY}}']}, ${tokens['{{STATE}}']}</div>
        </div>
      </div>
    </div>
    <div class="hc-footer-bottom">
      <p>&copy; 2026 ${tokens['{{COMPANY_LEGAL_NAME}}']}. All rights reserved.</p>
      <p class="built-by">Built by <a href="https://twomiah.com">Twomiah</a></p>
    </div>
  </footer>
</body>
</html>`;

  return previewHtml;
}


export function listTemplates() {
  if (!fs.existsSync(TEMPLATES_ROOT)) return [];
  return fs.readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}


/**
 * Clean old generated zips (older than maxAge ms)
 */
export function cleanOldBuilds(maxAge = 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(OUTPUT_DIR)) return 0;
  let cleaned = 0;
  const now = Date.now();
  
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    const filePath = path.join(OUTPUT_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > maxAge) {
      fs.rmSync(filePath, { recursive: true, force: true });
      cleaned++;
    }
  }
  return cleaned;
}
