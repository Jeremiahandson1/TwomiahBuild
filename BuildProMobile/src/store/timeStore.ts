import { create } from 'zustand';
import { getDatabaseSafe, enqueueSync } from '../utils/database';
import api from '../api/client';
import * as Location from 'expo-location';
import { v4 as uuid } from 'uuid';

export interface TimeEntry {
  id: string;
  serverId?: string;
  jobId?: string;
  jobName?: string;
  clockIn: string;
  clockOut?: string;
  duration?: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  status: 'active' | 'completed';
  synced: boolean;
}

interface TimeState {
  activeEntry: TimeEntry | null;
  entries: TimeEntry[];
  loading: boolean;
  clockIn: (jobId?: string) => Promise<void>;
  clockOut: (notes?: string) => Promise<void>;
  fetchEntries: () => Promise<void>;
  loadActiveEntry: () => Promise<void>;
}

async function getLocation(): Promise<{ latitude?: number; longitude?: number }> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    }
  } catch { /* location optional */ }
  return {};
}

export const useTimeStore = create<TimeState>((set, get) => ({
  activeEntry: null,
  entries: [],
  loading: false,

  loadActiveEntry: async () => {
    const db = await getDatabaseSafe();
    if (db) {
      const active = await db.getFirstAsync<TimeEntry>(
        `SELECT id, server_id as serverId, job_id as jobId, clock_in as clockIn,
                notes, latitude, longitude, status, synced
         FROM time_entries WHERE status = 'active' LIMIT 1`
      );
      if (active) {
        set({ activeEntry: active });
        return;
      }
    }
    // Also check API for active entry
    try {
      const response = await api.get<{ data: any[] }>('/api/v1/time-tracking/active');
      const active = response?.data?.[0];
      if (active) {
        set({
          activeEntry: {
            id: active.id,
            serverId: active.id,
            jobId: active.jobId,
            jobName: active.jobName,
            clockIn: active.clockIn,
            status: 'active',
            synced: true,
          }
        });
      }
    } catch { /* no active entry */ }
  },

  clockIn: async (jobId?: string) => {
    const localId = uuid();
    const now = new Date().toISOString();
    const { latitude, longitude } = await getLocation();

    const entry: TimeEntry = {
      id: localId,
      jobId,
      clockIn: now,
      latitude,
      longitude,
      status: 'active',
      synced: false,
    };

    // Save locally
    const db = await getDatabaseSafe();
    if (db) {
      await db.runAsync(
        `INSERT INTO time_entries (id, job_id, user_id, clock_in, latitude, longitude, status, synced)
         VALUES (?, ?, 'local', ?, ?, ?, 'active', 0)`,
        [localId, jobId ?? null, now, latitude ?? null, longitude ?? null]
      );
    }

    set({ activeEntry: entry });

    // Try API directly
    try {
      const response = await api.post<{ data: any }>('/api/v1/time-tracking/clock-in', {
        jobId, clockIn: now, latitude, longitude,
      });
      if (response?.data?.id) {
        entry.serverId = response.data.id;
        entry.synced = true;
        set({ activeEntry: { ...entry } });
        if (db) {
          await db.runAsync(
            `UPDATE time_entries SET server_id = ?, synced = 1 WHERE id = ?`,
            [response.data.id, localId]
          );
        }
      }
    } catch {
      // Offline — queue for later
      await enqueueSync({
        method: 'POST',
        endpoint: '/api/v1/time-tracking/clock-in',
        body: { jobId, clockIn: now, latitude, longitude },
        localId,
        entityType: 'time_entry',
      });
    }
  },

  clockOut: async (notes?: string) => {
    const { activeEntry } = get();
    if (!activeEntry) return;

    const now = new Date().toISOString();
    const duration = Math.floor((new Date(now).getTime() - new Date(activeEntry.clockIn).getTime()) / 1000);
    const { latitude, longitude } = await getLocation();

    const db = await getDatabaseSafe();
    if (db) {
      await db.runAsync(
        `UPDATE time_entries SET clock_out = ?, duration = ?, notes = ?, status = 'completed', synced = 0 WHERE id = ?`,
        [now, duration, notes ?? null, activeEntry.id]
      );
    }

    set({ activeEntry: null });

    // Try API directly
    try {
      const id = activeEntry.serverId || activeEntry.id;
      await api.post('/api/v1/time-tracking/clock-out', {
        id, clockOut: now, duration, notes, latitude, longitude,
      });
      if (db) {
        await db.runAsync(`UPDATE time_entries SET synced = 1 WHERE id = ?`, [activeEntry.id]);
      }
    } catch {
      await enqueueSync({
        method: 'POST',
        endpoint: '/api/v1/time-tracking/clock-out',
        body: { localId: activeEntry.id, clockOut: now, duration, notes, latitude, longitude },
        entityType: 'time_entry',
      });
    }

    get().fetchEntries();
  },

  fetchEntries: async () => {
    // Try API first
    try {
      const response = await api.get<{ data: any[] }>('/api/v1/time-tracking?limit=100');
      if (response?.data) {
        const entries: TimeEntry[] = response.data.map((e: any) => ({
          id: e.id,
          serverId: e.id,
          jobId: e.jobId,
          jobName: e.jobName || e.job?.title,
          clockIn: e.clockIn,
          clockOut: e.clockOut,
          duration: e.duration,
          notes: e.notes,
          status: e.clockOut ? 'completed' : 'active',
          synced: true,
        }));
        set({ entries });
        return;
      }
    } catch { /* fall through to SQLite */ }

    // Fall back to local cache
    const db = await getDatabaseSafe();
    if (!db) return;
    const entries = await db.getAllAsync<TimeEntry>(
      `SELECT te.id, te.server_id as serverId, te.job_id as jobId,
              j.name as jobName, te.clock_in as clockIn, te.clock_out as clockOut,
              te.duration, te.notes, te.status, te.synced
       FROM time_entries te
       LEFT JOIN jobs j ON j.id = te.job_id
       ORDER BY te.clock_in DESC LIMIT 100`
    );
    set({ entries });
  },
}));
