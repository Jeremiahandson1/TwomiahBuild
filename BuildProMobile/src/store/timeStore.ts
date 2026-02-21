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

export const useTimeStore = create<TimeState>((set, get) => ({
  activeEntry: null,
  entries: [],
  loading: false,

  loadActiveEntry: async () => {
    const db = await getDatabaseSafe();
    if (!db) return;
    const active = await db.getFirstAsync<TimeEntry>(
      `SELECT id, server_id as serverId, job_id as jobId, clock_in as clockIn,
              notes, latitude, longitude, status, synced
       FROM time_entries WHERE status = 'active' LIMIT 1`
    );
    set({ activeEntry: active || null });
  },

  clockIn: async (jobId?: string) => {
    const db = await getDatabaseSafe();
    if (!db) return;
    const localId = uuid();
    const now = new Date().toISOString();

    // Get location if permission granted
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch { /* location optional */ }

    // Save locally first
    await db.runAsync(
      `INSERT INTO time_entries (id, job_id, user_id, clock_in, latitude, longitude, status, synced)
       VALUES (?, ?, 'local', ?, ?, ?, 'active', 0)`,
      [localId, jobId ?? null, now, latitude ?? null, longitude ?? null]
    );

    const entry: TimeEntry = {
      id: localId,
      jobId,
      clockIn: now,
      latitude,
      longitude,
      status: 'active',
      synced: false,
    };

    set({ activeEntry: entry });

    // Queue sync to server
    await enqueueSync({
      method: 'POST',
      endpoint: '/api/v1/time-tracking/clock-in',
      body: { jobId, clockIn: now, latitude, longitude },
      localId,
      entityType: 'time_entry',
    });
  },

  clockOut: async (notes?: string) => {
    const { activeEntry } = get();
    if (!activeEntry) return;

    const db = await getDatabaseSafe();
    if (!db) return;
    const now = new Date().toISOString();
    const duration = Math.floor((new Date(now).getTime() - new Date(activeEntry.clockIn).getTime()) / 1000);

    // Get final location
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch { /* location optional */ }

    await db.runAsync(
      `UPDATE time_entries SET clock_out = ?, duration = ?, notes = ?, status = 'completed', synced = 0
       WHERE id = ?`,
      [now, duration, notes ?? null, activeEntry.id]
    );

    set({ activeEntry: null });

    await enqueueSync({
      method: 'POST',
      endpoint: '/api/v1/time-tracking/clock-out',
      body: { localId: activeEntry.id, clockOut: now, duration, notes, latitude, longitude },
      entityType: 'time_entry',
    });

    get().fetchEntries();
  },

  fetchEntries: async () => {
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
