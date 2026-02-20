// src/utils/nativeGeolocation.js
// Platform-aware geolocation wrapper.
// Uses Capacitor Geolocation on native, falls back to web API.

let CapacitorGeolocation = null;

/**
 * Lazy-load Capacitor Geolocation only when running on a native platform.
 */
async function getPlugin() {
  if (CapacitorGeolocation) return CapacitorGeolocation;
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    // Quick check — on web this still loads but returns browser geolocation
    CapacitorGeolocation = Geolocation;
    return Geolocation;
  } catch {
    return null;
  }
}

/** Returns true if running inside a Capacitor native shell. */
export function isNativePlatform() {
  try {
    return window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Get current position. Uses Capacitor on native, standard web API otherwise.
 * Returns { lat, lng, accuracy }.
 */
export async function getCurrentPosition() {
  if (isNativePlatform()) {
    const plugin = await getPlugin();
    if (plugin) {
      const pos = await plugin.getCurrentPosition({ enableHighAccuracy: true });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    }
  }

  // Web fallback
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Watch position continuously. Returns a clear function.
 */
export async function watchPosition(onPosition, onError) {
  if (isNativePlatform()) {
    const plugin = await getPlugin();
    if (plugin) {
      const watchId = await plugin.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
        if (err) {
          onError?.(err);
        } else if (pos) {
          onPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        }
      });
      return () => plugin.clearWatch({ id: watchId });
    }
  }

  // Web fallback
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
    onError,
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
