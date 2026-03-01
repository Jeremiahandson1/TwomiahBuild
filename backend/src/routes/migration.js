/**
 * FACTORY MIGRATION - API Routes
 * Mount on your Factory backend: app.use('/api/migration', migrationRouter)
 * 
 * Endpoints:
 *   POST /api/migration/preview   — upload CSV, get mapping + preview
 *   POST /api/migration/confirm   — apply a confirmed migration
 *   POST /api/migration/rollback  — undo a migration by ID
 *   GET  /api/migration/crms      — list supported CRMs
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { processMigrationFile } from '../services/csv-processor.js';
import { insertContacts, insertJobs, insertInvoices, rollbackMigration } from '../services/db-inserter.js';
import { CRM_REGISTRY } from '../config/crm-field-maps.js';

const router = express.Router();

// Multer — save uploads to /tmp/migrations/
const upload = multer({
  dest: '/tmp/migrations/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return cb(new Error('Only CSV files are accepted.'));
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────
// GET /api/migration/crms
// Returns list of supported CRMs for the wizard UI
// ─────────────────────────────────────────────
router.get('/crms', (req, res) => {
  const crms = Object.entries(CRM_REGISTRY).map(([key, crm]) => ({
    key,
    name: crm.name,
    logo: crm.logo,
    hasApi: crm.hasApi,
    exportInstructions: crm.exportInstructions,
  }));
  res.json({ crms });
});

// ─────────────────────────────────────────────
// POST /api/migration/preview
// Upload a CSV, returns field mapping + first 5 rows for preview
// Body (multipart): file, crmKey, entity
// ─────────────────────────────────────────────
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    const { crmKey, entity } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!crmKey) return res.status(400).json({ error: 'crmKey is required.' });
    if (!entity || !['contacts', 'jobs', 'invoices'].includes(entity)) {
      return res.status(400).json({ error: 'entity must be: contacts, jobs, or invoices.' });
    }

    const result = processMigrationFile({
      filePath: req.file.path,
      crmKey,
      entity,
    });

    // Store temp file path in session or return a temp ID so /confirm can use it
    const sessionId = uuidv4();
    fs.renameSync(req.file.path, `/tmp/migrations/${sessionId}.csv`);

    res.json({
      sessionId,
      crmKey,
      entity,
      summary: result.summary,
      mapping: result.mapping,
      preview: result.valid.slice(0, 5),    // first 5 valid rows
      errorSample: result.errors.slice(0, 5), // first 5 errors
    });

  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/migration/confirm
// Applies the migration after user reviews preview
// Body: { sessionId, crmKey, entity, columnMappingOverride? }
// Requires tenantDbUrl — pulled from tenant config, not from client
// ─────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  try {
    const { sessionId, crmKey, entity, columnMappingOverride } = req.body;

    if (!sessionId) return res.status(400).json({ error: 'sessionId required.' });

    const filePath = `/tmp/migrations/${sessionId}.csv`;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Session expired or file not found. Please re-upload.' });
    }

    // Get tenant DB URL from authenticated session/tenant config
    // In Factory, each tenant's DB URL is stored in the Factory master DB
    const tenantDbUrl = req.tenantDbUrl; // set by auth middleware
    if (!tenantDbUrl) return res.status(401).json({ error: 'Tenant DB not configured.' });

    const migrationId = uuidv4();

    // Process
    const result = processMigrationFile({
      filePath,
      crmKey,
      entity,
      columnMappingOverride: columnMappingOverride || null,
    });

    // Insert
    let insertResult;
    if (entity === 'contacts') {
      insertResult = await insertContacts(result.valid, tenantDbUrl);
    } else if (entity === 'jobs') {
      insertResult = await insertJobs(result.valid, tenantDbUrl);
    } else if (entity === 'invoices') {
      insertResult = await insertInvoices(result.valid, tenantDbUrl);
    }

    // Cleanup temp file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      migrationId,
      entity,
      inserted: insertResult.inserted,
      errors: insertResult.errors.length,
      errorDetail: insertResult.errors.slice(0, 10),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/migration/rollback
// Undo a migration by ID
// Body: { migrationId }
// ─────────────────────────────────────────────
router.post('/rollback', async (req, res) => {
  try {
    const { migrationId } = req.body;
    if (!migrationId) return res.status(400).json({ error: 'migrationId required.' });

    const tenantDbUrl = req.tenantDbUrl;
    if (!tenantDbUrl) return res.status(401).json({ error: 'Tenant not authenticated.' });

    const result = await rollbackMigration(migrationId, tenantDbUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
