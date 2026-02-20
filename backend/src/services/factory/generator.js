/**
 * BuildPro Factory — Generator Service
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template and output directories — configurable via env vars
// Walks up from generator.js → services/factory/ → services/ → src/ → backend/ → project root
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const TEMPLATES_ROOT = process.env.BUILDPRO_TEMPLATES_DIR || path.join(PROJECT_ROOT, 'templates');
const OUTPUT_DIR = process.env.BUILDPRO_OUTPUT_DIR || path.join(PROJECT_ROOT, 'generated');

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
      `Set BUILDPRO_TEMPLATES_DIR env var or ensure templates/ exists at project root.`
    );
  }

  const buildId = crypto.randomUUID();
  const workDir = path.join(OUTPUT_DIR, buildId);
  const slug = slugify(config.company.name);
  
  // Ensure output dir exists
  fs.mkdirSync(workDir, { recursive: true });

  // Build the token map from config
  const tokens = buildTokenMap(config, slug);

  try {
    // 1. Copy selected products into workspace
    const products = config.products || [];
    
    if (products.includes('website')) {
      copyTemplate('website', path.join(workDir, 'website'), tokens);
      // Inject CSS custom property values
      injectCSSColors(path.join(workDir, 'website'), config.branding || {});
      // Strip disabled website features
      stripWebsiteFeatures(path.join(workDir, 'website'), config.features?.website || []);
      // Write logo + favicon files
      writeBrandingAssets(path.join(workDir, 'website'), config.branding || {});
      // If CMS is also selected, nest it inside website
      if (products.includes('cms')) {
        copyTemplate('cms', path.join(workDir, 'website', 'admin'), tokens);
      }
    } else if (products.includes('cms')) {
      // CMS standalone
      copyTemplate('cms', path.join(workDir, 'cms'), tokens);
    }

    if (products.includes('crm')) {
      copyTemplate('crm', path.join(workDir, 'crm'), tokens);
      // Process CRM-specific files
      processCRM(path.join(workDir, 'crm'), config, tokens);
      // Write logo to CRM frontend public dir
      writeBrandingAssets(path.join(workDir, 'crm', 'frontend', 'public'), config.branding || {});
    }

    // 2. Generate deployment configs at root
    generateReadme(workDir, config, tokens);
    generateDeployScript(workDir, config, products);

    // 3. Zip everything
    const zipName = `${slug}-buildpro.zip`;
    const zipPath = path.join(OUTPUT_DIR, zipName);
    await createZip(workDir, zipPath);

    // 4. Clean up workspace (keep zip)
    fs.rmSync(workDir, { recursive: true, force: true });

    return { zipPath, zipName, buildId, slug };

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
    '{{SITE_URL}}': c.siteUrl || `https://${c.domain || slug + '.com'}`,
    '{{FRONTEND_URL}}': c.frontendUrl || `https://${slug}-crm.onrender.com`,
    '{{BACKEND_URL}}': c.backendUrl || `https://${slug}-api.onrender.com`,

    // Industry
    '{{INDUSTRY}}': c.industry || 'Contractor',
    '{{META_DESCRIPTION}}': c.metaDescription || `Professional services in ${c.city || 'your area'}.`,
    '{{HERO_TAGLINE}}': c.heroTagline || `Trusted ${c.industry || 'Contractor'}`,

    // Owner / Admin
    '{{OWNER_NAME}}': c.ownerName || 'Admin',
    '{{OWNER_FIRST_NAME}}': firstName,
    '{{OWNER_LAST_NAME}}': lastName,
    '{{ADMIN_EMAIL}}': c.adminEmail || c.email || `admin@${slug}.com`,
    '{{DEFAULT_PASSWORD}}': defaultPassword,
    '{{HASHED_DEFAULT_PASSWORD}}': bcrypt.hashSync(defaultPassword, 10),

    // Branding / Colors
    '{{PRIMARY_COLOR}}': b.primaryColor || '#f97316',
    '{{SECONDARY_COLOR}}': b.secondaryColor || '#1e3a5f',

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

  // 5. Generate render.yaml from template
  const renderTemplatePath = path.join(crmDir, 'render.yaml.template');
  if (fs.existsSync(renderTemplatePath)) {
    let renderContent = fs.readFileSync(renderTemplatePath, 'utf8');
    renderContent = injectTokens(renderContent, tokens);
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
  readme += `Generated by BuildPro Factory on ${new Date().toISOString().split('T')[0]}\n\n`;
  
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
  readme += `Generated by BuildPro — [buildpro.dev](https://buildpro.dev)\n`;

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
 * Write logo and favicon from base64 data URLs to disk
 */
function writeBrandingAssets(targetDir, branding) {
  const uploadsDir = path.join(targetDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  if (branding.logo && branding.logo.startsWith('data:')) {
    const ext = getExtFromDataUrl(branding.logo) || 'png';
    const logoPath = path.join(uploadsDir, `logo.${ext}`);
    writeDataUrl(branding.logo, logoPath);

    // Update settings.json if it exists
    updateSettingsField(targetDir, 'logo', `/uploads/logo.${ext}`);
  }

  if (branding.favicon && branding.favicon.startsWith('data:')) {
    const ext = getExtFromDataUrl(branding.favicon) || 'ico';
    const faviconPath = path.join(uploadsDir, `favicon.${ext}`);
    writeDataUrl(branding.favicon, faviconPath);

    updateSettingsField(targetDir, 'favicon', `/uploads/favicon.${ext}`);
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
function injectCSSColors(websiteDir, branding) {
  const primary = branding.primaryColor || '#f97316';
  const secondary = branding.secondaryColor || '#1e3a5f';
  const accent = branding.accentColor || primary; // default accent = primary
  
  // Derive lighter shade from primary
  const primaryLight = lightenHex(primary, 20);
  const accentLight = lightenHex(accent, 20);
  
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
        
        if (line.includes('--color-primary-light:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, primaryLight);
        }
        if (line.includes('--color-primary:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, primary);
        }
        if (line.includes('--color-secondary:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, secondary);
        }
        if (line.includes('--color-accent-light:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, accentLight);
        }
        if (line.includes('--color-accent:')) {
          return line.replace(/#[0-9a-fA-F]{3,8}/, accent);
        }
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
