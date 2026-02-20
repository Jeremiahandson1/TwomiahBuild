import { create } from 'zustand';
import { getDatabase } from '../utils/database';
import api from '../api/client';

export interface Job {
  id: string;
  name: string;
  number?: string;
  status: string;
  address?: string;
  contactName?: string;
  startDate?: string;
  description?: string;
}

interface JobsState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  selectedJob: Job | null;
  fetchJobs: () => Promise<void>;
  selectJob: (job: Job | null) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  loading: false,
  error: null,
  selectedJob: null,

  fetchJobs: async () => {
    set({ loading: true, error: null });
    const db = await getDatabase();

    // 1. Load from local cache immediately (fast)
    const cached = await db.getAllAsync<Job>(
      `SELECT id, name, number, status, address, contact_name as contactName, start_date as startDate, description
       FROM jobs ORDER BY name ASC`
    );
    if (cached.length > 0) set({ jobs: cached });

    // 2. Fetch from server and update cache
    try {
      const response = await api.get<{ data: any[] }>('/api/v1/jobs?status=active&limit=200');
      const jobs: Job[] = (response.data || []).map((j: any) => ({
        id: j.id,
        name: j.title,  // backend uses 'title', not 'name'
        number: j.number,
        status: j.status,
        address: j.address,
        contactName: j.contact?.name,
        startDate: j.startDate,
        description: j.description,
      }));

      // Upsert to local cache
      for (const job of jobs) {
        await db.runAsync(
          `INSERT OR REPLACE INTO jobs (id, name, number, status, address, contact_name, start_date, description, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [job.id, job.name, job.number ?? null, job.status, job.address ?? null,
           job.contactName ?? null, job.startDate ?? null, job.description ?? null]
        );
      }

      set({ jobs, loading: false });
    } catch (err: any) {
      // Stay with cached data, just mark as error for UI indicator
      set({ error: 'Offline — showing cached jobs', loading: false });
    }
  },

  selectJob: (job) => set({ selectedJob: job }),
}));
