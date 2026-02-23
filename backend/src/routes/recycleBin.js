/**
 * Recycle Bin Route
 * GET  /api/v1/recycle-bin         — list deleted records
 * POST /api/v1/recycle-bin/restore — restore a deleted record
 */
import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const RESTORABLE = {
  contact:   { model: 'contact',   label: 'Contact' },
  project:   { model: 'project',   label: 'Project' },
  job:       { model: 'job',       label: 'Job' },
  invoice:   { model: 'invoice',   label: 'Invoice' },
  quote:     { model: 'quote',     label: 'Quote' },
  expense:   { model: 'expense',   label: 'Expense' },
  document:  { model: 'document',  label: 'Document' },
  equipment: { model: 'equipment', label: 'Equipment' },
  vehicle:   { model: 'vehicle',   label: 'Vehicle' },
};

/**
 * GET /api/v1/recycle-bin
 * Returns all soft-deleted records across all models for this company
 * Sorted by deletedAt descending (most recently deleted first)
 */
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // Fetch deleted records from all models in parallel
    // Note: we explicitly set deletedAt: { not: null } to bypass the soft-delete middleware
    const [contacts, projects, jobs, invoices, quotes, expenses, documents, equipment, vehicles] = await Promise.all([
      prisma.contact.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.project.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.job.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.invoice.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, number: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.quote.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, name: true, number: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.expense.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, description: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.document.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.equipment.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
      prisma.vehicle.findMany({ where: { companyId, deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true }, orderBy: { deletedAt: 'desc' } }),
    ]);

    const allItems = [
      ...contacts.map(r => ({ ...r, type: 'contact', label: 'Contact', displayName: r.name })),
      ...projects.map(r => ({ ...r, type: 'project', label: 'Project', displayName: r.name })),
      ...jobs.map(r => ({ ...r, type: 'job', label: 'Job', displayName: r.title })),
      ...invoices.map(r => ({ ...r, type: 'invoice', label: 'Invoice', displayName: `Invoice #${r.number}` })),
      ...quotes.map(r => ({ ...r, type: 'quote', label: 'Quote', displayName: r.name || `Quote #${r.number}` })),
      ...expenses.map(r => ({ ...r, type: 'expense', label: 'Expense', displayName: r.description })),
      ...documents.map(r => ({ ...r, type: 'document', label: 'Document', displayName: r.name })),
      ...equipment.map(r => ({ ...r, type: 'equipment', label: 'Equipment', displayName: r.name })),
      ...vehicles.map(r => ({ ...r, type: 'vehicle', label: 'Vehicle', displayName: r.name })),
    ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    res.json({ items: allItems, total: allItems.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/recycle-bin/restore
 * Body: { type: 'contact'|'project'|..., id: string }
 * Restores a soft-deleted record by clearing deletedAt
 */
router.post('/restore', async (req, res, next) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) return res.status(400).json({ error: 'type and id are required' });

    const config = RESTORABLE[type];
    if (!config) return res.status(400).json({ error: `Unknown type: ${type}` });

    const model = prisma[config.model];
    const companyId = req.user.companyId;

    // Find the deleted record (bypass soft-delete middleware)
    const existing = await model.findFirst({
      where: { id, companyId, deletedAt: { not: null } },
    });
    if (!existing) return res.status(404).json({ error: `${config.label} not found in recycle bin` });

    // Restore it
    await model.update({
      where: { id },
      data: { deletedAt: null },
    });

    res.json({ success: true, message: `${config.label} restored successfully` });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/recycle-bin/purge
 * Permanently deletes all records deleted more than 30 days ago
 * Admin only
 */
router.delete('/purge', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const companyId = req.user.companyId;
    const oldFilter = { companyId, deletedAt: { not: null, lt: thirtyDaysAgo } };

    const results = await Promise.all(
      Object.values(RESTORABLE).map(({ model }) =>
        prisma[model].deleteMany({ where: oldFilter }).catch(() => ({ count: 0 }))
      )
    );

    const total = results.reduce((sum, r) => sum + (r.count || 0), 0);
    res.json({ success: true, purged: total });
  } catch (err) {
    next(err);
  }
});

export default router;
