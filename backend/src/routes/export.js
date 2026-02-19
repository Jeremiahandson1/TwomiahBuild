import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import exportService from '../services/export.js';
import audit from '../services/audit.js';

const router = Router();
router.use(authenticate);

// Get available export types
router.get('/types', (req, res) => {
  res.json({
    types: exportService.getExportTypes(),
  });
});

// Get fields for a type
router.get('/fields/:type', (req, res) => {
  const fields = exportService.getExportFields(req.params.type);
  if (!fields) {
    return res.status(404).json({ error: 'Unknown export type' });
  }
  res.json({ fields });
});

// Export to CSV
router.get('/:type/csv', requirePermission('dashboard:read'), async (req, res, next) => {
  try {
    const { type } = req.params;
    const { status, startDate, endDate, contactId, projectId, limit } = req.query;

    const result = await exportService.exportToCSV(type, req.user.companyId, {
      status,
      startDate,
      endDate,
      contactId,
      projectId,
      limit: limit ? parseInt(limit) : undefined,
    });

    // Log export
    audit.log({
      action: audit.ACTIONS.EXPORT,
      entity: type,
      entityName: `${result.count} records`,
      metadata: { format: 'csv', filters: req.query },
      req,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    if (error.message.includes('Unknown entity')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Export to Excel
router.get('/:type/excel', requirePermission('dashboard:read'), async (req, res, next) => {
  try {
    const { type } = req.params;
    const { status, startDate, endDate, contactId, projectId, limit } = req.query;

    const result = await exportService.exportToExcel(type, req.user.companyId, {
      status,
      startDate,
      endDate,
      contactId,
      projectId,
      limit: limit ? parseInt(limit) : undefined,
    });

    // Log export
    audit.log({
      action: audit.ACTIONS.EXPORT,
      entity: type,
      entityName: `${result.count} records`,
      metadata: { format: 'excel', filters: req.query },
      req,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    if (error.message.includes('Unknown entity')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;

// ── Full data export (portability guarantee) ──────────────────────────────────
import archiver from 'archiver';
import { prisma } from '../index.js';

/**
 * GET /api/v1/export/full-backup
 *
 * Generates a complete ZIP export of all company data:
 *   - contacts.csv
 *   - jobs.csv
 *   - projects.csv
 *   - invoices.csv
 *   - quotes.csv
 *   - expenses.csv
 *   - company-info.json
 *   - README.txt
 *
 * This is the "you own your data" feature — positioned as
 * a direct response to Buildertrend's data hostage problem.
 */
router.get('/full-backup', requirePermission('dashboard:read'), async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const [company, contacts, jobs, projects, invoices, quotes, expenses] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, createdAt: true } }),
      prisma.contact.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } }),
      prisma.job.findMany({ where: { companyId }, include: { contact: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.project.findMany({ where: { companyId }, include: { contact: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.invoice.findMany({ where: { companyId }, include: { contact: { select: { name: true } }, lineItems: true }, orderBy: { createdAt: 'desc' } }),
      prisma.quote.findMany({ where: { companyId }, include: { contact: { select: { name: true } }, lineItems: true }, orderBy: { createdAt: 'desc' } }),
      prisma.expense.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    ]);

    const toCSV = (rows, fields) => {
      if (!rows.length) return fields.join(',') + '\n';
      const header = fields.join(',');
      const body = rows.map(row =>
        fields.map(f => {
          const val = f.includes('.') ? f.split('.').reduce((o, k) => o?.[k], row) : row[f];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      ).join('\n');
      return header + '\n' + body;
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${(company?.name || 'company').replace(/[^a-z0-9]/gi, '-')}-export-${dateStr}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    // Contacts
    archive.append(toCSV(contacts, ['id', 'name', 'company', 'email', 'phone', 'type', 'status', 'address', 'notes', 'createdAt']), { name: 'contacts.csv' });

    // Jobs
    archive.append(toCSV(jobs, ['id', 'name', 'number', 'status', 'contact.name', 'address', 'startDate', 'endDate', 'budget', 'description', 'createdAt']), { name: 'jobs.csv' });

    // Projects
    if (projects.length) {
      archive.append(toCSV(projects, ['id', 'name', 'number', 'status', 'contact.name', 'address', 'startDate', 'endDate', 'budget', 'description', 'createdAt']), { name: 'projects.csv' });
    }

    // Invoices
    archive.append(toCSV(invoices, ['id', 'number', 'status', 'contact.name', 'subtotal', 'taxAmount', 'total', 'balance', 'amountPaid', 'dueDate', 'paidAt', 'createdAt']), { name: 'invoices.csv' });

    // Quotes
    archive.append(toCSV(quotes, ['id', 'number', 'status', 'contact.name', 'subtotal', 'taxAmount', 'total', 'expiryDate', 'createdAt']), { name: 'quotes.csv' });

    // Expenses
    if (expenses.length) {
      archive.append(toCSV(expenses, ['id', 'description', 'amount', 'category', 'date', 'vendor', 'notes', 'createdAt']), { name: 'expenses.csv' });
    }

    // Company info
    archive.append(JSON.stringify({ company, exportedAt: new Date().toISOString(), recordCounts: { contacts: contacts.length, jobs: jobs.length, projects: projects.length, invoices: invoices.length, quotes: quotes.length, expenses: expenses.length } }, null, 2), { name: 'company-info.json' });

    // README
    archive.append(
      `BuildPro Data Export\n${'='.repeat(40)}\nExported: ${new Date().toLocaleString()}\nCompany: ${company?.name}\n\nFILES:\n  contacts.csv    — All contacts and leads\n  jobs.csv        — All jobs/work orders\n  projects.csv    — All projects (if applicable)\n  invoices.csv    — All invoices\n  quotes.csv      — All quotes/estimates\n  expenses.csv    — All expenses\n  company-info.json — Company details and record counts\n\nThis export contains all your BuildPro data.\nYou own it. Import it anywhere.\n`,
      { name: 'README.txt' }
    );

    await audit.log(companyId, req.user.userId, 'export', 'full_backup', null, {
      recordCounts: { contacts: contacts.length, jobs: jobs.length, invoices: invoices.length },
    });

    archive.finalize();
  } catch (err) { next(err); }
});
