/**
 * Sync Store — tracks offline queue state for UI indicators
 */
import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSynced: Date | null;
  setSyncing: (v: boolean) => void;
  setSyncCount: (n: number) => void;
  setLastSynced: (d: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSynced: null,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setSyncCount: (pendingCount) => set({ pendingCount }),
  setLastSynced: (lastSynced) => set({ lastSynced }),
}));
