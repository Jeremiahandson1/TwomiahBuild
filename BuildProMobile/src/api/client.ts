/**
 * API Client — Offline-First
 *
 * - Online: requests go straight to the server
 * - Offline: mutations are queued in SQLite sync_queue
 *            reads return local cache
 *
 * The sync engine (syncEngine.ts) drains the queue when connectivity returns.
 */

import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { enqueueSync } from '../utils/database';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.buildpro.io';
const TOKEN_KEY = 'buildpro_auth_token';
const REFRESH_TOKEN_KEY = 'buildpro_refresh_token';

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client': 'buildpro-mobile',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
  }

  // Attempt to refresh the access token using the stored refresh token
  private async refreshAccessToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client': 'buildpro-mobile' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        if (!data.accessToken) return false;

        await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        return true;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Core request handler with automatic 401 retry via token refresh
  private async fetchWithRefresh(url: string, options: RequestInit, isRetry = false): Promise<Response> {
    const response = await fetch(url, options);

    if (response.status === 401 && !isRetry && !url.includes('/auth/refresh')) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        const newHeaders = await this.getAuthHeaders();
        return this.fetchWithRefresh(url, { ...options, headers: { ...options.headers, ...newHeaders } }, true);
      }
      // Refresh failed — clear tokens and force re-login
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }

    return response;
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRefresh(`${API_BASE}${endpoint}`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
  }

  // Direct POST — always hits network, no offline check (use for auth)
  async postDirect<T>(endpoint: string, body: object): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    console.log('[API] postDirect URL:', url);
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.fetchWithRefresh(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      console.log('[API] postDirect status:', response.status);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new ApiError(response.status, error.error || 'Request failed');
      }
      return response.json();
    } catch (err: any) {
      console.log('[API] postDirect threw:', err.message);
      throw err;
    }
  }

  async post<T>(endpoint: string, body: object, options?: { offlineQueue?: boolean; localId?: string; entityType?: string }): Promise<T | null> {
    const online = await this.isOnline();

    if (!online && options?.offlineQueue) {
      await enqueueSync({
        method: 'POST',
        endpoint,
        body,
        localId: options.localId,
        entityType: options.entityType,
      });
      return null; // Queued for later
    }

    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRefresh(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
  }

  async put<T>(endpoint: string, body: object, options?: { offlineQueue?: boolean; entityType?: string }): Promise<T | null> {
    const online = await this.isOnline();

    if (!online && options?.offlineQueue) {
      await enqueueSync({ method: 'PUT', endpoint, body, entityType: options.entityType });
      return null;
    }

    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRefresh(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
  }

  async patch<T>(endpoint: string, body: object, options?: { offlineQueue?: boolean; entityType?: string }): Promise<T | null> {
    const online = await this.isOnline();

    if (!online && options?.offlineQueue) {
      await enqueueSync({ method: 'PATCH', endpoint, body, entityType: options.entityType });
      return null;
    }

    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRefresh(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
  }

  // Upload a file (photo) — queues if offline
  async uploadFile(endpoint: string, fileUri: string, fields: Record<string, string> = {}): Promise<{ url: string; id: string } | null> {
    const online = await this.isOnline();

    if (!online) {
      // Queue the upload for when connectivity returns
      await enqueueSync({
        method: 'UPLOAD',
        endpoint,
        body: { fileUri, ...fields },
        entityType: 'photo',
      });
      return null;
    }

    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const formData = new FormData();

    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: `photo-${Date.now()}.jpg`,
    } as any);

    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'buildpro-mobile',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Upload failed');
    }

    return response.json();
  }
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() { return this.statusCode === 401; }
  get isForbidden() { return this.statusCode === 403; }
  get isNotFound() { return this.statusCode === 404; }
}

export const api = new ApiClient();
export default api;
