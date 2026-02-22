import { create } from 'zustand';
import { getDatabaseSafe } from '../utils/database';
import api from '../api/client';

export interface Project {
  id: string;
  name: string;
  number?: string;
  status: string;
  address?: string;
  contactName?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
}

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    const db = await getDatabaseSafe();
    if (!db) return;

    try {
      const cached = await db.getAllAsync<Project>(
        `SELECT id, name, number, status, address, contact_name as contactName,
                start_date as startDate, end_date as endDate, budget, spent
         FROM projects ORDER BY name ASC LIMIT 200`
      );
      if (cached.length > 0) set({ projects: cached });
    } catch { /* silent */ }

    try {
      const response = await api.get<{ data: any[] }>('/api/v1/projects?limit=200');
      const projects: Project[] = (response.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        number: p.number,
        status: p.status,
        address: p.address,
        contactName: p.contact?.name || p.contactName,
        startDate: p.startDate,
        endDate: p.endDate,
        budget: p.budget ? Number(p.budget) : undefined,
        spent: p.spent ? Number(p.spent) : undefined,
      }));

      for (const p of projects) {
        await db.runAsync(
          `INSERT OR REPLACE INTO projects (id, name, number, status, address, contact_name, start_date, end_date, budget, spent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.name, p.number || null, p.status, p.address || null,
           p.contactName || null, p.startDate || null, p.endDate || null,
           p.budget ?? null, p.spent ?? null]
        ).catch(() => {});
      }

      set({ projects, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load projects' });
    }
  },
}));
