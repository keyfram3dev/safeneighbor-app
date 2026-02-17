// src/utils/backup/uploadQueue.js
// Manages the queue of recordings pending backup to cloud providers
// Supports multiple providers (Cloudflare R2, Google Drive)
// Handles encryption, upload, retry logic, and status updates

import { encrypt, generateRandomId } from '../crypto';
import { createS3Client } from './s3Client';
import { createDriveClient } from './driveClient';
import {
  getRecording,
  updateRecording,
  getRecordingsPendingBackup,
} from '../localStorageDB';

// Queue item states
export const QueueStatus = {
  PENDING: 'pending',
  ENCRYPTING: 'encrypting',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Provider types
export const BackupProvider = {
  R2: 'r2',
  GOOGLE_DRIVE: 'google_drive',
};

// IndexedDB store for queue items
const QUEUE_DB_NAME = 'SafeNeighborBackupQueue';
const QUEUE_STORE_NAME = 'queue';
const QUEUE_DB_VERSION = 1;

/**
 * Open the backup queue IndexedDB
 */
const openQueueDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB_NAME, QUEUE_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        const store = db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('recordingId', 'recordingId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

/**
 * Upload Queue Manager
 * Handles the entire backup workflow: queue → encrypt → upload → update status
 * Supports multiple backup providers simultaneously
 */
export class UploadQueue {
  constructor() {
    this.encryptionKey = null;
    this.providers = {}; // { r2: S3Client, google_drive: DriveClient }
    this.isProcessing = false;
    this.onStatusChange = null; // Callback for UI updates
    this.maxRetries = 3;
  }

  /**
   * Initialize the queue with credentials
   * Supports both legacy (R2-only) and multi-provider formats
   * @param {CryptoKey} encryptionKey - AES key for encryption
   * @param {Object} providerConfigs - { r2: {...}, google_drive: true } or legacy { accountId, ... }
   */
  async initialize(encryptionKey, providerConfigs) {
    this.encryptionKey = encryptionKey;

    // Backward compatible: detect legacy R2-only format
    if (providerConfigs.accountId) {
      try {
        this.providers[BackupProvider.R2] = createS3Client(providerConfigs);
        const connected = await this.providers[BackupProvider.R2].testConnection();
        if (!connected) {
          delete this.providers[BackupProvider.R2];
          console.warn('R2 connection failed during init');
        }
      } catch (error) {
        console.error('Failed to init R2 provider:', error);
      }
    } else {
      // Multi-provider format
      if (providerConfigs.r2) {
        try {
          await this.initializeProvider(BackupProvider.R2, providerConfigs.r2);
        } catch (error) {
          console.warn('R2 init failed:', error.message);
        }
      }
      if (providerConfigs.google_drive) {
        try {
          await this.initializeProvider(BackupProvider.GOOGLE_DRIVE);
        } catch (error) {
          console.warn('Google Drive init failed:', error.message);
        }
      }
    }

    // Resume any pending uploads
    if (Object.keys(this.providers).length > 0) {
      this.processQueue();
    }
  }

  /**
   * Initialize a single provider
   * @param {string} providerType - 'r2' or 'google_drive'
   * @param {Object} config - Provider-specific config (R2 credentials, etc.)
   */
  async initializeProvider(providerType, config) {
    try {
      if (providerType === BackupProvider.R2 && config) {
        this.providers[BackupProvider.R2] = createS3Client(config);
        const connected = await this.providers[BackupProvider.R2].testConnection();
        if (!connected) {
          delete this.providers[BackupProvider.R2];
          throw new Error('R2 connection test failed');
        }
      } else if (providerType === BackupProvider.GOOGLE_DRIVE) {
        this.providers[BackupProvider.GOOGLE_DRIVE] = createDriveClient();
        const connected = await this.providers[BackupProvider.GOOGLE_DRIVE].testConnection();
        if (!connected) {
          delete this.providers[BackupProvider.GOOGLE_DRIVE];
          throw new Error('Google Drive connection test failed');
        }
      }
    } catch (error) {
      console.error(`Failed to init ${providerType} provider:`, error);
      throw error;
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(providerType) {
    delete this.providers[providerType];
  }

  /**
   * Get list of active provider types
   */
  getActiveProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Add a recording to the backup queue
   * @param {string} recordingId - ID of the recording to backup
   * @param {string} provider - Provider type ('r2' or 'google_drive')
   * @returns {Promise<Object>} Queue item
   */
  async addToQueue(recordingId, provider = BackupProvider.R2) {
    const queueItem = {
      id: generateRandomId(),
      recordingId,
      provider,
      status: QueueStatus.PENDING,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttempt: null,
      error: null,
      storageKey: null,
    };

    await this.saveQueueItem(queueItem);

    // Notify UI
    this.notifyStatusChange(queueItem);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return queueItem;
  }

  /**
   * Process all pending items in the queue
   */
  async processQueue() {
    if (this.isProcessing || !this.encryptionKey || Object.keys(this.providers).length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Loop until no more pending items (handles items added during processing)
      let pendingItems = await this.getPendingItems();
      while (pendingItems.length > 0) {
        for (const item of pendingItems) {
          if (!this.providers[item.provider]) {
            continue;
          }
          await this.processItem(item);
        }
        // Re-check for items added while we were processing
        pendingItems = await this.getPendingItems();
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  async processItem(queueItem) {
    const client = this.providers[queueItem.provider];
    if (!client) {
      queueItem.status = QueueStatus.FAILED;
      queueItem.error = `Provider ${queueItem.provider} not available`;
      await this.saveQueueItem(queueItem);
      this.notifyStatusChange(queueItem);
      return;
    }

    try {
      // Update status to encrypting
      queueItem.status = QueueStatus.ENCRYPTING;
      queueItem.lastAttempt = new Date().toISOString();
      queueItem.attempts += 1;
      await this.saveQueueItem(queueItem);
      this.notifyStatusChange(queueItem);

      // Get the recording
      const recording = await getRecording(queueItem.recordingId);
      if (!recording || !recording.blob) {
        throw new Error('Recording not found or has no data');
      }

      // Get blob data as ArrayBuffer
      let blobData;
      if (recording.blob instanceof Blob) {
        blobData = await recording.blob.arrayBuffer();
      } else if (typeof recording.blob === 'string') {
        // Base64 encoded
        const binary = atob(recording.blob.split(',')[1] || recording.blob);
        blobData = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          blobData[i] = binary.charCodeAt(i);
        }
      } else {
        blobData = recording.blob;
      }

      // Encrypt the data
      const encryptedData = await encrypt(
        new Uint8Array(blobData),
        this.encryptionKey
      );

      // Update status to uploading
      queueItem.status = QueueStatus.UPLOADING;
      await this.saveQueueItem(queueItem);
      this.notifyStatusChange(queueItem);

      // Generate storage key — use actual MIME type for correct extension
      const mime = recording._mimeType || (recording.blob instanceof Blob ? recording.blob.type : '') || 'video/webm';
      const fileExtension = mime.includes('mp4') ? 'mp4' : 'webm';
      const storageKey = `recordings/${queueItem.recordingId}_${Date.now()}.${fileExtension}.enc`;

      // Upload using the provider client
      const uploadResult = await client.uploadFile(
        storageKey,
        encryptedData,
        'application/octet-stream'
      );

      // Update recording with backup info (per-provider)
      const backups = recording.backups || {};
      backups[queueItem.provider] = {
        backedUp: true,
        backupKey: storageKey,
        backupDate: new Date().toISOString(),
        backupSize: uploadResult.size,
        ...(uploadResult.driveFileId && { driveFileId: uploadResult.driveFileId }),
      };

      await updateRecording(queueItem.recordingId, {
        backedUp: true, // Legacy — true if any provider has backup
        backupKey: storageKey,
        backupDate: new Date().toISOString(),
        backupSize: uploadResult.size,
        backups,
      });

      // Mark queue item complete
      queueItem.status = QueueStatus.COMPLETED;
      queueItem.completedAt = new Date().toISOString();
      queueItem.storageKey = storageKey;
      queueItem.error = null;
      await this.saveQueueItem(queueItem);
      this.notifyStatusChange(queueItem);

    } catch (error) {
      console.error('Upload failed for item:', queueItem.id, error);

      // Check if we should retry
      if (queueItem.attempts >= this.maxRetries) {
        queueItem.status = QueueStatus.FAILED;
      } else {
        queueItem.status = QueueStatus.PENDING; // Will retry
      }

      queueItem.error = error.message;
      await this.saveQueueItem(queueItem);
      this.notifyStatusChange(queueItem);

      // Update recording with error
      await updateRecording(queueItem.recordingId, {
        backupError: error.message,
      });
    }
  }

  /**
   * Retry a failed upload
   */
  async retryItem(queueItemId) {
    const item = await this.getQueueItem(queueItemId);
    if (item && item.status === QueueStatus.FAILED) {
      item.status = QueueStatus.PENDING;
      item.attempts = 0;
      item.error = null;
      await this.saveQueueItem(item);
      this.processQueue();
    }
  }

  /**
   * Cancel a pending upload
   */
  async cancelItem(queueItemId) {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const request = store.delete(queueItemId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all queue items
   */
  async getAllItems() {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending items
   */
  async getPendingItems() {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const index = store.index('status');
      const request = index.getAll(QueueStatus.PENDING);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a single queue item
   */
  async getQueueItem(id) {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save/update a queue item
   */
  async saveQueueItem(item) {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const items = await this.getAllItems();
    return {
      total: items.length,
      pending: items.filter(i => i.status === QueueStatus.PENDING).length,
      encrypting: items.filter(i => i.status === QueueStatus.ENCRYPTING).length,
      uploading: items.filter(i => i.status === QueueStatus.UPLOADING).length,
      completed: items.filter(i => i.status === QueueStatus.COMPLETED).length,
      failed: items.filter(i => i.status === QueueStatus.FAILED).length,
    };
  }

  /**
   * Notify UI of status changes
   */
  notifyStatusChange(queueItem) {
    if (this.onStatusChange) {
      this.onStatusChange(queueItem);
    }
  }

  /**
   * Set callback for status changes
   */
  setStatusChangeCallback(callback) {
    this.onStatusChange = callback;
  }

  /**
   * Clear completed items from queue
   */
  async clearCompleted() {
    const items = await this.getAllItems();
    const completedItems = items.filter(i => i.status === QueueStatus.COMPLETED);

    for (const item of completedItems) {
      await this.cancelItem(item.id);
    }

    return completedItems.length;
  }
}

// Singleton instance
let queueInstance = null;

/**
 * Get or create the upload queue instance
 */
export const getUploadQueue = () => {
  if (!queueInstance) {
    queueInstance = new UploadQueue();
  }
  return queueInstance;
};

/**
 * Queue all recordings marked for backup to all active providers
 * @param {string[]} providers - Optional list of providers to queue for
 */
export const queuePendingBackups = async (providers) => {
  const queue = getUploadQueue();
  const activeProviders = providers || queue.getActiveProviders();
  const pendingRecordings = await getRecordingsPendingBackup();

  let queued = 0;
  for (const recording of pendingRecordings) {
    for (const provider of activeProviders) {
      // Skip if already backed up to this provider
      const providerBackup = recording.backups?.[provider];
      if (providerBackup?.backedUp) continue;

      await queue.addToQueue(recording.id, provider);
      queued++;
    }
  }

  return queued;
};
