/**
 * Offline-First Database
 *
 * Single persistent database file "buildpro.db" with versioned migrations.
 * On startup, runs any pending migrations in order — never wipes existing data.
 * Add new changes by appending a new migration to the MIGRATIONS array.
 *
 * NOTE: SQLite is unavailable in Expo Go. All DB calls are no-ops there.
 */

import * as SQLite from 'expo-sqlite';
import Constants from 'expo-constants';

let db: SQLite.SQLiteDatabase | null = null;
let dbUnavailable = false;

const isExpoGo = Constants.appOwnership === 'expo';

// ─── Migrations ────────────────────────────────────────────────────────────
// Each entry is { version: number, sql: string[] }
// NEVER edit existing migrations. Only append new ones.

const MIGRATIONS: { version: number; sql: string[] }[] = [
  {
    version: 1,
    sql: [
      `PRAGMA journal_mode = WAL`,
      `PRAGMA foreign_keys = ON`,
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        operation   TEXT    NOT NULL,
        entity_type TEXT    NOT NULL,
        entity_id   TEXT    NOT NULL,
        payload     TEXT    NOT NULL,
        attempts    INTEGER NOT NULL DEFAULT 0,
        last_error  TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS session (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS jobs (
        id           TEXT PRIMARY KEY,
        server_id    TEXT,
        name         TEXT NOT NULL,
        number       TEXT,
        address      TEXT,
        contact_name TEXT,
        start_date   TEXT,
        description  TEXT,
        status       TEXT NOT NULL DEFAULT 'active',
        synced_at    TEXT,
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS time_entries (
        id          TEXT PRIMARY KEY,
        server_id   TEXT,
        job_id      TEXT,
        user_id     TEXT NOT NULL DEFAULT 'local',
        clock_in    TEXT NOT NULL,
        clock_out   TEXT,
        duration    INTEGER,
        latitude    REAL,
        longitude   REAL,
        notes       TEXT,
        status      TEXT NOT NULL DEFAULT 'active',
        synced      INTEGER NOT NULL DEFAULT 0,
        synced_at   TEXT,
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS daily_logs (
        id              TEXT PRIMARY KEY,
        server_id       TEXT,
        job_id          TEXT NOT NULL,
        user_id         TEXT NOT NULL DEFAULT 'local',
        log_date        TEXT NOT NULL,
        weather         TEXT,
        temperature     TEXT,
        workers_on_site INTEGER DEFAULT 0,
        work_performed  TEXT,
        delays          TEXT,
        notes           TEXT,
        synced          INTEGER NOT NULL DEFAULT 0,
        synced_at       TEXT,
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS photos (
        id              TEXT PRIMARY KEY,
        server_id       TEXT,
        job_id          TEXT NOT NULL,
        user_id         TEXT NOT NULL DEFAULT 'local',
        local_uri       TEXT NOT NULL DEFAULT '',
        caption         TEXT,
        upload_progress INTEGER NOT NULL DEFAULT 0,
        synced          INTEGER NOT NULL DEFAULT 0,
        latitude        REAL,
        longitude       REAL,
        taken_at        TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at       TEXT,
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id          TEXT PRIMARY KEY,
        server_id   TEXT,
        job_id      TEXT NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        status      TEXT NOT NULL DEFAULT 'pending',
        synced_at   TEXT,
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  // Future migrations go here, e.g.:
  // {
  //   version: 2,
  //   sql: [`ALTER TABLE jobs ADD COLUMN priority TEXT DEFAULT 'normal'`],
  // },
];

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations tracking table if it doesn't exist
  await database.runAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)`
  );

  // Find which versions have already run
  const applied = await database.getAllAsync<{ version: number }>(
    `SELECT version FROM schema_migrations ORDER BY version ASC`
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  // Run pending migrations in order
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    console.log(`[DB] Running migration v${migration.version}`);
    await database.withTransactionAsync(async () => {
      for (const sql of migration.sql) {
        await database.runAsync(sql);
      }
      await database.runAsync(
        `INSERT INTO schema_migrations (version) VALUES (?)`,
        [migration.version]
      );
    });
    console.log(`[DB] Migration v${migration.version} complete`);
  }
}

// ─── Core DB Access ────────────────────────────────────────────────────────

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbUnavailable) throw new Error('SQLite unavailable in Expo Go');
  if (db) return db;

  if (isExpoGo) {
    dbUnavailable = true;
    console.warn('[DB] SQLite disabled in Expo Go — app runs in online-only mode');
    throw new Error('SQLite unavailable in Expo Go');
  }

  try {
    db = await SQLite.openDatabaseAsync('buildpro.db');
    await runMigrations(db);
  } catch (err: any) {
    dbUnavailable = true;
    console.error('[DB] SQLite unavailable — offline features disabled:', err.message);
    throw err;
  }
  return db;
}

export async function getDatabaseSafe(): Promise<SQLite.SQLiteDatabase | null> {
  try {
    return await getDatabase();
  } catch {
    return null;
  }
}

// ─── Sync Queue ────────────────────────────────────────────────────────────

export interface SyncOperation {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'UPLOAD';
  endpoint: string;
  body: Record<string, unknown>;
  localId?: string;
  entityType: string;
}

export async function enqueueSync(op: SyncOperation): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return;
  await database.runAsync(
    `INSERT INTO sync_queue (operation, entity_type, entity_id, payload)
     VALUES (?, ?, ?, ?)`,
    [op.method, op.entityType, op.localId ?? '', JSON.stringify(op)]
  );
}

export interface SyncQueueItem {
  id: number;
  operation: string;
  entity_type: string;
  entity_id: string;
  payload: string;
  attempts: number;
}

export async function getPendingSync(): Promise<SyncQueueItem[]> {
  const database = await getDatabaseSafe();
  if (!database) return [];
  return database.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE attempts < 5 ORDER BY created_at ASC LIMIT 50`
  );
}

export async function markSyncComplete(id: number): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return;
  await database.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

export async function markSyncFailed(id: number, error: string): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return;
  await database.runAsync(
    `UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [error, id]
  );
}

export async function resetFailedSync(): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return;
  await database.runAsync(`UPDATE sync_queue SET attempts = 0 WHERE attempts >= 5`);
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await getDatabaseSafe();
  if (!database) return 0;
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue`
  );
  return result?.count ?? 0;
}

// ─── Session ───────────────────────────────────────────────────────────────

export interface SessionData {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
}

export async function saveSession(data: SessionData): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return;
  const entries: [string, string][] = [
    ['user_id', data.userId || ''],
    ['company_id', data.companyId || ''],
    ['name', data.name || ''],
    ['email', data.email || ''],
    ['role', data.role || ''],
  ];
  for (const [key, value] of entries) {
    await database.runAsync(
      `INSERT OR REPLACE INTO session (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }
}

export async function getSession(): Promise<Record<string, string> | null> {
  const database = await getDatabaseSafe();
  if (!database) return null;
  try {
    const rows = await database.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM session`
    );
    if (!rows.length) return null;
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return;
  await database.runAsync(`DELETE FROM session`).catch(() => {});
}
