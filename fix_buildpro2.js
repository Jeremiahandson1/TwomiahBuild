/**
 * BuildPro Fix Script v2 — regex-based, format-agnostic
 * Run from repo root: node fix_buildpro2.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.join(process.cwd(), 'backend');
let fixed = 0;

// ── 1. Create src/config/prisma.js ───────────────────────────────────────────
const prismaConfigPath = path.join(BACKEND, 'src/config/prisma.js');
fs.mkdirSync(path.dirname(prismaConfigPath), { recursive: true });
fs.writeFileSync(prismaConfigPath, `/**
 * Shared Prisma Client - extracted from index.js to break circular imports.
 */
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
`);
console.log('CREATED: backend/src/config/prisma.js');

// ── 2. Fix index.js ───────────────────────────────────────────────────────────
fixFile(path.join(BACKEND, 'src/index.js'), (src) => {
  // Replace PrismaClient import with config import
  src = src.replace(/import\s*\{\s*PrismaClient\s*\}\s*from\s*['"]@prisma\/client['"]\s*;?/g,
    "import { prisma } from './config/prisma.js';");
  // Remove local prisma instantiation block
  src = src.replace(/\nconst prisma\s*=\s*new PrismaClient\s*\([^)]*\)\s*;?\n/g, '\n');
  // Remove old export if it includes prisma (will be re-added clean)
  return src;
}, 'backend/src/index.js');

// ── 3. Fix services/stripe.js ─────────────────────────────────────────────────
fixFile(path.join(BACKEND, 'src/services/stripe.js'), (src) => {
  // Remove duplicate local stripe instantiation
  src = src.replace(/\nconst stripe\s*=\s*process\.env\.STRIPE_SECRET_KEY[\s\S]*?null\s*;\n/m, '\n');
  // Remove stray bare Stripe import (not from config)
  src = src.replace(/^import Stripe from ['"]stripe['"]\s*;?\n/m, '');
  return src;
}, 'backend/src/services/stripe.js');

// ── 4. Fix services/factory/stripe.js ────────────────────────────────────────
fixFile(path.join(BACKEND, 'src/services/factory/stripe.js'), (src) => {
  src = src.replace(/\nconst stripe\s*=\s*process\.env\.STRIPE_SECRET_KEY[\s\S]*?null\s*;\n/m, '\n');
  src = src.replace(/^import Stripe from ['"]stripe['"]\s*;?\n/m, '');
  return src;
}, 'backend/src/services/factory/stripe.js');

// ── 5. Fix routes/billing.js ──────────────────────────────────────────────────
fixFile(path.join(BACKEND, 'src/routes/billing.js'), (src) => {
  src = src.replace(/\nconst stripe\s*=\s*process\.env\.STRIPE_SECRET_KEY[\s\S]*?null\s*;\n/m, '\n');
  // Replace bare Stripe import with config import
  src = src.replace(/^import Stripe from ['"]stripe['"]\s*;?\n/m,
    "import { stripe } from '../config/stripe.js';\n");
  return src;
}, 'backend/src/routes/billing.js');

// ── 6. Fix ALL files importing prisma from index.js ──────────────────────────
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') walkDir(full);
    else if (e.isFile() && e.name.endsWith('.js')) {
      fixFile(full, (src) => {
        // ../index.js  or  ../../index.js  → config/prisma.js at correct depth
        src = src.replace(/from ['"]\.\.\/index\.js['"]/g, "from '../config/prisma.js'");
        src = src.replace(/from ['"]\.\.\/\.\.\/index\.js['"]/g, "from '../../config/prisma.js'");
        return src;
      }, path.relative(BACKEND, full));
    }
  }
}
walkDir(path.join(BACKEND, 'src'));

// ── 7. Fix integration test ───────────────────────────────────────────────────
fixFile(path.join(BACKEND, '__tests__/integration.test.js'), (src) => {
  // Add missing guards (idempotent — checks first)
  src = src.replace(
    /it\('rejects unauthenticated requests to protected routes',\s*async \(\) => \{\n(?!\s*if \(!TEST_DB_URL\))/,
    "it('rejects unauthenticated requests to protected routes', async () => {\n    if (!TEST_DB_URL) return;\n"
  );
  src = src.replace(
    /it\('rejects expired\/invalid tokens',\s*async \(\) => \{\n(?!\s*if \(!TEST_DB_URL\))/,
    "it('rejects expired/invalid tokens', async () => {\n    if (!TEST_DB_URL) return;\n"
  );
  return src;
}, 'backend/__tests__/integration.test.js');

// ── 8. Fix package.json postinstall ──────────────────────────────────────────
const pkgPath = path.join(BACKEND, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts.postinstall = `node -e 'require("fs").writeFileSync("node_modules/.prisma/client/package.json", "{\\"type\\":\\"commonjs\\"}")'`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('FIXED: backend/package.json');
fixed++;

console.log(`\nDone. 1 file created, ${fixed} file(s) modified.`);

// ── Helper ────────────────────────────────────────────────────────────────────
function fixFile(filePath, transform, label) {
  if (!fs.existsSync(filePath)) return;
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
    console.log(`FIXED: ${label}`);
    fixed++;
  }
}
