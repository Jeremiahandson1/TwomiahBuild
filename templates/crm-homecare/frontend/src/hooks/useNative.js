// hooks/useNative.js
// Unified native capabilities hook — works on web AND native (iOS/Android via Capacitor)
// Capacitor is a mobile runtime — on web, all APIs fall back to browser equivalents.

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Safe Capacitor loader — never crashes on web ───────────────────
const isNative = () => {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

const getCapacitor   = () => import('@capacitor/core').then(m => m.Capacitor).catch(() => null);
const getGeolocation = () => import('@capacitor/geolocation').then(m => m.Geolocation).catch(() => null);
const getNetwork     = () => import('@capacitor/network').then(m => m.Network).catch(() => null);
const getCamera      = () => import('@capacitor/camera').then(m => m).catch(() => null);
const getLocalNotif  = () => import('@capacitor/local-notifications').then(m => m.LocalNotifications).catch(() => null);

export function useNative() {
  const [platform, setPlatform] = useState('web');
  const [networkStatus, setNetworkStatus] = useState({ connected: true, connectionType: 'unknown' });
  const watchIdRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const Cap = await getCapacitor();
        if (Cap) setPlatform(Cap.getPlatform?.() || 'web');
      } catch { /* web — ignore */ }
    })();
  }, []);

  // ── Geolocation ───────────────────────────────────────────────────
  const getCurrentPosition = useCallback(async () => {
    try {
      if (isNative()) {
        const Geo = await getGeolocation();
        if (Geo) return await Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      }
      // Web fallback
      return await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          p => resolve({ coords: { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy } }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        )
      );
    } catch {
      return null;
    }
  }, []);

  const watchPosition = useCallback(async (callback) => {
    try {
      if (isNative()) {
        const Geo = await getGeolocation();
        if (Geo) {
          watchIdRef.current = await Geo.watchPosition({ enableHighAccuracy: true }, callback);
          return;
        }
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        p => callback({ coords: { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy } }),
        null,
        { enableHighAccuracy: true }
      );
    } catch { /* ignore */ }
  }, []);

  const clearWatch = useCallback(async () => {
    if (watchIdRef.current == null) return;
    try {
      if (isNative()) {
        const Geo = await getGeolocation();
        if (Geo) await Geo.clearWatch({ id: watchIdRef.current });
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    } catch { /* ignore */ }
    watchIdRef.current = null;
  }, []);

  // ── Camera ────────────────────────────────────────────────────────
  const takePhoto = useCallback(async () => {
    try {
      if (isNative()) {
        const cam = await getCamera();
        if (cam) {
          return await cam.Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: cam.CameraResultType.DataUrl,
            source: cam.CameraSource.Camera,
          });
        }
      }
      // Web fallback — trigger file input
      return await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = ev => resolve({ dataUrl: ev.target.result, format: 'jpeg' });
          reader.readAsDataURL(file);
        };
        input.click();
      });
    } catch {
      return null;
    }
  }, []);

  // ── Network ───────────────────────────────────────────────────────
  useEffect(() => {
    let handler = null;
    (async () => {
      try {
        if (isNative()) {
          const Net = await getNetwork();
          if (Net) {
            const status = await Net.getStatus();
            setNetworkStatus(status);
            handler = await Net.addListener('networkStatusChange', setNetworkStatus);
          }
        } else {
          const update = () => setNetworkStatus({ connected: navigator.onLine, connectionType: 'unknown' });
          window.addEventListener('online', update);
          window.addEventListener('offline', update);
          return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
        }
      } catch { /* ignore */ }
    })();
    return () => { handler?.remove?.(); };
  }, []);

  return {
    platform,
    isNative: isNative(),
    networkStatus,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    takePhoto,
  };
}

export default useNative;
