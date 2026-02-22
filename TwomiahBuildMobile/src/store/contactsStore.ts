import { create } from 'zustand';
import { getDatabaseSafe } from '../utils/database';
import api from '../api/client';

export interface Contact {
  id: string;
  name: string;
  type: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  source?: string;
}

interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  loading: false,
  error: null,

  fetchContacts: async () => {
    set({ loading: true, error: null });
    const db = await getDatabaseSafe();
    if (!db) return;

    // Load cache first
    try {
      const cached = await db.getAllAsync<Contact>(
        `SELECT id, name, type, company, email, phone, address, city, state, source
         FROM contacts ORDER BY name ASC LIMIT 500`
      );
      if (cached.length > 0) set({ contacts: cached });
    } catch { /* table may not exist yet */ }

    // Fetch from server
    try {
      const response = await api.get<{ data: any[] }>('/api/v1/contacts?limit=500');
      const contacts: Contact[] = (response.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        company: c.company,
        email: c.email,
        phone: c.phone || c.mobile,
        address: c.address,
        city: c.city,
        state: c.state,
        source: c.source,
      }));

      for (const c of contacts) {
        await db.runAsync(
          `INSERT OR REPLACE INTO contacts (id, name, type, company, email, phone, address, city, state, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.type, c.company || null, c.email || null, c.phone || null,
           c.address || null, c.city || null, c.state || null, c.source || null]
        ).catch(() => {});
      }

      set({ contacts, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load contacts' });
    }
  },
}));
