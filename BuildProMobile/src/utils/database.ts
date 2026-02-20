/**
 * Offline-First Database
 *
 * SQLite via expo-sqlite stores everything locally first.
 * A sync queue records every mutation while offline.
 * When connectivity returns, the queue drains to the API.
 *
 * NOTE: SQLite is unavailable in Expo Go (path conflict with host.exp.exponent).
 * In Expo Go, all DB calls are no-ops and the app works online-only.
 * Full offline support works in production builds.
 */

import * as SQLite from 'expo-sqlite';
import Constants from 'expo-constants';

let db: SQLite.SQLiteDatabase | null = null;
let dbUnavailable = false;

// Detect Expo Go — SQLite directory path is broken there
const isExpoGo = Constants.appOwnership === 'expo';

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
    await initializeSchema(db);
  } catch (err: any) {
    dbUnavailable = true;
    console.error('[DB] SQLite unavailable — offline features disabled:', err.message);
    throw err;
  }
  return db;
}

// Safe wrapper — returns null instead of throwing, for callers that can degrade gracefully
export async function getDatabaseSafe(): Promise<SQLite.SQLiteDatabase | null> {
  try {
    return await getDatabase();
  } catch {
    return null;
  }
}

export async function enqueueSync(
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const database = await getDatabaseSafe();
  if (!database) return; // silently skip offline queue in Expo Go
  await database.runAsync(
    `INSERT INTO sync_queue (operation, entity_type, entity_id, payload) VALUES (?, ?, ?, ?)`,
    [operation, entityType, entityId, JSON.stringify(payload)]
  );
}

async function initializeSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Sync queue: mutations to replay when back online
    CREATE TABLE IF NOT EXISTS sync_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      operation   TEXT    NOT NULL,
      entity_type TEXT    NOT NULL,
      entity_id   TEXT    NOT NULL,
      payload     TEXT    NOT NULL,
      attempts    INTEGER NOT NULL DEFAULT 0,
      last_error  TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      name        TEXT NOT NULL,
      address     TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      synced_at   TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      job_id      TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      clock_in    TEXT NOT NULL,
      clock_out   TEXT,
      latitude    REAL,
      longitude   REAL,
      notes       TEXT,
      synced_at   TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id            TEXT PRIMARY KEY,
      server_id     TEXT,
      job_id        TEXT NOT NULL,
      log_date      TEXT NOT NULL,
      weather       TEXT,
      temperature   INTEGER,
      workers_count INTEGER,
      work_performed TEXT,
      delays        TEXT,
      notes         TEXT,
      synced_at     TEXT,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      job_id      TEXT NOT NULL,
      uri         TEXT NOT NULL,
      caption     TEXT,
      synced_at   TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      server_id   TEXT,
      job_id      TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',
      synced_at   TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ─── Sync Queue Helpers (no-ops in Expo Go) ───────────────────────────────

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
  return await database.getAllAsync<SyncQueueItem>(
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

export async function getSession(): Promise<{ token: string } | null> {
  // Session is managed by SecureStore in authStore, not DB
  // This stub satisfies syncEngine's import
  return null;
}
