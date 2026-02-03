// src/utils/backup/uploadQueue.js
// Manages the queue of recordings pending backup to Cloudflare R2
// Handles encryption, upload, retry logic, and status updates

import { encrypt, generateRandomId } from '../crypto';
import { createS3Client } from './s3Client';
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
 */
export class UploadQueue {
  constructor() {
    this.encryptionKey = null;
    this.s3Client = null;
    this.isProcessing = false;
    this.onStatusChange = null; // Callback for UI updates
    this.maxRetries = 3;
  }

  /**
   * Initialize the queue with credentials
   * @param {CryptoKey} encryptionKey - AES key for encryption
   * @param {Object} s3Credentials - { accountId, accessKeyId, secretAccessKey, bucket }
   */
  async initialize(encryptionKey, s3Credentials) {
    this.encryptionKey = encryptionKey;
    this.s3Client = createS3Client(s3Credentials);

    // Test connection
    const connected = await this.s3Client.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to R2');
    }

    // Resume any pending uploads
    this.processQueue();
  }

  /**
   * Add a recording to the backup queue
   * @param {string} recordingId - ID of the recording to backup
   * @returns {Promise<Object>} Queue item
   */
  async addToQueue(recordingId) {
    const queueItem = {
      id: generateRandomId(),
      recordingId,
      status: QueueStatus.PENDING,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttempt: null,
      error: null,
      s3Key: null,
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
    if (this.isProcessing || !this.encryptionKey || !this.s3Client) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingItems = await this.getPendingItems();

      for (const item of pendingItems) {
        await this.processItem(item);
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

      // Generate storage key with timestamp for uniqueness
      const fileExtension = recording.type === 'video' ? 'mp4' : 'webm';
      const s3Key = `recordings/${queueItem.recordingId}_${Date.now()}.${fileExtension}.enc`;

      // Upload to R2
      const uploadResult = await this.s3Client.uploadFile(
        s3Key,
        encryptedData,
        'application/octet-stream'
      );

      // Update recording with backup info
      await updateRecording(queueItem.recordingId, {
        backedUp: true,
        backupKey: s3Key,
        backupDate: new Date().toISOString(),
        backupSize: uploadResult.size,
      });

      // Mark queue item complete
      queueItem.status = QueueStatus.COMPLETED;
      queueItem.completedAt = new Date().toISOString();
      queueItem.s3Key = s3Key;
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
 * Queue all recordings marked for backup
 */
export const queuePendingBackups = async () => {
  const queue = getUploadQueue();
  const pendingRecordings = await getRecordingsPendingBackup();

  for (const recording of pendingRecordings) {
    await queue.addToQueue(recording.id);
  }

  return pendingRecordings.length;
};
