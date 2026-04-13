// src/utils/pushSubscription.js
// Web Push subscription management via standard Push API + VAPID.

const FUNCTIONS_BASE = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net';

/** Check whether the Push API is available (iOS 16.4+ standalone PWA, modern browsers). */
export function isPushSupported() {
  return 'PushManager' in window && 'serviceWorker' in navigator;
}

/** Detect if running as an installed PWA (home-screen). */
export function isPWAInstalled() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/** Convert a base64url VAPID key to a Uint8Array. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Subscribe the browser to push notifications.
 * Returns the PushSubscription JSON object or null on failure.
 */
export async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error('VAPID public key not configured');
    return null;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  return subscription.toJSON();
}

/** Get the current push subscription if one exists. */
export async function getExistingSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return sub ? sub.toJSON() : null;
}

/**
 * Sync subscription + geohash prefixes to the server.
 * Only coarse geohash-5 prefixes (~5km grid) are sent — no precise
 * coordinates, labels, or IDs ever leave the device.
 * @param {object} subscription — PushSubscription JSON
 * @param {string[]} geoHashPrefixes — array of geohash-5 strings
 */
export async function syncSubscriptionToServer(subscription, geoHashPrefixes = []) {
  const res = await fetch(`${FUNCTIONS_BASE}/registerPushSubscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: { endpoint: subscription.endpoint, keys: subscription.keys }, geoHashPrefixes }),
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status}`);
  return res.json();
}

/** Unsubscribe from push and notify server. */
export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (sub) {
    // Notify server first
    try {
      await fetch(`${FUNCTIONS_BASE}/unregisterPushSubscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch (e) {
      console.warn('Failed to notify server of unsubscribe:', e);
    }
    await sub.unsubscribe();
  }
}

/** Check current notification permission state. */
export function getPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Register a training review reminder push.
 * @param {object} subscription — PushSubscription JSON
 * @param {string} nextReviewAt — ISO date string for when to send the reminder
 */
export async function registerTrainingReminder(subscription, nextReviewAt) {
  const res = await fetch(`${FUNCTIONS_BASE}/registerTrainingReminder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: { endpoint: subscription.endpoint, keys: subscription.keys },
      nextReviewAt,
    }),
  });
  if (!res.ok) throw new Error(`Training reminder register failed: ${res.status}`);
  return res.json();
}

/**
 * Clear a pending training reminder from the server.
 * @param {object} subscription — PushSubscription JSON
 */
export async function clearTrainingReminder(subscription) {
  try {
    await fetch(`${FUNCTIONS_BASE}/registerTrainingReminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: { endpoint: subscription.endpoint, keys: subscription.keys },
        nextReviewAt: null,
      }),
    });
  } catch {
    // best-effort
  }
}
