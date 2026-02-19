import { create } from 'zustand';
import { saveSession, getSession, clearSession } from '../utils/database';
import api, { ApiError } from '../api/client';

interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await api.post<{ token: string; user: User }>(
      '/api/v1/auth/login',
      { email, password }
    );
    if (!response) throw new Error('Login failed');

    await saveSession({
      userId: response.user.id,
      companyId: response.user.companyId,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      token: response.token,
    });

    set({ user: response.user, token: response.token, isAuthenticated: true });
  },

  logout: async () => {
    await clearSession();
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const session = await getSession();
      if (session?.token) {
        set({
          user: {
            id: session.user_id,
            companyId: session.company_id,
            name: session.name,
            email: session.email,
            role: session.role,
          },
          token: session.token,
          isAuthenticated: true,
        });
      }
    } catch {
      // Session restore failed — stay logged out
    } finally {
      set({ isLoading: false });
    }
  },
}));
