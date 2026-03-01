/**
 * FACTORY MIGRATION - DB Inserter
 * 
 * Takes validated, normalized rows and bulk-inserts them
 * into the correct tenant's database tables.
 * 
 * Designed for Render PostgreSQL.
 * Handles duplicates via upsert on natural keys.
 */

import pg from 'pg';
const { Pool } = pg;

// ─────────────────────────────────────────────
// GET TENANT DB CONNECTION
// Factory tenants each have their own DB_URL env var
// or we can use a single multi-tenant DB with tenant_id
// ─────────────────────────────────────────────
function getTenantPool(tenantDbUrl) {
  return new Pool({ connectionString: tenantDbUrl, ssl: { rejectUnauthorized: false } });
}

// ─────────────────────────────────────────────
// INSERT CONTACTS
// ─────────────────────────────────────────────
export async function insertContacts(rows, tenantDbUrl) {
  const pool = getTenantPool(tenantDbUrl);
  const results = { inserted: 0, updated: 0, errors: [] };

  for (const row of rows) {
    try {
      await pool.query(`
        INSERT INTO contacts (
          first_name, last_name, email, phone,
          address_street, address_city, address_state, address_zip,
          company, type, status, notes, tags,
          created_at, imported_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (email) DO UPDATE SET
          first_name    = EXCLUDED.first_name,
          last_name     = EXCLUDED.last_name,
          phone         = COALESCE(EXCLUDED.phone, contacts.phone),
          address_street = COALESCE(EXCLUDED.address_street, contacts.address_street),
          address_city  = COALESCE(EXCLUDED.address_city, contacts.address_city),
          address_state = COALESCE(EXCLUDED.address_state, contacts.address_state),
          address_zip   = COALESCE(EXCLUDED.address_zip, contacts.address_zip),
          company       = COALESCE(EXCLUDED.company, contacts.company),
          status        = COALESCE(EXCLUDED.status, contacts.status),
          notes         = COALESCE(EXCLUDED.notes, contacts.notes),
          tags          = COALESCE(EXCLUDED.tags, contacts.tags),
          updated_at    = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        row.first_name, row.last_name, row.email || null, row.phone || null,
        row.address_street || null, row.address_city || null, row.address_state || null, row.address_zip || null,
        row.company || null, row.type || 'contact', row.status || 'lead',
        row.notes || null, row.tags || null,
        row.created_at || null,
      ]);

      results.inserted++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }

  await pool.end();
  return results;
}

// ─────────────────────────────────────────────
// INSERT JOBS
// ─────────────────────────────────────────────
export async function insertJobs(rows, tenantDbUrl) {
  const pool = getTenantPool(tenantDbUrl);
  const results = { inserted: 0, updated: 0, errors: [] };

  for (const row of rows) {
    try {
      // Resolve contact_id from email or name
      let contactId = null;
      if (row.contact_email) {
        const res = await pool.query('SELECT id FROM contacts WHERE email = $1 LIMIT 1', [row.contact_email]);
        if (res.rows.length > 0) contactId = res.rows[0].id;
      }
      if (!contactId && row.contact_name) {
        const [firstName, ...lastParts] = row.contact_name.split(' ');
        const res = await pool.query(
          'SELECT id FROM contacts WHERE first_name ILIKE $1 AND last_name ILIKE $2 LIMIT 1',
          [firstName, lastParts.join(' ') || '%']
        );
        if (res.rows.length > 0) contactId = res.rows[0].id;
      }

      await pool.query(`
        INSERT INTO jobs (
          title, contact_id, status, type, description,
          start_date, end_date, value,
          address_street, address_city, address_state, address_zip,
          notes, created_at, imported_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (title, contact_id) DO UPDATE SET
          status      = EXCLUDED.status,
          value       = COALESCE(EXCLUDED.value, jobs.value),
          start_date  = COALESCE(EXCLUDED.start_date, jobs.start_date),
          end_date    = COALESCE(EXCLUDED.end_date, jobs.end_date),
          notes       = COALESCE(EXCLUDED.notes, jobs.notes),
          updated_at  = NOW()
      `, [
        row.title, contactId, row.status || 'active', row.type || null, row.description || null,
        row.start_date || null, row.end_date || null, row.value || null,
        row.address_street || null, row.address_city || null, row.address_state || null, row.address_zip || null,
        row.notes || null, row.created_at || null,
      ]);

      results.inserted++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }

  await pool.end();
  return results;
}

// ─────────────────────────────────────────────
// INSERT INVOICES
// ─────────────────────────────────────────────
export async function insertInvoices(rows, tenantDbUrl) {
  const pool = getTenantPool(tenantDbUrl);
  const results = { inserted: 0, updated: 0, errors: [] };

  for (const row of rows) {
    try {
      let contactId = null;
      if (row.contact_email) {
        const res = await pool.query('SELECT id FROM contacts WHERE email = $1 LIMIT 1', [row.contact_email]);
        if (res.rows.length > 0) contactId = res.rows[0].id;
      }

      let jobId = null;
      if (row.job_title && contactId) {
        const res = await pool.query(
          'SELECT id FROM jobs WHERE title ILIKE $1 AND contact_id = $2 LIMIT 1',
          [row.job_title, contactId]
        );
        if (res.rows.length > 0) jobId = res.rows[0].id;
      }

      await pool.query(`
        INSERT INTO invoices (
          invoice_number, contact_id, job_id,
          amount, paid_amount, status,
          issue_date, due_date, paid_date,
          notes, imported_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
        ON CONFLICT (invoice_number) DO UPDATE SET
          status      = EXCLUDED.status,
          paid_amount = COALESCE(EXCLUDED.paid_amount, invoices.paid_amount),
          paid_date   = COALESCE(EXCLUDED.paid_date, invoices.paid_date),
          updated_at  = NOW()
      `, [
        row.invoice_number || null, contactId, jobId,
        row.amount, row.paid_amount || 0, row.status || 'sent',
        row.issue_date || null, row.due_date || null, row.paid_date || null,
        row.notes || null,
      ]);

      results.inserted++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }

  await pool.end();
  return results;
}

// ─────────────────────────────────────────────
// ROLLBACK MIGRATION
// Deletes all records flagged with the migration batch ID
// ─────────────────────────────────────────────
export async function rollbackMigration(migrationId, tenantDbUrl) {
  const pool = getTenantPool(tenantDbUrl);
  try {
    await pool.query('DELETE FROM contacts WHERE migration_id = $1', [migrationId]);
    await pool.query('DELETE FROM jobs WHERE migration_id = $1', [migrationId]);
    await pool.query('DELETE FROM invoices WHERE migration_id = $1', [migrationId]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    await pool.end();
  }
}

export default { insertContacts, insertJobs, insertInvoices, rollbackMigration };
