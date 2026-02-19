/**
 * Push Notification Registration
 *
 * Registers the device with Expo's push notification service and saves the
 * token to the BuildPro backend so the server can send targeted notifications.
 *
 * Call registerForPushNotifications() once after successful login.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../api/client';

// Configure how notifications behave while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register this device's push token with the backend.
 * Safe to call multiple times — the backend deduplicates by endpoint.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    // Push notifications require a physical device
    return;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission not granted — skipping registration');
    return;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BuildPro Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
    });
  }

  try {
    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    // Register token with BuildPro backend
    await api.post('/api/v1/push/register', {
      token: tokenData.data,
      platform: Platform.OS,
      userAgent: `BuildPro Mobile / ${Platform.OS} ${Platform.Version}`,
    });

    console.info('[Push] Device registered successfully');
  } catch (err) {
    // Non-fatal — app works fine without push
    console.warn('[Push] Registration failed:', err);
  }
}

/**
 * Unregister this device from push notifications.
 * Call on logout.
 */
export async function unregisterFromPushNotifications(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    await api.delete('/api/v1/push/register', { token: tokenData.data });
  } catch {
    // Best effort
  }
}
