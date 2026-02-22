import { create } from 'zustand';
import { getDatabaseSafe } from '../utils/database';
import api from '../api/client';

export interface Invoice {
  id: string;
  number: string;
  status: string;
  total: number;
  balance: number;
  contactName?: string;
  dueDate?: string;
  createdAt: string;
}

interface InvoicesState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
}

export const useInvoicesStore = create<InvoicesState>((set) => ({
  invoices: [],
  loading: false,
  error: null,

  fetchInvoices: async () => {
    set({ loading: true, error: null });
    const db = await getDatabaseSafe();
    if (!db) return;

    try {
      const cached = await db.getAllAsync<Invoice>(
        `SELECT id, number, status, total, balance, contact_name as contactName,
                due_date as dueDate, created_at as createdAt
         FROM invoices ORDER BY created_at DESC LIMIT 200`
      );
      if (cached.length > 0) set({ invoices: cached });
    } catch { /* silent */ }

    try {
      const response = await api.get<{ data: any[] }>('/api/v1/invoices?limit=200');
      const invoices: Invoice[] = (response.data || []).map((i: any) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        total: Number(i.total || 0),
        balance: Number(i.balance || 0),
        contactName: i.contact?.name,
        dueDate: i.dueDate,
        createdAt: i.createdAt,
      }));

      for (const inv of invoices) {
        await db.runAsync(
          `INSERT OR REPLACE INTO invoices (id, number, status, total, balance, contact_name, due_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [inv.id, inv.number, inv.status, inv.total, inv.balance,
           inv.contactName || null, inv.dueDate || null, inv.createdAt]
        ).catch(() => {});
      }

      set({ invoices, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load invoices' });
    }
  },
}));
