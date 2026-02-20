/**
 * Offline-First Database
 *
 * SQLite via expo-sqlite stores everything locally first.
 * A sync queue records every mutation while offline.
 * When connectivity returns, the queue drains to the API.
 *
 * Tables:
 *   sync_queue   — pending mutations to push to server
 *   jobs         — local job cache
 *   time_entries — clock in/out records
 *   daily_logs   — field daily reports
 *   photos       — photo metadata (files on device filesystem)
 *   tasks        — job tasks/punch list items
 */

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  try {
    db = await SQLite.openDatabaseAsync('buildpro.db');
    await initializeSchema(db);
  } catch (err: any) {
    // Expo Go sometimes has a stale file at the SQLite directory path.
    // Try an alternate name to work around it.
    console.warn('[DB] Primary open failed, trying fallback:', err.message);
    try {
      db = await SQLite.openDatabaseAsync('buildpro_v2.db');
      await initializeSchema(db);
    } catch (err2: any) {
      console.error('[DB] Database unavailable — offline features disabled:', err2.message);
      // Return a no-op stub so the app doesn't crash
      throw err2;
    }
  }
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Sync queue: mutations to replay when back online
    CREATE TABLE IF NOT EXISTS sync_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      method      TEXT    NOT NULL,   -- GET | POST | PUT | PATCH | DELETE
      endpoint    TEXT    NOT NULL,   -- /api/v1/time-entries
      body        TEXT,               -- JSON string
      local_id    TEXT,               -- local UUID before server assigns real ID
      entity_type TEXT,               -- 'time_entry' | 'daily_log' | 'photo' | 'task'
      retries     INTEGER NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'pending',  -- pending | syncing | failed
      error       TEXT
    );

    -- Jobs (cached from server, read-only offline)
    CREATE TABLE IF NOT EXISTS jobs (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      number      TEXT,
      status      TEXT,
      address     TEXT,
      contact_name TEXT,
      start_date  TEXT,
      description TEXT,
      synced_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Time entries (created offline, synced when online)
    CREATE TABLE IF NOT EXISTS time_entries (
      id          TEXT PRIMARY KEY,   -- UUID (local until synced)
      server_id   TEXT,               -- null until synced
      job_id      TEXT,
      user_id     TEXT NOT NULL,
      clock_in    TEXT NOT NULL,
      clock_out   TEXT,
      duration    INTEGER,            -- seconds
      notes       TEXT,
      latitude    REAL,
      longitude   REAL,
      status      TEXT NOT NULL DEFAULT 'active',  -- active | completed
      synced      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Daily logs
    CREATE TABLE IF NOT EXISTS daily_logs (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      job_id      TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      log_date    TEXT NOT NULL,
      weather     TEXT,
      temperature TEXT,
      workers_on_site INTEGER DEFAULT 0,
      work_performed  TEXT,
      delays      TEXT,
      notes       TEXT,
      synced      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Photos
    CREATE TABLE IF NOT EXISTS photos (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      job_id      TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      local_uri   TEXT NOT NULL,      -- file:// path on device
      caption     TEXT,
      latitude    REAL,
      longitude   REAL,
      taken_at    TEXT NOT NULL DEFAULT (datetime('now')),
      synced      INTEGER NOT NULL DEFAULT 0,
      upload_progress INTEGER DEFAULT 0
    );

    -- Tasks / punch list items
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      job_id      TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',
      assigned_to TEXT,
      due_date    TEXT,
      completed_at TEXT,
      synced      INTEGER NOT NULL DEFAULT 0,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- User session (single row)
    CREATE TABLE IF NOT EXISTS session (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      user_id     TEXT,
      company_id  TEXT,
      name        TEXT,
      email       TEXT,
      role        TEXT,
      -- token intentionally omitted: stored in SecureStore, not SQLite
      expires_at  TEXT
    );
  `);
}

// ── Sync queue helpers ────────────────────────────────────────────────────────

export async function enqueueSync(params: {
  method: string;
  endpoint: string;
  body?: object;
  localId?: string;
  entityType?: string;
}) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO sync_queue (method, endpoint, body, local_id, entity_type)
     VALUES (?, ?, ?, ?, ?)`,
    [
      params.method,
      params.endpoint,
      params.body ? JSON.stringify(params.body) : null,
      params.localId ?? null,
      params.entityType ?? null,
    ]
  );
}

export async function getPendingSync() {
  const database = await getDatabase();
  return database.getAllAsync<{
    id: number;
    method: string;
    endpoint: string;
    body: string | null;
    local_id: string | null;
    entity_type: string | null;
    retries: number;
  }>(`SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`);
}

export async function markSyncComplete(queueId: number) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [queueId]);
}

export async function markSyncFailed(queueId: number, error: string) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_queue SET status = 'failed', retries = retries + 1, error = ? WHERE id = ?`,
    [error, queueId]
  );
}

export async function resetFailedSync() {
  const database = await getDatabase();
  // Retry items that failed but have < 5 retries
  await database.runAsync(
    `UPDATE sync_queue SET status = 'pending' WHERE status = 'failed' AND retries < 5`
  );
}

export async function getSyncQueueCount() {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
  );
  return result?.count ?? 0;
}

// ── Session helpers ───────────────────────────────────────────────────────────

export async function saveSession(session: {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  expiresAt?: string;
}) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO session (id, user_id, company_id, name, email, role, expires_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
    [session.userId, session.companyId, session.name, session.email, session.role, session.expiresAt ?? null]
  );
}

export async function getSession() {
  const database = await getDatabase();
  return database.getFirstAsync<{
    user_id: string;
    company_id: string;
    name: string;
    email: string;
    role: string;
    expires_at: string | null;
  }>(`SELECT * FROM session WHERE id = 1`);
}

export async function clearSession() {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM session`);
}
