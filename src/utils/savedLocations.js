// src/utils/savedLocations.js
// AES-256-GCM encrypted CRUD for user-saved alert zones.
//
// Encryption uses the PIN-wrapped key from locationsKey.js.
// All four functions are now async.
//
// When locked (cachedLocationsKey == null):
//   - getSavedLocations() returns [] (app shows "unlock to view locations")
//   - write operations fail closed rather than storing plaintext
//
// Legacy plaintext migration: on first decryption attempt after an upgrade,
// plaintext JSON will fail AES-GCM decryption — the catch falls back to
// JSON.parse so existing data is read and immediately re-encrypted on next write.

import { getCachedLocationsKey } from './locationsKey';

const STORAGE_KEY = 'safeneighbor_saved_locations';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ─── Encrypt / decrypt helpers ─────────────────────────────────

async function encryptJSON(obj, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  // Store as base64( iv || ciphertext )
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...combined));
}

async function decryptJSON(b64, key) {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(decoder.decode(plaintext));
}

// ─── Read / write ──────────────────────────────────────────────

async function read() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  const key = getCachedLocationsKey();

  if (!key) {
    return [];
  }

  try {
    return await decryptJSON(raw, key);
  } catch {
    // Legacy plaintext fallback — migrates on next write
    try { return JSON.parse(raw); } catch { return []; }
  }
}

async function write(locations) {
  const key = getCachedLocationsKey();
  if (!key) {
    throw new Error('Saved locations are locked until encryption is available.');
  }
  localStorage.setItem(STORAGE_KEY, await encryptJSON(locations, key));
}

// ─── Public API (all async) ────────────────────────────────────

/**
 * Get all saved locations.
 * Returns [] when the app is locked (key unavailable).
 */
export async function getSavedLocations() {
  return read();
}

/**
 * Add a new saved location.
 * @param {{ label: string, lat: number, lng: number, radiusMiles?: number }} loc
 * @returns {Promise<Object>} The created location entry (with id + createdAt)
 */
export async function addSavedLocation({ label, lat, lng, radiusMiles = 1 }) {
  const locations = await read();
  const entry = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    lat,
    lng,
    radiusMiles,
    createdAt: new Date().toISOString(),
  };
  locations.push(entry);
  await write(locations);
  return entry;
}

/** Remove a saved location by id. */
export async function removeSavedLocation(id) {
  const locations = (await read()).filter((l) => l.id !== id);
  await write(locations);
}

/** Update fields on an existing saved location. */
export async function updateSavedLocation(id, updates) {
  const locations = (await read()).map((l) => (l.id === id ? { ...l, ...updates } : l));
  await write(locations);
}
