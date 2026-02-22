import { create } from 'zustand';
import api from '../api/client';

export interface ScheduleEvent {
  id: string;
  title: string;
  type: string; // job | task | appointment
  status: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  contactName?: string;
  address?: string;
  assigneeName?: string;
  color?: string;
}

interface ScheduleState {
  events: ScheduleEvent[];
  loading: boolean;
  error: string | null;
  fetchSchedule: (startDate?: string, endDate?: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  events: [],
  loading: false,
  error: null,

  fetchSchedule: async (startDate?: string, endDate?: string) => {
    set({ loading: true, error: null });

    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    })();
    const end = endDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    })();

    try {
      const response = await api.get<{ events: any[] }>(
        `/api/v1/scheduling/events?startDate=${start}&endDate=${end}&limit=200`
      );
      const events: ScheduleEvent[] = (response.events || []).map((e: any) => ({
        id: e.id,
        title: e.title || e.name || 'Untitled',
        type: e.type || 'job',
        status: e.status || 'scheduled',
        startDate: e.startDate || e.scheduledDate,
        endDate: e.endDate,
        allDay: e.allDay,
        contactName: e.contact?.name || e.contactName,
        address: e.address,
        assigneeName: e.assignee?.name || e.user?.name,
        color: e.color,
      }));

      set({ events, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load schedule' });
    }
  },
}));
