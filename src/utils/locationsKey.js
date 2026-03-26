// src/utils/locationsKey.js
// PIN-wrapped AES-256-GCM key for encrypting saved alert-zone locations.
// Mirrors the pattern in src/utils/crypto/keyManager.js but is entirely
// independent of the "Encrypt Recordings" toggle — saved locations are
// always encrypted when a PIN is present.
//
// Storage layout (IndexedDB 'safeneighbor_locations_db', store 'keys'):
//   { id: 'locations_key',         key: CryptoKey }         ← no PIN
//   { id: 'locations_key_wrapped', wrappedKey, salt, ... }  ← PIN-protected
//
// In-memory cachedLocationsKey is cleared on auto-lock (alongside cachedKey).

// IndexedDB configuration
const DB_NAME = 'safeneighbor_locations_db';
const DB_VERSION = 1;
const KEY_STORE = 'keys';
const LOC_KEY_ID = 'locations_key';
const WRAPPED_KEY_ID = 'locations_key_wrapped';

// localStorage flag (only metadata, not the key itself)
const WRAPPED_FLAG = 'safeneighbor_locations_wrapped';

// PBKDF2 — same params as keyManager for consistency
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

// In-memory cache — evaporates on tab close / page refresh
let cachedLocationsKey = null;
let dbInstance = null;

// ─── IndexedDB helpers ─────────────────────────────────────────

const getDatabase = () => {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance); };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
      }
    };
  });
};

const putRecord = async (record) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    tx.objectStore(KEY_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getRecord = async (id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readonly');
    const req = tx.objectStore(KEY_STORE).get(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result || null);
  });
};

const deleteRecord = async (id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    tx.objectStore(KEY_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─── PBKDF2 KEK derivation (identical to keyManager) ──────────

const deriveKEK = async (pin, salt) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
};

// ─── Public API ────────────────────────────────────────────────

/** Returns the in-memory locations key, or null if locked / not initialised. */
export const getCachedLocationsKey = () => cachedLocationsKey;

/** Clear in-memory key (called on auto-lock alongside clearCachedKey). */
export const clearCachedLocationsKey = () => { cachedLocationsKey = null; };

/** True when the key on disk is PIN-wrapped (requires PIN to unlock). */
export const isLocationsKeyWrapped = () =>
  localStorage.getItem(WRAPPED_FLAG) === 'true';

/**
 * Initialise without a PIN.
 * Loads an existing unprotected key from IndexedDB, or generates a new one.
 * Call on app start when no PIN is configured.
 */
export const initLocationsKey = async () => {
  if (cachedLocationsKey) return; // already in memory
  if (isLocationsKeyWrapped()) return; // PIN required — don't auto-load

  const record = await getRecord(LOC_KEY_ID);
  if (record && record.key) {
    cachedLocationsKey = record.key;
    return;
  }

  // Generate a new unprotected key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  await putRecord({ id: LOC_KEY_ID, key, createdAt: Date.now() });
  cachedLocationsKey = key;
};

/**
 * Unwrap the PIN-protected key and load it into memory.
 * Call from App.js handleUnlock when isLocationsKeyWrapped() is true.
 */
export const unwrapLocationsKeyWithPin = async (pin) => {
  const record = await getRecord(WRAPPED_KEY_ID);
  if (!record || !record.wrappedKey || !record.salt) {
    throw new Error('No wrapped locations key found');
  }

  const salt = record.salt instanceof Uint8Array ? record.salt : new Uint8Array(record.salt);
  const wrappedData = record.wrappedKey instanceof Uint8Array
    ? record.wrappedKey : new Uint8Array(record.wrappedKey);

  const kek = await deriveKEK(pin, salt);
  const key = await crypto.subtle.unwrapKey(
    'raw', wrappedData, kek, 'AES-KW',
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );

  cachedLocationsKey = key;
  return key;
};

/**
 * Wrap the current locations key with a PIN.
 * Call when a PIN is first set up, or when wrapping is needed for the first time.
 * Generates a new key if none exists yet.
 */
export const wrapLocationsKeyWithPin = async (pin) => {
  // Ensure we have a key to wrap
  if (!cachedLocationsKey) {
    await initLocationsKey(); // loads or generates unprotected key
  }
  if (!cachedLocationsKey) {
    // No unprotected key in DB either — generate fresh
    cachedLocationsKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const kek = await deriveKEK(pin, salt);
  const wrappedKey = await crypto.subtle.wrapKey('raw', cachedLocationsKey, kek, 'AES-KW');

  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    const store = tx.objectStore(KEY_STORE);
    store.put({ id: WRAPPED_KEY_ID, wrappedKey: new Uint8Array(wrappedKey), salt, wrappedAt: Date.now() });
    store.delete(LOC_KEY_ID); // remove unprotected copy
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  localStorage.setItem(WRAPPED_FLAG, 'true');
  // cachedLocationsKey stays in memory for this session
};

/**
 * Re-wrap the in-memory key with a new PIN.
 * Call when the user changes their PIN.
 */
export const rewrapLocationsKeyWithNewPin = async (newPin) => {
  if (!cachedLocationsKey) throw new Error('Locations key not in memory — unlock first');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const kek = await deriveKEK(newPin, salt);
  const wrappedKey = await crypto.subtle.wrapKey('raw', cachedLocationsKey, kek, 'AES-KW');

  await putRecord({ id: WRAPPED_KEY_ID, wrappedKey: new Uint8Array(wrappedKey), salt, wrappedAt: Date.now() });
  // WRAPPED_FLAG stays true
};

/**
 * Remove PIN protection — store the key unprotected in IndexedDB.
 * Call when the user removes their PIN.
 */
export const removeLocationsKeyPin = async (pin) => {
  if (!cachedLocationsKey) {
    await unwrapLocationsKeyWithPin(pin);
  }

  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    const store = tx.objectStore(KEY_STORE);
    store.put({ id: LOC_KEY_ID, key: cachedLocationsKey, createdAt: Date.now() });
    store.delete(WRAPPED_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  localStorage.removeItem(WRAPPED_FLAG);
};

/**
 * Permanently delete the locations key (called from "Clear Notification Data").
 * Makes all encrypted saved locations unrecoverable — caller must wipe localStorage too.
 */
export const deleteLocationsKey = async () => {
  try { await deleteRecord(LOC_KEY_ID); } catch {}
  try { await deleteRecord(WRAPPED_KEY_ID); } catch {}
  localStorage.removeItem(WRAPPED_FLAG);
  cachedLocationsKey = null;
  dbInstance = null; // allow DB to be reopened fresh after deletion
};
