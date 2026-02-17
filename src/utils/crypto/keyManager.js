// src/utils/crypto/keyManager.js
// Encryption key management for local data encryption
// Generates, stores, and retrieves the master encryption key
// Uses IndexedDB for secure key storage (keys not visible in DevTools localStorage)
// Supports PIN-derived key wrapping: master key is encrypted with a KEK derived
// from the user's PIN via PBKDF2, so the raw key never sits on disk

import { generateKey, importKey } from './crypto.web';

// localStorage keys (for metadata only, not the actual key)
const ENCRYPTION_ENABLED_KEY = 'safeneighbor_encryption_enabled';
const KEY_VERSION_KEY = 'safeneighbor_key_version';
const KEY_WRAPPED_FLAG = 'safeneighbor_key_wrapped';

// Legacy localStorage key (for migration)
const LEGACY_KEY_STORAGE = 'safeneighbor_master_key';

// IndexedDB configuration
const DB_NAME = 'safeneighbor_crypto';
const DB_VERSION = 1;
const KEY_STORE = 'keys';
const MASTER_KEY_ID = 'master_key';
const WRAPPED_KEY_ID = 'master_key_wrapped';

// PBKDF2 configuration for key wrapping
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

// In-memory cache of the decrypted key (cleared on page refresh)
let cachedKey = null;
let dbInstance = null;

/**
 * Open or get the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
const getDatabase = () => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Store a key in IndexedDB
 * @param {string} id - Key identifier
 * @param {CryptoKey} key - The CryptoKey to store
 * @returns {Promise<void>}
 */
const storeKeyInDB = async (id, key) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE], 'readwrite');
    const store = transaction.objectStore(KEY_STORE);
    const request = store.put({ id, key, createdAt: Date.now() });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

/**
 * Retrieve a key from IndexedDB
 * @param {string} id - Key identifier
 * @returns {Promise<CryptoKey|null>}
 */
const getKeyFromDB = async (id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE], 'readonly');
    const store = transaction.objectStore(KEY_STORE);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ? request.result.key : null);
    };
  });
};

/**
 * Retrieve a record from IndexedDB (for wrapped key which stores more than just a CryptoKey)
 * @param {string} id - Record identifier
 * @returns {Promise<Object|null>}
 */
const getRecordFromDB = async (id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE], 'readonly');
    const store = transaction.objectStore(KEY_STORE);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

/**
 * Delete a key from IndexedDB
 * @param {string} id - Key identifier
 * @returns {Promise<void>}
 */
const deleteKeyFromDB = async (id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEY_STORE], 'readwrite');
    const store = transaction.objectStore(KEY_STORE);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

/**
 * Check if a key exists in IndexedDB
 * @param {string} id - Key identifier
 * @returns {Promise<boolean>}
 */
const hasKeyInDB = async (id) => {
  const key = await getKeyFromDB(id);
  return key !== null;
};

/**
 * Migrate key from localStorage to IndexedDB (one-time migration)
 * @returns {Promise<boolean>} True if migration occurred
 */
const migrateFromLocalStorage = async () => {
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE);
  if (!legacyKey) {
    return false;
  }

  try {
    const cryptoKey = await importKey(legacyKey);
    await storeKeyInDB(MASTER_KEY_ID, cryptoKey);
    localStorage.removeItem(LEGACY_KEY_STORAGE);
    console.log('Encryption key migrated from localStorage to IndexedDB');
    return true;
  } catch (error) {
    console.error('Failed to migrate key from localStorage:', error);
    return false;
  }
};

// ============================================
// PIN-DERIVED KEY WRAPPING (AES-KW)
// ============================================

/**
 * Derive a Key Encryption Key (KEK) from PIN using PBKDF2
 * @param {string} pin - User's PIN
 * @param {Uint8Array} salt - PBKDF2 salt
 * @returns {Promise<CryptoKey>} KEK suitable for AES-KW
 */
const deriveKEK = async (pin, salt) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
};

/**
 * Check if the master key is currently wrapped (PIN-protected on disk)
 * @returns {boolean}
 */
export const isKeyWrapped = () => {
  return localStorage.getItem(KEY_WRAPPED_FLAG) === 'true';
};

/**
 * Check if master key is currently available in memory
 * @returns {boolean}
 */
export const isMasterKeyInMemory = () => {
  return cachedKey !== null;
};

/**
 * Wrap the master key with a PIN-derived KEK
 * After this, the raw key is deleted from IndexedDB — only the wrapped blob remains
 * @param {string} pin - User's PIN
 * @returns {Promise<void>}
 */
export const wrapMasterKeyWithPin = async (pin) => {
  const masterKey = cachedKey || await getMasterKey();
  if (!masterKey) throw new Error('No master key to wrap');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const kek = await deriveKEK(pin, salt);
  const wrappedKey = await crypto.subtle.wrapKey('raw', masterKey, kek, 'AES-KW');

  // Atomic: store wrapped key + delete raw key in one transaction
  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    const store = tx.objectStore(KEY_STORE);
    store.put({
      id: WRAPPED_KEY_ID,
      wrappedKey: new Uint8Array(wrappedKey),
      salt: salt,
      wrappedAt: Date.now()
    });
    store.delete(MASTER_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  localStorage.setItem(KEY_WRAPPED_FLAG, 'true');
  // Keep cachedKey in memory for current session
};

/**
 * Unwrap the master key using PIN (loads into memory cache only)
 * @param {string} pin - User's PIN
 * @returns {Promise<CryptoKey>} The unwrapped master key
 */
export const unwrapMasterKeyWithPin = async (pin) => {
  const record = await getRecordFromDB(WRAPPED_KEY_ID);
  if (!record || !record.wrappedKey || !record.salt) {
    throw new Error('No wrapped key found');
  }

  const salt = record.salt instanceof Uint8Array ? record.salt : new Uint8Array(record.salt);
  const wrappedData = record.wrappedKey instanceof Uint8Array ? record.wrappedKey : new Uint8Array(record.wrappedKey);

  const kek = await deriveKEK(pin, salt);

  const masterKey = await crypto.subtle.unwrapKey(
    'raw',
    wrappedData,
    kek,
    'AES-KW',
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  cachedKey = masterKey;
  return masterKey;
};

/**
 * Re-wrap the cached master key with a new PIN
 * Assumes master key is already in memory (from a previous unwrap)
 * @param {string} newPin - New PIN to wrap with
 * @returns {Promise<void>}
 */
export const rewrapMasterKeyWithPin = async (newPin) => {
  if (!cachedKey) throw new Error('Master key not in memory — unwrap first');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const kek = await deriveKEK(newPin, salt);
  const wrappedKey = await crypto.subtle.wrapKey('raw', cachedKey, kek, 'AES-KW');

  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    const store = tx.objectStore(KEY_STORE);
    store.put({
      id: WRAPPED_KEY_ID,
      wrappedKey: new Uint8Array(wrappedKey),
      salt: salt,
      wrappedAt: Date.now()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Remove key wrapping — unwrap and store the raw key permanently
 * Called when user removes their PIN
 * @param {string} pin - Current PIN for unwrapping
 * @returns {Promise<void>}
 */
export const removeKeyWrapping = async (pin) => {
  if (!cachedKey) {
    await unwrapMasterKeyWithPin(pin);
  }

  // Store raw key back in IndexedDB and delete wrapped key atomically
  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE], 'readwrite');
    const store = tx.objectStore(KEY_STORE);
    store.put({ id: MASTER_KEY_ID, key: cachedKey, createdAt: Date.now() });
    store.delete(WRAPPED_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  localStorage.removeItem(KEY_WRAPPED_FLAG);
};

// ============================================
// EXISTING PUBLIC API (updated where needed)
// ============================================

/**
 * Check if local encryption is enabled
 * Defaults to true (enabled) if not explicitly set
 * @returns {boolean}
 */
export const isEncryptionEnabled = () => {
  const value = localStorage.getItem(ENCRYPTION_ENABLED_KEY);
  return value === null || value === 'true';
};

/**
 * Enable or disable encryption
 * @param {boolean} enabled
 */
export const setEncryptionEnabled = (enabled) => {
  localStorage.setItem(ENCRYPTION_ENABLED_KEY, enabled ? 'true' : 'false');
};

/**
 * Get the current key version
 * @returns {number}
 */
export const getKeyVersion = () => {
  const version = localStorage.getItem(KEY_VERSION_KEY);
  return version ? parseInt(version, 10) : 1;
};

/**
 * Check if a master key exists in any form (raw, wrapped, or legacy)
 * @returns {Promise<boolean>}
 */
export const hasMasterKey = async () => {
  if (cachedKey) return true;

  // Check for wrapped key
  if (isKeyWrapped()) {
    const record = await getRecordFromDB(WRAPPED_KEY_ID);
    if (record) return true;
  }

  // Check for raw key in IndexedDB
  const hasInDB = await hasKeyInDB(MASTER_KEY_ID);
  if (hasInDB) return true;

  // Check legacy localStorage
  return localStorage.getItem(LEGACY_KEY_STORAGE) !== null;
};

/**
 * Initialize encryption by generating a new master key
 * @returns {Promise<void>}
 */
export const initializeEncryption = async () => {
  const hasKey = await hasMasterKey();
  if (hasKey) {
    console.warn('Master key already exists, not regenerating');
    return;
  }

  const key = await generateKey(true);
  await storeKeyInDB(MASTER_KEY_ID, key);

  localStorage.setItem(KEY_VERSION_KEY, '1');
  localStorage.setItem(ENCRYPTION_ENABLED_KEY, 'true');

  cachedKey = key;
};

/**
 * Get the master encryption key
 * Returns from cache if available, otherwise loads unwrapped key from IndexedDB
 * If key is wrapped, returns null — caller must use unwrapMasterKeyWithPin first
 * @returns {Promise<CryptoKey|null>}
 */
export const getMasterKey = async () => {
  if (cachedKey) {
    return cachedKey;
  }

  // Don't try to load from DB if key is wrapped — it needs PIN
  if (isKeyWrapped()) {
    return null;
  }

  try {
    const dbKey = await getKeyFromDB(MASTER_KEY_ID);
    if (dbKey) {
      cachedKey = dbKey;
      return cachedKey;
    }
  } catch (error) {
    console.error('Failed to get key from IndexedDB:', error);
  }

  // Check for legacy localStorage key and migrate
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE);
  if (legacyKey) {
    try {
      const migrated = await migrateFromLocalStorage();
      if (migrated) {
        const dbKey = await getKeyFromDB(MASTER_KEY_ID);
        if (dbKey) {
          cachedKey = dbKey;
          return cachedKey;
        }
      }
    } catch (error) {
      console.error('Failed to migrate key:', error);
    }
  }

  return null;
};

/**
 * Clear the cached key from memory
 */
export const clearCachedKey = () => {
  cachedKey = null;
};

/**
 * Rotate the encryption key
 * @returns {Promise<{oldKey: CryptoKey, newKey: CryptoKey}>}
 */
export const rotateKey = async () => {
  const oldKey = await getMasterKey();
  if (!oldKey) {
    throw new Error('No existing key to rotate from');
  }

  const newKey = await generateKey(true);
  await storeKeyInDB(MASTER_KEY_ID, newKey);

  const currentVersion = getKeyVersion();
  localStorage.setItem(KEY_VERSION_KEY, (currentVersion + 1).toString());

  cachedKey = newKey;
  return { oldKey, newKey };
};

/**
 * Delete the master key (for data wipe/purge)
 * WARNING: Makes all encrypted data unrecoverable
 * @returns {Promise<void>}
 */
export const deleteMasterKey = async () => {
  try {
    await deleteKeyFromDB(MASTER_KEY_ID);
  } catch (error) {
    console.error('Failed to delete key from IndexedDB:', error);
  }

  try {
    await deleteKeyFromDB(WRAPPED_KEY_ID);
  } catch (error) {
    // May not exist
  }

  localStorage.removeItem(LEGACY_KEY_STORAGE);
  localStorage.removeItem(KEY_VERSION_KEY);
  localStorage.removeItem(KEY_WRAPPED_FLAG);
  cachedKey = null;
};

/**
 * Get encryption status for display
 * @returns {Promise<{enabled: boolean, hasKey: boolean, keyVersion: number}>}
 */
export const getEncryptionStatus = async () => {
  const hasKey = await hasMasterKey();
  const enabled = isEncryptionEnabled();
  const keyVersion = getKeyVersion();

  return {
    enabled,
    hasKey,
    keyVersion,
    ready: enabled && hasKey
  };
};

/**
 * Ensure encryption is set up (initialize if needed)
 * If key is wrapped, returns whether it's already unwrapped in memory
 * @returns {Promise<boolean>} True if encryption is ready to use
 */
export const ensureEncryptionReady = async () => {
  if (!isEncryptionEnabled()) {
    return false;
  }

  // If key is wrapped, it exists but needs PIN to unwrap
  if (isKeyWrapped()) {
    return cachedKey !== null;
  }

  const hasKey = await hasMasterKey();
  if (!hasKey) {
    await initializeEncryption();
  }

  const key = await getMasterKey();
  return key !== null;
};
