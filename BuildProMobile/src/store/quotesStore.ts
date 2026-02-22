import { create } from 'zustand';
import { getDatabaseSafe } from '../utils/database';
import api from '../api/client';

export interface Quote {
  id: string;
  number: string;
  status: string;
  total: number;
  contactName?: string;
  projectName?: string;
  expiresAt?: string;
  createdAt: string;
}

interface QuotesState {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  fetchQuotes: () => Promise<void>;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [],
  loading: false,
  error: null,

  fetchQuotes: async () => {
    set({ loading: true, error: null });
    const db = await getDatabaseSafe();
    if (!db) return;

    try {
      const cached = await db.getAllAsync<Quote>(
        `SELECT id, number, status, total, contact_name as contactName, project_name as projectName,
                expires_at as expiresAt, created_at as createdAt
         FROM quotes ORDER BY created_at DESC LIMIT 200`
      );
      if (cached.length > 0) set({ quotes: cached });
    } catch { /* silent */ }

    try {
      const response = await api.get<{ data: any[] }>('/api/v1/quotes?limit=200');
      const quotes: Quote[] = (response.data || []).map((q: any) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        total: Number(q.total || 0),
        contactName: q.contact?.name,
        projectName: q.project?.name,
        expiresAt: q.expiresAt,
        createdAt: q.createdAt,
      }));

      for (const q of quotes) {
        await db.runAsync(
          `INSERT OR REPLACE INTO quotes (id, number, status, total, contact_name, project_name, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, q.number, q.status, q.total, q.contactName || null,
           q.projectName || null, q.expiresAt || null, q.createdAt]
        ).catch(() => {});
      }

      set({ quotes, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load quotes' });
    }
  },
}));
