import { create } from 'zustand';
import { saveSession, getSession, clearSession } from '../utils/database';
import * as SecureStore from 'expo-secure-store';
import api, { ApiError } from '../api/client';
import { unregisterFromPushNotifications } from '../utils/pushNotifications';

const TOKEN_KEY = 'buildpro_auth_token';
const REFRESH_TOKEN_KEY = 'buildpro_refresh_token';

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
    const response = await api.postDirect<{ accessToken: string; refreshToken: string; user: User }>(
      '/api/v1/auth/login',
      { email, password }
    );

    // Validate token before storing — prevents "undefined" string being saved (Bug #18)
    if (!response.accessToken || typeof response.accessToken !== 'string') {
      throw new Error('Invalid token received from server');
    }

    // Store JWT in SecureStore (encrypted, not readable on rooted devices)
    await SecureStore.setItemAsync(TOKEN_KEY, response.accessToken);
    if (response.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refreshToken);
    }

    // Store non-sensitive session data in SQLite for offline use
    await saveSession({
      userId: response.user.id,
      companyId: response.user.companyId || '',
      name: response.user.name || '',
      email: response.user.email || '',
      role: response.user.role || 'field_crew',
    });

    set({ user: response.user, token: response.accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await unregisterFromPushNotifications();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await clearSession();
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      // Get token from SecureStore
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ isLoading: false });
        return;
      }
      // Get user profile from SQLite cache
      const session = await getSession();
      if (session) {
        set({
          user: {
            id: session.user_id,
            companyId: session.company_id,
            name: session.name,
            email: session.email,
            role: session.role,
          },
          token,
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
