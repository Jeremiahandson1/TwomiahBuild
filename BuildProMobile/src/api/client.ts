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

class ApiClient {
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

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE}${endpoint}`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
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
    const response = await fetch(`${API_BASE}${endpoint}`, {
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
    const response = await fetch(`${API_BASE}${endpoint}`, {
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
    const response = await fetch(`${API_BASE}${endpoint}`, {
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
