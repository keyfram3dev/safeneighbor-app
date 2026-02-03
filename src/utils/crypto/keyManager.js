// src/utils/crypto/keyManager.js
// Encryption key management for local data encryption
// Generates, stores, and retrieves the master encryption key
// Uses IndexedDB for secure key storage (keys not visible in DevTools localStorage)
// Optionally derives key from PIN for additional security

import { generateKey, importKey } from './crypto.web';

// localStorage keys (for metadata only, not the actual key)
const ENCRYPTION_ENABLED_KEY = 'safeneighbor_encryption_enabled';
const KEY_VERSION_KEY = 'safeneighbor_key_version';

// Legacy localStorage key (for migration)
const LEGACY_KEY_STORAGE = 'safeneighbor_master_key';

// IndexedDB configuration
const DB_NAME = 'safeneighbor_crypto';
const DB_VERSION = 1;
const KEY_STORE = 'keys';
const MASTER_KEY_ID = 'master_key';

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
    // Import the legacy key
    const cryptoKey = await importKey(legacyKey);

    // Store in IndexedDB
    await storeKeyInDB(MASTER_KEY_ID, cryptoKey);

    // Remove from localStorage (it's now secure in IndexedDB)
    localStorage.removeItem(LEGACY_KEY_STORAGE);

    console.log('Encryption key migrated from localStorage to IndexedDB');
    return true;
  } catch (error) {
    console.error('Failed to migrate key from localStorage:', error);
    return false;
  }
};

/**
 * Check if local encryption is enabled
 * Defaults to true (enabled) if not explicitly set
 * @returns {boolean}
 */
export const isEncryptionEnabled = () => {
  const value = localStorage.getItem(ENCRYPTION_ENABLED_KEY);
  // Default to enabled if never set
  return value === null || value === 'true';
};

/**
 * Enable or disable encryption
 * Note: Disabling doesn't decrypt existing data
 * @param {boolean} enabled
 */
export const setEncryptionEnabled = (enabled) => {
  localStorage.setItem(ENCRYPTION_ENABLED_KEY, enabled ? 'true' : 'false');
};

/**
 * Get the current key version (for key rotation tracking)
 * @returns {number}
 */
export const getKeyVersion = () => {
  const version = localStorage.getItem(KEY_VERSION_KEY);
  return version ? parseInt(version, 10) : 1;
};

/**
 * Check if a master key exists (async, checks IndexedDB)
 * @returns {Promise<boolean>}
 */
export const hasMasterKey = async () => {
  // Check IndexedDB first
  const hasInDB = await hasKeyInDB(MASTER_KEY_ID);
  if (hasInDB) return true;

  // Check legacy localStorage (migration pending)
  return localStorage.getItem(LEGACY_KEY_STORAGE) !== null;
};

/**
 * Initialize encryption by generating a new master key
 * Should only be called once during initial setup
 * @returns {Promise<void>}
 */
export const initializeEncryption = async () => {
  const hasKey = await hasMasterKey();
  if (hasKey) {
    console.warn('Master key already exists, not regenerating');
    return;
  }

  // Generate a new key (extractable for potential backup needs)
  const key = await generateKey(true);

  // Store in IndexedDB (more secure than localStorage)
  await storeKeyInDB(MASTER_KEY_ID, key);

  localStorage.setItem(KEY_VERSION_KEY, '1');
  localStorage.setItem(ENCRYPTION_ENABLED_KEY, 'true');

  cachedKey = key;
};

/**
 * Get the master encryption key
 * Returns from cache if available, otherwise loads from IndexedDB
 * Handles migration from localStorage if needed
 * @returns {Promise<CryptoKey|null>}
 */
export const getMasterKey = async () => {
  // Return cached key if available
  if (cachedKey) {
    return cachedKey;
  }

  // Try to get from IndexedDB first
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
        // Try again from IndexedDB after migration
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
 * Clear the cached key (useful for security on lock)
 */
export const clearCachedKey = () => {
  cachedKey = null;
};

/**
 * Rotate the encryption key (generates new key)
 * Note: This requires re-encrypting all existing data
 * @returns {Promise<{oldKey: CryptoKey, newKey: CryptoKey}>}
 */
export const rotateKey = async () => {
  const oldKey = await getMasterKey();
  if (!oldKey) {
    throw new Error('No existing key to rotate from');
  }

  // Generate new key
  const newKey = await generateKey(true);

  // Update IndexedDB
  await storeKeyInDB(MASTER_KEY_ID, newKey);

  // Update version in localStorage
  const currentVersion = getKeyVersion();
  localStorage.setItem(KEY_VERSION_KEY, (currentVersion + 1).toString());

  // Update cache
  cachedKey = newKey;

  return { oldKey, newKey };
};

/**
 * Delete the master key (for data wipe/purge)
 * WARNING: This makes all encrypted data unrecoverable
 * @returns {Promise<void>}
 */
export const deleteMasterKey = async () => {
  // Delete from IndexedDB
  try {
    await deleteKeyFromDB(MASTER_KEY_ID);
  } catch (error) {
    console.error('Failed to delete key from IndexedDB:', error);
  }

  // Also remove legacy localStorage key if exists
  localStorage.removeItem(LEGACY_KEY_STORAGE);
  localStorage.removeItem(KEY_VERSION_KEY);
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
 * Call this on app startup
 * @returns {Promise<boolean>} True if encryption is ready
 */
export const ensureEncryptionReady = async () => {
  if (!isEncryptionEnabled()) {
    return false;
  }

  const hasKey = await hasMasterKey();
  if (!hasKey) {
    await initializeEncryption();
  }

  const key = await getMasterKey();
  return key !== null;
};
