// src/utils/backgroundGeofencing.js
// Background geofencing for Capacitor native builds.
// Checks proximity against saved locations and fires local notifications.
// NOTE: Requires @capacitor-community/background-geolocation (install separately).

import { isNativePlatform } from './nativeGeolocation';
import { getSavedLocations } from './savedLocations';
import { calculateDistance } from './geo';

let watcherHandle = null;

/**
 * Start background location watching. When the device enters a saved zone,
 * fires a local notification. Only active on native platforms.
 */
export async function startBackgroundGeofencing() {
  if (!isNativePlatform()) return;

  try {
    const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // Request local notification permission
    await LocalNotifications.requestPermissions();

    watcherHandle = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'SafeNeighbor is monitoring nearby activity.',
        backgroundTitle: 'SafeNeighbor',
        requestPermissions: true,
        stale: false,
        distanceFilter: 100, // metres
      },
      async (location, error) => {
        if (error) {
          console.error('Background geo error:', error);
          return;
        }
        if (!location) return;

        const saved = getSavedLocations();
        if (saved.length === 0) return;

        for (const zone of saved) {
          const dist = calculateDistance(location.latitude, location.longitude, zone.lat, zone.lng);
          if (dist <= (zone.radiusMiles || 1)) {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: 'SafeNeighbor',
                  body: `You are near ${zone.label || 'a saved location'}. Check reports.`,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date() },
                  actionTypeId: '',
                  extra: { url: '/?tab=report' },
                },
              ],
            });
            break; // One notification per check cycle
          }
        }
      }
    );
  } catch (err) {
    console.error('Background geofencing init failed:', err);
  }
}

/** Stop background geofencing. */
export async function stopBackgroundGeofencing() {
  if (watcherHandle) {
    try {
      const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
      await BackgroundGeolocation.removeWatcher({ id: watcherHandle });
    } catch {}
    watcherHandle = null;
  }
}
