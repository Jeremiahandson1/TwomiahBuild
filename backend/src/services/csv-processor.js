/**
 * FACTORY MIGRATION - CSV Parser & Field Normalizer
 * 
 * Takes an uploaded CSV and a CRM field map config,
 * auto-maps columns to canonical schema, validates, and returns
 * normalized rows ready for DB insertion.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { CRM_REGISTRY, CANONICAL_FIELDS } from '../config/crm-field-maps.js';

// ─────────────────────────────────────────────
// AUTO-DETECT COLUMNS
// Tries to match each header in the uploaded CSV
// to a canonical field using the CRM's field map.
// Returns a mapping: { canonicalField → csvColumn }
// ─────────────────────────────────────────────
export function autoMapColumns(csvHeaders, crmKey, entity) {
  const crm = CRM_REGISTRY[crmKey];
  if (!crm) throw new Error(`Unknown CRM: ${crmKey}`);

  const fieldMap = crm.entities[entity];
  if (!fieldMap) throw new Error(`CRM ${crmKey} has no entity config for: ${entity}`);

  const mapping = {};
  const unmapped = [];

  // Normalize headers for comparison
  const normalizedHeaders = csvHeaders.map(h => ({ original: h, normalized: h.trim().toLowerCase() }));

  for (const [canonicalField, possibleNames] of Object.entries(fieldMap)) {
    let found = false;
    for (const possible of possibleNames) {
      const match = normalizedHeaders.find(h => h.normalized === possible.toLowerCase());
      if (match) {
        mapping[canonicalField] = match.original;
        found = true;
        break;
      }
    }
    if (!found) {
      unmapped.push(canonicalField);
    }
  }

  // Also collect any CSV columns that didn't match anything
  const mappedCsvCols = new Set(Object.values(mapping));
  const extraCsvCols = csvHeaders.filter(h => !mappedCsvCols.has(h));

  return { mapping, unmapped, extraCsvCols };
}

// ─────────────────────────────────────────────
// PARSE CSV FILE
// Returns raw rows as array of objects with original headers
// ─────────────────────────────────────────────
export function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // handle Excel BOM
  });
  return rows;
}

// ─────────────────────────────────────────────
// NORMALIZE ROW
// Applies column mapping to transform a raw CSV row
// into a canonical-schema object
// ─────────────────────────────────────────────
export function normalizeRow(rawRow, columnMapping, entity) {
  const normalized = {};

  for (const [canonicalField, csvColumn] of Object.entries(columnMapping)) {
    if (csvColumn && rawRow[csvColumn] !== undefined) {
      normalized[canonicalField] = cleanValue(canonicalField, rawRow[csvColumn]);
    }
  }

  return normalized;
}

// ─────────────────────────────────────────────
// CLEAN VALUE
// Type coercion and normalization per field type
// ─────────────────────────────────────────────
function cleanValue(fieldName, value) {
  if (value === null || value === undefined || value === '') return null;

  const str = String(value).trim();

  // Dates
  if (fieldName.endsWith('_at') || fieldName.endsWith('_date')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Money
  if (['value', 'amount', 'paid_amount'].includes(fieldName)) {
    const cleaned = str.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // Phone — strip to digits only, store formatted
  if (fieldName === 'phone') {
    const digits = str.replace(/\D/g, '');
    if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    return str; // return as-is if can't parse
  }

  // Email — lowercase
  if (fieldName === 'email') return str.toLowerCase();

  // Status normalization
  if (fieldName === 'status') return normalizeStatus(str);

  // Tags — split on comma
  if (fieldName === 'tags') return str.split(',').map(t => t.trim()).filter(Boolean).join(',');

  return str;
}

// ─────────────────────────────────────────────
// STATUS NORMALIZER
// Maps various CRM status strings to Factory canonical statuses
// ─────────────────────────────────────────────
function normalizeStatus(raw) {
  const lower = raw.toLowerCase();

  const statusMap = {
    // Contacts / Leads
    lead: ['lead', 'prospect', 'new lead', 'unqualified', 'inquiry'],
    client: ['client', 'customer', 'active client', 'active customer', 'won'],
    inactive: ['inactive', 'lost', 'archived', 'closed lost', 'disqualified'],

    // Jobs
    active: ['active', 'in progress', 'in-progress', 'started', 'open', 'work in progress'],
    completed: ['completed', 'complete', 'done', 'closed won', 'finished', 'closed'],
    cancelled: ['cancelled', 'canceled', 'void', 'voided'],

    // Invoices
    paid: ['paid', 'payment received', 'collected'],
    sent: ['sent', 'open', 'unpaid', 'outstanding'],
    overdue: ['overdue', 'past due', 'late'],
    draft: ['draft', 'pending'],
  };

  for (const [canonical, variants] of Object.entries(statusMap)) {
    if (variants.some(v => lower.includes(v))) return canonical;
  }

  return raw; // keep original if no match
}

// ─────────────────────────────────────────────
// VALIDATE ROWS
// Checks required fields are present, flags errors
// Returns { valid: [], errors: [] }
// ─────────────────────────────────────────────
const REQUIRED_FIELDS = {
  contacts: ['first_name', 'last_name'],
  jobs:     ['title'],
  invoices: ['amount'],
};

export function validateRows(normalizedRows, entity) {
  const valid = [];
  const errors = [];
  const required = REQUIRED_FIELDS[entity] || [];

  normalizedRows.forEach((row, index) => {
    const rowErrors = [];

    for (const field of required) {
      if (!row[field]) {
        rowErrors.push(`Missing required field: ${field}`);
      }
    }

    // Email format check
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      rowErrors.push(`Invalid email: ${row.email}`);
    }

    if (rowErrors.length > 0) {
      errors.push({ rowIndex: index + 2, row, errors: rowErrors }); // +2 for header + 1-index
    } else {
      valid.push(row);
    }
  });

  return { valid, errors };
}

// ─────────────────────────────────────────────
// FULL PIPELINE
// parseCSV → autoMap → normalize → validate
// ─────────────────────────────────────────────
export function processMigrationFile({ filePath, crmKey, entity, columnMappingOverride = null }) {
  // 1. Parse raw CSV
  const rawRows = parseCSV(filePath);
  if (rawRows.length === 0) throw new Error('CSV file is empty or has no data rows.');

  const csvHeaders = Object.keys(rawRows[0]);

  // 2. Auto-map columns (or use manual override from wizard UI)
  const { mapping, unmapped, extraCsvCols } = columnMappingOverride
    ? { mapping: columnMappingOverride, unmapped: [], extraCsvCols: [] }
    : autoMapColumns(csvHeaders, crmKey, entity);

  // 3. Normalize all rows
  const normalizedRows = rawRows.map(row => normalizeRow(row, mapping, entity));

  // 4. Validate
  const { valid, errors } = validateRows(normalizedRows, entity);

  return {
    summary: {
      totalRows: rawRows.length,
      validRows: valid.length,
      errorRows: errors.length,
      unmappedCanonicalFields: unmapped,
      extraCsvColumns: extraCsvCols,
    },
    mapping,
    valid,
    errors,
  };
}

export default { processMigrationFile, autoMapColumns, parseCSV, normalizeRow, validateRows };
