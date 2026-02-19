/**
 * Sync Engine — Offline Queue Drain
 *
 * Listens for network connectivity.
 * When back online, drains the sync_queue table by replaying
 * each queued mutation against the live API.
 *
 * Usage:
 *   import { startSyncEngine, stopSyncEngine } from './syncEngine';
 *   // Call startSyncEngine() in your root layout
 */

import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getSession, getPendingSync, markSyncComplete, markSyncFailed, resetFailedSync, getSyncQueueCount } from '../utils/database';
import { useSyncStore } from '../store/syncStore';

const SYNC_TASK = 'buildpro-background-sync';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.buildpro.io';

let netInfoUnsubscribe: (() => void) | null = null;
let syncInProgress = false;

// ── Background task registration ──────────────────────────────────────────────

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    await drainSyncQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    // Background fetch not available on all platforms/configs — not fatal
    console.warn('Background sync registration failed:', err);
  }
}

// ── Foreground sync engine ────────────────────────────────────────────────────

export function startSyncEngine() {
  // Listen for connectivity changes
  netInfoUnsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      await resetFailedSync(); // Retry previously failed items
      await drainSyncQueue();
    }
  });

  // Also drain immediately in case we're already online at startup
  NetInfo.fetch().then(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      await drainSyncQueue();
    }
  });
}

export function stopSyncEngine() {
  netInfoUnsubscribe?.();
  netInfoUnsubscribe = null;
}

// ── Core drain function ───────────────────────────────────────────────────────

export async function drainSyncQueue() {
  if (syncInProgress) return;
  syncInProgress = true;

  const { setSyncing, setSyncCount, setLastSynced } = useSyncStore.getState();

  try {
    const pending = await getPendingSync();
    if (!pending.length) {
      syncInProgress = false;
      return;
    }

    setSyncing(true);
    setSyncCount(pending.length);

    const session = await getSession();
    if (!session?.token) {
      syncInProgress = false;
      setSyncing(false);
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
      'X-Client': 'buildpro-mobile',
    };

    let successCount = 0;

    for (const item of pending) {
      try {
        let response: Response;

        if (item.method === 'UPLOAD') {
          // Photo upload — handle multipart
          const body = item.body ? JSON.parse(item.body) : {};
          const formData = new FormData();
          formData.append('file', {
            uri: body.fileUri,
            type: 'image/jpeg',
            name: `photo-${item.id}.jpg`,
          } as any);
          if (body.jobId) formData.append('jobId', body.jobId);
          if (body.caption) formData.append('caption', body.caption);

          response = await fetch(`${API_BASE}${item.endpoint}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.token}`, 'X-Client': 'buildpro-mobile' },
            body: formData,
          });
        } else {
          response = await fetch(`${API_BASE}${item.endpoint}`, {
            method: item.method,
            headers,
            body: item.body ?? undefined,
          });
        }

        if (response.ok || response.status === 201) {
          await markSyncComplete(item.id);
          successCount++;
        } else if (response.status === 409 || response.status === 422) {
          // Conflict or validation error — remove from queue, don't retry
          await markSyncComplete(item.id);
        } else {
          await markSyncFailed(item.id, `HTTP ${response.status}`);
        }
      } catch (err: any) {
        await markSyncFailed(item.id, err.message || 'Network error');
      }
    }

    const remaining = await getSyncQueueCount();
    setSyncCount(remaining);
    if (remaining === 0) setLastSynced(new Date());

  } finally {
    syncInProgress = false;
    setSyncing(false);
  }
}

// ── Manual trigger (pull-to-sync) ─────────────────────────────────────────────

export async function forcSync() {
  await resetFailedSync();
  await drainSyncQueue();
}
