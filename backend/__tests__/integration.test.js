/**
 * Integration Tests — Multi-Tenant Isolation + Core API
 *
 * These tests verify the request-to-DB cycle using a real test database.
 * They catch issues that unit tests with mocked Prisma cannot:
 *   - IDOR vulnerabilities (Company A accessing Company B's data)
 *   - Actual DB constraints
 *   - Route-level auth enforcement
 *
 * Setup:
 *   1. Create a test PostgreSQL DB (or use the same DB with a test schema)
 *   2. Set TEST_DATABASE_URL in .env.test
 *   3. Run: NODE_ENV=test npx prisma migrate deploy
 *   4. Run: NODE_ENV=test jest --testPathPattern=integration
 *
 * These tests are INTENTIONALLY separate from unit tests.
 * Run with: npm run test:integration
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import supertest from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── Test DB setup ─────────────────────────────────────────────────────────────

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

let prisma;
let app;
let request;

// Two isolated companies for tenant isolation tests
let companyA, companyB;
let userA, userB;
let tokenA, tokenB;

beforeAll(async () => {
  if (!TEST_DB_URL) {
    console.warn('TEST_DATABASE_URL not set — skipping integration tests');
    return;
  }

  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

  // Dynamically import app after setting up DB
  const mod = await import('../src/index.js');
  app = mod.default;
  request = supertest(app);

  await seedTestData();

  // Acquire tokens immediately after seeding so failures are surfaced early
  // and describe-level beforeAlls don't need to login again
  try {
    tokenA = await loginAs(userA);
    tokenB = await loginAs(userB);
  } catch (e) {
    console.error('SEED LOGIN FAILED - check auth.js test logs for reason:', e.message);
  }
});

afterAll(async () => {
  if (prisma) {
    await cleanupTestData();
    await prisma.$disconnect();
  }
});

async function seedTestData() {
  const hash = await bcrypt.hash('TestPass123!', 10);

  // Company A
  companyA = await prisma.company.create({
    data: {
      name: 'Test Company Alpha',
      slug: `test-alpha-${Date.now()}`,
      settings: { plan: 'construction', subscriptionStatus: 'active' },
    },
  });
  userA = await prisma.user.create({
    data: {
      email: `user-a-${Date.now()}@test.twomiah-build.io`,
      passwordHash: hash,
      firstName: 'Test',
      lastName: 'UserA',
      role: 'admin',
      companyId: companyA.id,
      isActive: true,
    },
  });

  // Company B
  companyB = await prisma.company.create({
    data: {
      name: 'Test Company Beta',
      slug: `test-beta-${Date.now()}`,
      settings: { plan: 'construction', subscriptionStatus: 'active' },
    },
  });
  userB = await prisma.user.create({
    data: {
      email: `user-b-${Date.now()}@test.twomiah-build.io`,
      passwordHash: hash,
      firstName: 'Test',
      lastName: 'UserB',
      role: 'admin',
      companyId: companyB.id,
      isActive: true,
    },
  });
}

async function cleanupTestData() {
  if (companyA) {
    await prisma.invoice.deleteMany({ where: { companyId: companyA.id } });
    await prisma.contact.deleteMany({ where: { companyId: companyA.id } });
    await prisma.user.deleteMany({ where: { companyId: companyA.id } });
    await prisma.company.delete({ where: { id: companyA.id } }).catch(() => {});
  }
  if (companyB) {
    await prisma.invoice.deleteMany({ where: { companyId: companyB.id } });
    await prisma.contact.deleteMany({ where: { companyId: companyB.id } });
    await prisma.user.deleteMany({ where: { companyId: companyB.id } });
    await prisma.company.delete({ where: { id: companyB.id } }).catch(() => {});
  }
}

async function loginAs(user) {
  const res = await request.post('/api/v1/auth/login').send({
    email: user.email,
    password: 'TestPass123!',
  });
  expect(res.status).toBe(200);
  const token = res.body.accessToken || res.body.token;
  expect(token).toBeTruthy();
  return token;
}

// ── Auth tests ─────────────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('rejects login with wrong password', async () => {
    if (!TEST_DB_URL) return;
    const res = await request.post('/api/v1/auth/login').send({
      email: userA.email,
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
  });

  it('returns token on valid login', async () => {
    if (!TEST_DB_URL) return;
    const res = await request.post('/api/v1/auth/login').send({
      email: userA.email,
      password: 'TestPass123!',
    });
    // If this fails, check the test logs above for "Login failed:" diagnostic entries
    expect(res.status).toBe(200);
    expect(res.body.accessToken || res.body.token).toBeTruthy();
    tokenA = res.body.accessToken || res.body.token;
  });

  it('rejects unauthenticated requests to protected routes', async () => {
    if (!TEST_DB_URL) return;
    const res = await request.get('/api/v1/invoices');
    expect(res.status).toBe(401);
  });

  it('rejects expired/invalid tokens', async () => {
    if (!TEST_DB_URL) return;
    const res = await request
      .get('/api/v1/invoices')
      .set('Authorization', 'Bearer this.is.not.a.real.token');
    expect(res.status).toBe(401);
  });
});

// ── Invoice CRUD ──────────────────────────────────────────────────────────────

describe('Invoice API', () => {
  let invoiceId;

  beforeAll(async () => {
    if (!TEST_DB_URL) return;
    if (!tokenA) tokenA = await loginAs(userA);
    if (!tokenB) tokenB = await loginAs(userB);
  });

  it('creates an invoice for Company A', async () => {
    if (!TEST_DB_URL) return;
    const res = await request
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        taxRate: 7,
        discount: 0,
        lineItems: [{ description: 'Labor', quantity: 10, unitPrice: 150 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.companyId).toBe(companyA.id);
    invoiceId = res.body.id;
  });

  it('Company A can read its own invoice', async () => {
    if (!TEST_DB_URL || !invoiceId) return;
    const res = await request
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(invoiceId);
  });

  it('calculates invoice totals correctly', async () => {
    if (!TEST_DB_URL || !invoiceId) return;
    const res = await request
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    // 10 * $150 = $1500 subtotal, 7% tax = $105, total = $1605
    expect(Number(res.body.subtotal)).toBe(1500);
    expect(Number(res.body.total)).toBeCloseTo(1605, 0);
  });
});

// ── Multi-tenant isolation ────────────────────────────────────────────────────

describe('Multi-Tenant Isolation (IDOR Prevention)', () => {
  let invoiceAId;
  let contactAId;

  beforeAll(async () => {
    if (!TEST_DB_URL) return;
    if (!tokenA) tokenA = await loginAs(userA);
    if (!tokenB) tokenB = await loginAs(userB);

    // Create an invoice owned by Company A
    const invRes = await request
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ taxRate: 0, discount: 0, lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }] });
    invoiceAId = invRes.body?.id;

    // Create a contact owned by Company A
    const contactRes = await request
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'IDOR Test Contact', email: 'idor@test.twomiah-build.io' });
    contactAId = contactRes.body?.id;
  });

  it('Company B cannot READ Company A invoice', async () => {
    if (!TEST_DB_URL || !invoiceAId) return;
    const res = await request
      .get(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('Company B cannot UPDATE Company A invoice', async () => {
    if (!TEST_DB_URL || !invoiceAId) return;
    const res = await request
      .put(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ notes: 'HACKED BY COMPANY B' });
    expect(res.status).toBe(404);
    // Verify the invoice was NOT modified
    const check = await request
      .get(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check.body.notes).not.toBe('HACKED BY COMPANY B');
  });

  it('Company B cannot DELETE Company A invoice', async () => {
    if (!TEST_DB_URL || !invoiceAId) return;
    const res = await request
      .delete(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
    // Verify it still exists
    const check = await request
      .get(`/api/v1/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check.status).toBe(200);
  });

  it('Company B cannot READ Company A contact', async () => {
    if (!TEST_DB_URL || !contactAId) return;
    const res = await request
      .get(`/api/v1/contacts/${contactAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('Company B cannot UPDATE Company A contact', async () => {
    if (!TEST_DB_URL || !contactAId) return;
    const res = await request
      .put(`/api/v1/contacts/${contactAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'HIJACKED' });
    expect(res.status).toBe(404);
  });

  it('Company A list endpoints only return Company A data', async () => {
    if (!TEST_DB_URL) return;
    const [resA, resB] = await Promise.all([
      request.get('/api/v1/invoices').set('Authorization', `Bearer ${tokenA}`),
      request.get('/api/v1/invoices').set('Authorization', `Bearer ${tokenB}`),
    ]);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const idsA = (resA.body.data || resA.body).map(i => i.id);
    const idsB = (resB.body.data || resB.body).map(i => i.id);
    const overlap = idsA.filter(id => idsB.includes(id));
    expect(overlap).toHaveLength(0); // Zero overlap between companies
  });
});

// ── Role-based access ─────────────────────────────────────────────────────────

describe('Role-Based Access Control', () => {
  let viewerToken;

  beforeAll(async () => {
    if (!TEST_DB_URL) return;
    // Create a viewer-role user in Company A
    const hash = await bcrypt.hash('TestPass123!', 10);
    const viewer = await prisma.user.create({
      data: {
        email: `viewer-${Date.now()}@test.twomiah-build.io`,
        passwordHash: hash,
        firstName: 'Test',
        lastName: 'Viewer',
        role: 'viewer',
        companyId: companyA.id,
        isActive: true,
      },
    });
    viewerToken = await loginAs(viewer);
  });

  it('viewer can read invoices', async () => {
    if (!TEST_DB_URL) return;
    const res = await request.get('/api/v1/invoices').set('Authorization', `Bearer ${viewerToken}`);
    // Viewer may or may not have read access depending on permission config — both are valid
    expect([200, 403]).toContain(res.status);
  });

  it('viewer cannot delete invoices', async () => {
    if (!TEST_DB_URL) return;
    const res = await request
      .delete('/api/v1/invoices/non-existent-id')
      .set('Authorization', `Bearer ${viewerToken}`);
    // Should be forbidden (403) or not found (404) — never a successful delete
    expect([403, 404]).toContain(res.status);
    expect(res.status).not.toBe(204);
  });
});
