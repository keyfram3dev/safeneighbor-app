// src/utils/localStorageDB.js
// IndexedDB wrapper for storing video recordings locally
// Supports optional AES-256-GCM encryption for sensitive recording data

import {
  encrypt,
  decrypt,
  isEncryptionEnabled,
  getMasterKey
} from './crypto';

const DB_NAME = 'SafeNeighborDB';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

// ─────────────────────────────────────────────────────────────
// Encryption helpers
// ─────────────────────────────────────────────────────────────

/**
 * Encrypt a blob if encryption is enabled
 * @param {Blob} blob - The blob to encrypt
 * @returns {Promise<{data: Uint8Array|Blob, encrypted: boolean}>}
 */
const encryptBlob = async (blob) => {
  if (!isEncryptionEnabled()) {
    return { data: blob, encrypted: false };
  }

  const key = await getMasterKey();
  if (!key) {
    console.warn('Encryption enabled but no key available, storing unencrypted');
    return { data: blob, encrypted: false };
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const encryptedData = await encrypt(new Uint8Array(arrayBuffer), key);
    return { data: encryptedData, encrypted: true };
  } catch (error) {
    console.error('Encryption failed:', error);
    return { data: blob, encrypted: false };
  }
};

/**
 * Decrypt data back to a blob if it was encrypted
 * @param {Uint8Array|Blob} data - The data to decrypt
 * @param {boolean} wasEncrypted - Whether the data was encrypted
 * @param {string} mimeType - The original MIME type of the blob
 * @returns {Promise<Blob>}
 */
const decryptToBlob = async (data, wasEncrypted, mimeType) => {
  if (!wasEncrypted || data instanceof Blob) {
    return data instanceof Blob ? data : new Blob([data], { type: mimeType });
  }

  const key = await getMasterKey();
  if (!key) {
    console.error('Cannot decrypt: no encryption key available');
    throw new Error('Decryption key not available');
  }

  try {
    const decryptedBuffer = await decrypt(data, key);
    return new Blob([decryptedBuffer], { type: mimeType });
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt recording');
  }
};

// Open IndexedDB connection
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

// Save a recording (with optional encryption)
export const saveRecording = async (recordingData) => {
  const db = await openDB();

  // Extract blob for separate encryption handling
  const { blob, ...metadata } = recordingData;

  // Encrypt the blob if encryption is enabled
  let encryptedBlob = blob;
  let isEncrypted = false;
  let originalMimeType = blob?.type || 'video/webm';

  if (blob) {
    const encryptResult = await encryptBlob(blob);
    encryptedBlob = encryptResult.data;
    isEncrypted = encryptResult.encrypted;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const recording = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...metadata,
      blob: encryptedBlob,
      // Store encryption metadata
      _encrypted: isEncrypted,
      _mimeType: originalMimeType,
    };

    const request = store.add(recording);

    request.onsuccess = () => resolve(recording);
    request.onerror = () => reject(request.error);
  });
};

// Get all recordings
// Note: For performance, blobs are NOT decrypted during listing
// Use getRecording(id) to get a single recording with decrypted blob
export const getAllRecordings = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const recordings = request.result;
      // Sort by most recent first
      recordings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      resolve(recordings);
    };
    request.onerror = () => reject(request.error);
  });
};

// Get a recording with decrypted blob (for playback)
export const getDecryptedRecording = async (id) => {
  return getRecording(id, true);
};

// Get a single recording by ID (with decryption)
export const getRecording = async (id, decryptBlob = true) => {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = async () => {
      const recording = request.result;
      if (!recording) {
        resolve(null);
        return;
      }

      // Decrypt blob if it was encrypted and decryption is requested
      if (decryptBlob && recording.blob && recording._encrypted) {
        try {
          recording.blob = await decryptToBlob(
            recording.blob,
            recording._encrypted,
            recording._mimeType || 'video/webm'
          );
        } catch (error) {
          console.error('Failed to decrypt recording:', error);
          // Return recording with encrypted blob on failure
        }
      }

      resolve(recording);
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete a recording
export const deleteRecording = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// Update a recording
export const updateRecording = async (id, updates) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const recording = getRequest.result;
      const updatedRecording = { ...recording, ...updates };
      const updateRequest = store.put(updatedRecording);
      
      updateRequest.onsuccess = () => resolve(updatedRecording);
      updateRequest.onerror = () => reject(updateRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Get recent recordings (last N)
export const getRecentRecordings = async (limit = 5) => {
  const allRecordings = await getAllRecordings();
  return allRecordings.slice(0, limit);
};

// Clear all recordings (for testing/panic button)
export const clearAllRecordings = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// Get storage usage estimate
export const getStorageEstimate = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed: (estimate.usage / estimate.quota) * 100
    };
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
// Backup-related functions
// ─────────────────────────────────────────────────────────────

// Mark a recording for backup (or unmark it)
export const markForBackup = async (id, shouldBackup = true) => {
  return updateRecording(id, { markedForBackup: shouldBackup });
};

// Get recordings that are marked for backup but not yet backed up
export const getRecordingsPendingBackup = async () => {
  const allRecordings = await getAllRecordings();
  return allRecordings.filter(r => r.markedForBackup && !r.backedUp);
};

// Get recordings that have been successfully backed up
export const getBackedUpRecordings = async () => {
  const allRecordings = await getAllRecordings();
  return allRecordings.filter(r => r.backedUp);
};

// Get backup statistics (includes per-provider counts)
export const getBackupStats = async () => {
  const allRecordings = await getAllRecordings();
  return {
    total: allRecordings.length,
    markedForBackup: allRecordings.filter(r => r.markedForBackup).length,
    backedUp: allRecordings.filter(r => r.backedUp).length,
    pending: allRecordings.filter(r => r.markedForBackup && !r.backedUp).length,
    failed: allRecordings.filter(r => r.backupError).length,
    r2: allRecordings.filter(r => r.backups?.r2?.backedUp).length,
    google_drive: allRecordings.filter(r => r.backups?.google_drive?.backedUp).length,
  };
};

// Update recording with backup status after successful upload
// Supports per-provider tracking via optional provider param
export const markAsBackedUp = async (id, backupInfo, provider) => {
  const updates = {
    backedUp: true,
    backupKey: backupInfo.key,
    backupDate: new Date().toISOString(),
    backupSize: backupInfo.size,
    backupError: null,
  };

  // Per-provider tracking
  if (provider) {
    const recording = await getRecording(id, false);
    const backups = recording?.backups || {};
    backups[provider] = {
      backedUp: true,
      backupKey: backupInfo.key,
      backupDate: new Date().toISOString(),
      backupSize: backupInfo.size,
      ...(backupInfo.driveFileId && { driveFileId: backupInfo.driveFileId }),
    };
    updates.backups = backups;
  }

  return updateRecording(id, updates);
};

// Update recording with backup error
export const markBackupFailed = async (id, errorMessage) => {
  return updateRecording(id, {
    backupError: errorMessage,
  });
};