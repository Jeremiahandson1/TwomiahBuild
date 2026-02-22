import { create } from 'zustand';
import { getDatabaseSafe, enqueueSync } from '../utils/database';
import api from '../api/client';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuid } from 'uuid';

const TOKEN_KEY = 'twomiah_build_auth_token';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://twomiah-build-api-y5e1.onrender.com';

export interface Photo {
  id: string;
  serverId?: string;
  jobId: string;
  localUri: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  takenAt: string;
  synced: boolean;
  uploadProgress: number;
}

interface PhotosState {
  photos: Photo[];
  loading: boolean;
  capturePhoto: (jobId: string, caption?: string) => Promise<Photo | null>;
  pickFromLibrary: (jobId: string, caption?: string) => Promise<Photo | null>;
  fetchPhotos: (jobId: string) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
}

export const usePhotosStore = create<PhotosState>((set, get) => ({
  photos: [],
  loading: false,

  capturePhoto: async (jobId, caption) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') throw new Error('Camera permission denied');
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return null;
    return savePhoto(jobId, result.assets[0].uri, caption);
  },

  pickFromLibrary: async (jobId, caption) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new Error('Photo library permission denied');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return null;
    return savePhoto(jobId, result.assets[0].uri, caption);
  },

  fetchPhotos: async (jobId) => {
    set({ loading: true });

    // Try API first
    try {
      const response = await api.get<{ data: any[] }>(`/api/v1/photos?jobId=${jobId}&limit=100`);
      if (response?.data) {
        const photos: Photo[] = response.data.map((p: any) => ({
          id: p.id,
          serverId: p.id,
          jobId: p.jobId,
          localUri: p.url,
          caption: p.caption,
          latitude: p.latitude,
          longitude: p.longitude,
          takenAt: p.takenAt || p.createdAt,
          synced: true,
          uploadProgress: 100,
        }));
        set({ photos, loading: false });
        return;
      }
    } catch { /* fall through */ }

    // Fall back to local SQLite
    const db = await getDatabaseSafe();
    if (!db) { set({ loading: false }); return; }
    const photos = await db.getAllAsync<Photo>(
      `SELECT id, server_id as serverId, job_id as jobId, local_uri as localUri,
              caption, latitude, longitude, taken_at as takenAt, synced, upload_progress as uploadProgress
       FROM photos WHERE job_id = ? ORDER BY taken_at DESC`,
      [jobId]
    );
    set({ photos, loading: false });
  },

  deletePhoto: async (id) => {
    const db = await getDatabaseSafe();
    if (db) await db.runAsync(`DELETE FROM photos WHERE id = ?`, [id]);
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) }));
  },
}));

async function savePhoto(jobId: string, localUri: string, caption?: string): Promise<Photo | null> {
  const id = uuid();
  const now = new Date().toISOString();

  let latitude: number | undefined;
  let longitude: number | undefined;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      latitude = loc.coords.latitude;
      longitude = loc.coords.longitude;
    }
  } catch { /* location optional */ }

  // Save locally
  const db = await getDatabaseSafe();
  if (db) {
    await db.runAsync(
      `INSERT INTO photos (id, job_id, user_id, local_uri, caption, latitude, longitude, taken_at, synced)
       VALUES (?, ?, 'local', ?, ?, ?, ?, ?, 0)`,
      [id, jobId, localUri, caption ?? null, latitude ?? null, longitude ?? null, now]
    );
  }

  const photo: Photo = {
    id, jobId, localUri, caption, latitude, longitude,
    takenAt: now, synced: false, uploadProgress: 0,
  };

  usePhotosStore.setState((s) => ({ photos: [photo, ...s.photos] }));

  // Upload directly to API
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const formData = new FormData();
    formData.append('file', { uri: localUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    formData.append('jobId', jobId);
    if (caption) formData.append('caption', caption);
    if (latitude) formData.append('latitude', String(latitude));
    if (longitude) formData.append('longitude', String(longitude));

    const response = await fetch(`${API_BASE}/api/v1/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      photo.serverId = data.data?.id;
      photo.synced = true;
      photo.uploadProgress = 100;
      if (db) await db.runAsync(`UPDATE photos SET server_id = ?, synced = 1 WHERE id = ?`, [photo.serverId ?? null, id]);
      usePhotosStore.setState((s) => ({
        photos: s.photos.map((p) => p.id === id ? { ...photo } : p),
      }));
    }
  } catch {
    // Queue for later upload
    await enqueueSync({
      method: 'UPLOAD',
      endpoint: '/api/v1/photos',
      body: { fileUri: localUri, jobId, caption, latitude, longitude },
      localId: id,
      entityType: 'photo',
    });
  }

  return photo;
}
