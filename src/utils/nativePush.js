// src/utils/nativePush.js
// Capacitor push notification registration for native iOS/Android.
// On web, this module is a no-op — use pushSubscription.js instead.

import { isNativePlatform } from './nativeGeolocation';

/**
 * Register for native push notifications (APNs / FCM).
 * Stores the device token on the server.
 * Should be called after Capacitor app initialisation.
 */
export async function registerNativePush(savedLocations = []) {
  if (!isNativePlatform()) return null;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.warn('Native push permission denied');
      return null;
    }

    // Register with APNs/FCM
    await PushNotifications.register();

    // Listen for the token
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('Native push token:', token.value);
        // TODO: implement registerNativeToken with geohash-only storage
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('Native push registration error:', err);
        resolve(null);
      });
    });
  } catch (err) {
    console.error('Native push init failed:', err);
    return null;
  }
}

/**
 * Set up notification received/action listeners.
 */
export async function setupNativePushListeners(onNotificationTap) {
  if (!isNativePlatform()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification);
    });

    // User tapped the notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
      onNotificationTap?.(action.notification?.data);
    });
  } catch (err) {
    console.error('Failed to set up push listeners:', err);
  }
}
