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
const ATTACHMENTS_STORE = 'encounterAttachments';
const PENDING_REPORTS_STORE = 'pendingReports';
const DB_VERSION = 3;

const isDesktopSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR|Chromium|Android/i.test(ua);
  const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isDesktopMac = /Macintosh/i.test(ua) && !isTouchMac;
  return isSafari && isDesktopMac;
};

const blobToUint8Array = async (blob) => {
  if (!blob) return blob;
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

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
      if (!db.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        const attachmentsStore = db.createObjectStore(ATTACHMENTS_STORE, { keyPath: 'id' });
        attachmentsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      // v2: add pendingReports store for offline report queuing
      if (!db.objectStoreNames.contains(PENDING_REPORTS_STORE)) {
        const pendingStore = db.createObjectStore(PENDING_REPORTS_STORE, { keyPath: 'id' });
        pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

// Save an encounter attachment file (with optional encryption)
export const saveEncounterAttachment = async (attachmentData) => {
  const db = await openDB();
  const { blob, ...metadata } = attachmentData;

  let storedData = blob;
  let isEncrypted = false;
  const originalMimeType = blob?.type || metadata.mimeType || 'application/octet-stream';

  // Desktop Safari has been crashing the page during the attachment import path
  // during encounter imports. Avoid both WebCrypto and Blob structured-clone
  // storage there: keep the payload as bytes, which Safari handles more reliably.
  if (blob && !isDesktopSafari()) {
    const encryptResult = await encryptBlob(blob);
    storedData = encryptResult.data;
    isEncrypted = encryptResult.encrypted;
  } else if (blob) {
    storedData = await blobToUint8Array(blob);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ATTACHMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(ATTACHMENTS_STORE);

    const attachment = {
      id: `encatt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...metadata,
      blob: storedData,
      _encrypted: isEncrypted,
      _mimeType: originalMimeType,
    };

    const request = store.add(attachment);
    request.onsuccess = () => resolve(attachment);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error || request.error || new Error('Encounter attachment transaction failed'));
    transaction.onabort = () => reject(transaction.error || request.error || new Error('Encounter attachment transaction aborted'));
  });
};

export const getEncounterAttachment = async (id, decryptBlob = true) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ATTACHMENTS_STORE], 'readonly');
    const store = transaction.objectStore(ATTACHMENTS_STORE);
    const request = store.get(id);

    request.onsuccess = async () => {
      const attachment = request.result;
      if (!attachment) {
        resolve(null);
        return;
      }

      if (decryptBlob && attachment.blob && attachment._encrypted) {
        try {
          attachment.blob = await decryptToBlob(
            attachment.blob,
            attachment._encrypted,
            attachment._mimeType || 'application/octet-stream'
          );
        } catch (error) {
          console.error('Failed to decrypt encounter attachment:', error);
        }
      }

      resolve(attachment);
    };

    request.onerror = () => reject(request.error);
  });
};

export const deleteEncounterAttachment = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ATTACHMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(ATTACHMENTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
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
  // Safari's MediaRecorder may produce blobs with empty .type — detect the correct
  // codec based on browser capabilities rather than defaulting to webm (which Safari can't play)
  let originalMimeType = blob?.type ||
    (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('video/mp4')
      ? 'video/mp4' : 'video/webm');

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

// ─────────────────────────────────────────────────────────────
// Pending Reports (offline report queue for background sync)
// ─────────────────────────────────────────────────────────────

/**
 * Save a pending report for later sync.
 * @param {Object} report - { id, serverPayload, displayFields, createdAt, attempts }
 */
export const savePendingReport = async (report) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_REPORTS_STORE], 'readwrite');
    const store = tx.objectStore(PENDING_REPORTS_STORE);
    const record = {
      id: report.id || Date.now().toString(),
      createdAt: report.createdAt || new Date().toISOString(),
      attempts: report.attempts || 0,
      serverPayload: report.serverPayload,
      displayFields: report.displayFields,
    };
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
};

/** Get all pending reports, sorted newest-first. */
export const getAllPendingReports = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_REPORTS_STORE], 'readonly');
    const store = tx.objectStore(PENDING_REPORTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const reports = request.result;
      reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      resolve(reports);
    };
    request.onerror = () => reject(request.error);
  });
};

/** Delete a pending report by id (after successful sync). */
export const deletePendingReport = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_REPORTS_STORE], 'readwrite');
    const store = tx.objectStore(PENDING_REPORTS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/** Update a pending report (e.g. increment attempts). */
export const updatePendingReport = async (id, updates) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_REPORTS_STORE], 'readwrite');
    const store = tx.objectStore(PENDING_REPORTS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) { resolve(null); return; }
      const updated = { ...record, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
};
