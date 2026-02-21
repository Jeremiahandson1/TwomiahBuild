import { create } from 'zustand';
import { getDatabaseSafe, enqueueSync } from '../utils/database';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { v4 as uuid } from 'uuid';

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
      exif: true,
    });

    if (result.canceled || !result.assets[0]) return null;
    return savePhoto(jobId, result.assets[0].uri, caption);
  },

  pickFromLibrary: async (jobId, caption) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new Error('Photo library permission denied');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return null;
    return savePhoto(jobId, result.assets[0].uri, caption);
  },

  fetchPhotos: async (jobId) => {
    const db = await getDatabaseSafe();
    if (!db) return;
    const photos = await db.getAllAsync<Photo>(
      `SELECT id, server_id as serverId, job_id as jobId, local_uri as localUri,
              caption, latitude, longitude, taken_at as takenAt, synced, upload_progress as uploadProgress
       FROM photos WHERE job_id = ? ORDER BY taken_at DESC`,
      [jobId]
    );
    set({ photos });
  },

  deletePhoto: async (id) => {
    const db = await getDatabaseSafe();
    if (!db) return;
    await db.runAsync(`DELETE FROM photos WHERE id = ?`, [id]);
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) }));
  },
}));

async function savePhoto(jobId: string, localUri: string, caption?: string): Promise<Photo> {
  const db = await getDatabaseSafe();
  if (!db) return;
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

  await db.runAsync(
    `INSERT INTO photos (id, job_id, user_id, local_uri, caption, latitude, longitude, taken_at, synced)
     VALUES (?, ?, 'local', ?, ?, ?, ?, ?, 0)`,
    [id, jobId, localUri, caption ?? null, latitude ?? null, longitude ?? null, now]
  );

  // Queue upload
  await enqueueSync({
    method: 'UPLOAD',
    endpoint: '/api/v1/photos',
    body: { fileUri: localUri, jobId, caption, latitude, longitude },
    localId: id,
    entityType: 'photo',
  });

  const photo: Photo = {
    id,
    jobId,
    localUri,
    caption,
    latitude,
    longitude,
    takenAt: now,
    synced: false,
    uploadProgress: 0,
  };

  usePhotosStore.setState((s) => ({ photos: [photo, ...s.photos] }));
  return photo;
}
