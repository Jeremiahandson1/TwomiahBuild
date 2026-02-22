/**
 * Push Notification Registration
 * NOTE: Push notifications are not supported in Expo Go (removed in SDK 53).
 * This module is a no-op in Expo Go and fully functional in production builds.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/client';

const isExpoGo = Constants.appOwnership === 'expo';

// Only configure handler in production builds
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<void> {
  if (isExpoGo) {
    console.log('[Push] Skipped — not supported in Expo Go');
    return;
  }

  if (!Device.isDevice) {
    console.log('[Push] Skipped — simulator detected');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission denied');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!projectId) {
      console.warn('[Push] No projectId configured — skipping registration');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.post('/api/v1/push/register', {
      token,
      platform: Platform.OS,
      userAgent: `Twomiah Build/${Constants.expoConfig?.version ?? '1.0.0'}`,
    });
    console.log('[Push] Registered:', token);
  } catch (err: any) {
    console.warn('[Push] Registration failed (non-fatal):', err.message);
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (isExpoGo) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.post('/api/v1/push/unregister', { token });
  } catch (err: any) {
    console.warn('[Push] Unregister failed (non-fatal):', err.message);
  }
}

// Alias for backward compatibility
export const unregisterFromPushNotifications = unregisterPushNotifications;
