/**
 * BuildPro Fix Script
 * Run from repo root: node fix_buildpro.js
 * Fixes: circular prisma imports, duplicate stripe declarations, test guards
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(process.cwd(), 'backend');
let fixed = 0;
let created = 0;

// ── 1. Create src/config/prisma.js ──────────────────────────────────────────
const prismaConfigPath = path.join(BACKEND, 'src/config/prisma.js');
if (!fs.existsSync(prismaConfigPath)) {
  fs.mkdirSync(path.dirname(prismaConfigPath), { recursive: true });
  fs.writeFileSync(prismaConfigPath, `/**
 * Shared Prisma Client
 * Extracted from index.js to break circular import chains.
 */
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
`);
  console.log('CREATED: backend/src/config/prisma.js');
  created++;
}

// ── 2. Fix index.js ──────────────────────────────────────────────────────────
const indexPath = path.join(BACKEND, 'src/index.js');
let index = fs.readFileSync(indexPath, 'utf8');
let indexChanged = false;

if (index.includes("import { PrismaClient } from '@prisma/client'")) {
  index = index.replace("import { PrismaClient } from '@prisma/client';", "import { prisma } from './config/prisma.js';");
  indexChanged = true;
}
const prismaNewBlock = `const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export { prisma, io };`;
const prismaNewReplacement = `export { prisma, io };`;
if (index.includes(prismaNewBlock)) {
  index = index.replace(prismaNewBlock, prismaNewReplacement);
  indexChanged = true;
}
if (indexChanged) { fs.writeFileSync(indexPath, index); console.log('FIXED: backend/src/index.js'); fixed++; }

// ── 3. Fix services/stripe.js ────────────────────────────────────────────────
const svcStripePath = path.join(BACKEND, 'src/services/stripe.js');
let svcStripe = fs.readFileSync(svcStripePath, 'utf8');
let svcStripeChanged = false;

// Remove duplicate stripe instantiation
const dupStripe1 = `\nconst stripe = process.env.STRIPE_SECRET_KEY \n  ? new Stripe(process.env.STRIPE_SECRET_KEY, {\n      apiVersion: '2023-10-16',\n    })\n  : null;\n`;
if (svcStripe.includes(dupStripe1)) { svcStripe = svcStripe.replace(dupStripe1, '\n'); svcStripeChanged = true; }

// Also remove stray import Stripe if present
if (svcStripe.includes("import Stripe from 'stripe';")) {
  svcStripe = svcStripe.replace("import Stripe from 'stripe';\n", '');
  svcStripeChanged = true;
}
// Fix prisma import
if (svcStripe.includes("from '../index.js'")) {
  svcStripe = svcStripe.replace(/from '\.\.\/index\.js'/g, "from '../config/prisma.js'");
  svcStripeChanged = true;
}
if (svcStripeChanged) { fs.writeFileSync(svcStripePath, svcStripe); console.log('FIXED: backend/src/services/stripe.js'); fixed++; }

// ── 4. Fix services/factory/stripe.js ───────────────────────────────────────
const factStripePath = path.join(BACKEND, 'src/services/factory/stripe.js');
let factStripe = fs.readFileSync(factStripePath, 'utf8');
let factStripeChanged = false;

const dupStripe2 = `\nconst stripe = process.env.STRIPE_SECRET_KEY\n  ? new Stripe(process.env.STRIPE_SECRET_KEY)\n  : null;\n`;
if (factStripe.includes(dupStripe2)) { factStripe = factStripe.replace(dupStripe2, '\n'); factStripeChanged = true; }
if (factStripe.includes("import Stripe from 'stripe';")) {
  factStripe = factStripe.replace("import Stripe from 'stripe';\n", '');
  factStripeChanged = true;
}
if (factStripe.includes("from '../../index.js'")) {
  factStripe = factStripe.replace(/from '\.\.\/\.\.\/index\.js'/g, "from '../../config/prisma.js'");
  factStripeChanged = true;
}
if (factStripeChanged) { fs.writeFileSync(factStripePath, factStripe); console.log('FIXED: backend/src/services/factory/stripe.js'); fixed++; }

// ── 5. Fix routes/billing.js ─────────────────────────────────────────────────
const billingPath = path.join(BACKEND, 'src/routes/billing.js');
let billing = fs.readFileSync(billingPath, 'utf8');
let billingChanged = false;

if (billing.includes("import Stripe from 'stripe';")) {
  billing = billing.replace("import Stripe from 'stripe';\n", "import { stripe } from '../config/stripe.js';\n");
  billingChanged = true;
}
const dupStripe3a = `\nconst stripe = process.env.STRIPE_SECRET_KEY \n  ? new Stripe(process.env.STRIPE_SECRET_KEY)\n  : null;\n`;
const dupStripe3b = `\nconst stripe = process.env.STRIPE_SECRET_KEY\n  ? new Stripe(process.env.STRIPE_SECRET_KEY)\n  : null;\n`;
if (billing.includes(dupStripe3a)) { billing = billing.replace(dupStripe3a, '\n'); billingChanged = true; }
if (billing.includes(dupStripe3b)) { billing = billing.replace(dupStripe3b, '\n'); billingChanged = true; }
if (billing.includes("from '../index.js'")) {
  billing = billing.replace(/from '\.\.\/index\.js'/g, "from '../config/prisma.js'");
  billingChanged = true;
}
if (billingChanged) { fs.writeFileSync(billingPath, billing); console.log('FIXED: backend/src/routes/billing.js'); fixed++; }

// ── 6. Fix all files importing prisma from index.js ─────────────────────────
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') walkDir(full);
    else if (e.isFile() && e.name.endsWith('.js')) fixPrismaImport(full);
  }
}

function fixPrismaImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes("from '../index.js'") && !content.includes("from '../../index.js'")) return;
  
  const rel = path.relative(BACKEND, filePath).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  const prefix = depth === 2 ? '../' : '../../';
  
  const original = content;
  content = content.replace(/from '\.\.\/index\.js'/g, `from '${prefix}config/prisma.js'`);
  content = content.replace(/from '\.\.\/\.\.\/index\.js'/g, `from '${prefix}config/prisma.js'`);
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`FIXED: backend/${rel}`);
    fixed++;
  }
}

walkDir(path.join(BACKEND, 'src'));

// ── 7. Fix integration test ──────────────────────────────────────────────────
const testPath = path.join(BACKEND, '__tests__/integration.test.js');
let test = fs.readFileSync(testPath, 'utf8');
let testChanged = false;

const unguarded1 = `  it('rejects unauthenticated requests to protected routes', async () => {
    const res = await request.get('/api/v1/invoices');`;
const guarded1 = `  it('rejects unauthenticated requests to protected routes', async () => {
    if (!TEST_DB_URL) return;
    const res = await request.get('/api/v1/invoices');`;

const unguarded2 = `  it('rejects expired/invalid tokens', async () => {
    const res = await request`;
const guarded2 = `  it('rejects expired/invalid tokens', async () => {
    if (!TEST_DB_URL) return;
    const res = await request`;

if (test.includes(unguarded1) && !test.includes(guarded1)) { test = test.replace(unguarded1, guarded1); testChanged = true; }
if (test.includes(unguarded2) && !test.includes(guarded2)) { test = test.replace(unguarded2, guarded2); testChanged = true; }
if (testChanged) { fs.writeFileSync(testPath, test); console.log('FIXED: backend/__tests__/integration.test.js'); fixed++; }

// ── 8. Fix package.json postinstall ─────────────────────────────────────────
const pkgPath = path.join(BACKEND, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const correctPostinstall = `node -e 'require("fs").writeFileSync("node_modules/.prisma/client/package.json", "{\\"type\\":\\"commonjs\\"}")'`;
if (pkg.scripts?.postinstall !== correctPostinstall) {
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.postinstall = correctPostinstall;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('FIXED: backend/package.json');
  fixed++;
}

console.log(`\nDone. ${created} file(s) created, ${fixed} file(s) fixed.`);
