// src/utils/backup/encounterLogSync.js
// Lightweight sync manager for encounter log entries → R2 / Google Drive
// Encrypts JSON logs with the same AES-256-GCM key used for recordings,
// then uploads to the same cloud providers. Supports debounced auto-sync
// and manual one-shot sync per log.

import { encrypt, getMasterKey, importKey } from '../crypto';
import { createS3Client } from './s3Client';
import { createDriveClient } from './driveClient';

const SETTINGS_KEY = 'safeneighbor_backup_settings';
const SYNC_META_KEY = 'safeneighbor_encounter_log_sync';
const LOGS_STORAGE_KEY = 'safeneighbor_encounter_logs';

class EncounterLogSyncManager {
  constructor() {
    this.providers = {}; // { r2: S3Client, google_drive: DriveClient }
    this.encryptionKey = null;
    this._initialized = false;
    this._debounceTimers = {}; // per-log debounce timers
    this._listeners = [];
    this._syncInProgress = {}; // per-log lock
  }

  // ─── Initialization ────────────────────────────────────────────

  /**
   * Load backup settings, resolve encryption key, create provider clients.
   * Safe to call multiple times (idempotent).
   */
  async initialize() {
    if (this._initialized) return;

    const settings = this._loadSettings();
    if (!settings?.isConfigured || !settings.activeProviders?.length) {
      this._initialized = true;
      return;
    }

    // Resolve encryption key
    try {
      this.encryptionKey = await getMasterKey();
      if (!this.encryptionKey && settings.encryptionKey) {
        this.encryptionKey = await importKey(settings.encryptionKey);
      }
    } catch (err) {
      console.warn('[EncounterLogSync] Key not available yet:', err.message);
    }

    // Create provider clients
    if (settings.activeProviders.includes('r2') && settings.credentials?.accessKeyId) {
      try {
        this.providers.r2 = createS3Client(settings.credentials);
      } catch (err) {
        console.warn('[EncounterLogSync] R2 init failed:', err.message);
      }
    }
    if (settings.activeProviders.includes('google_drive')) {
      try {
        this.providers.google_drive = createDriveClient();
      } catch (err) {
        console.warn('[EncounterLogSync] Drive init failed:', err.message);
      }
    }

    this._initialized = true;
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Schedule a debounced sync for a log (2 s). Prevents upload spam during
   * rapid event tapping. Safe to call on every state change.
   */
  scheduleSync(log) {
    if (!log?.id) return;

    clearTimeout(this._debounceTimers[log.id]);
    this._debounceTimers[log.id] = setTimeout(() => {
      this._syncLog(log);
    }, 2000);
  }

  /**
   * Immediately sync a single log (no debounce). Used when a log is ended
   * or when the user taps "Back Up".
   */
  async syncLogNow(log) {
    if (!log?.id) return;
    clearTimeout(this._debounceTimers[log.id]);
    await this._syncLog(log);
  }

  /**
   * Catch-up sync: find all logs where updatedAt > last synced timestamp.
   * Called on mount and on `online` event when auto-backup is on.
   */
  async syncAllDirty(allLogs) {
    if (!allLogs?.length) return;
    const meta = this._loadMeta();

    for (const log of allLogs) {
      const logMeta = meta[log.id];
      const needsSync =
        !logMeta ||
        logMeta.status === 'error' ||
        logMeta.status === 'idle' ||
        !logMeta.lastSyncedUpdatedAt ||
        log.updatedAt > logMeta.lastSyncedUpdatedAt;

      if (needsSync) {
        await this._syncLog(log);
      }
    }
  }

  /**
   * Delete the remote copy of a log from all providers.
   */
  async deleteRemoteLog(logId) {
    const meta = this._loadMeta();
    const logMeta = meta[logId];
    if (!logMeta) return;

    const key = `encounter-logs/${logId}.json.enc`;
    const errors = [];

    for (const [provider, client] of Object.entries(this.providers)) {
      try {
        await client.deleteFile(key);
      } catch (err) {
        errors.push(`${provider}: ${err.message}`);
      }
    }

    // Remove from meta regardless (local log is gone)
    delete meta[logId];
    this._saveMeta(meta);
    this._notifyListeners();

    if (errors.length) {
      console.warn('[EncounterLogSync] Remote delete errors:', errors);
    }
  }

  /**
   * Get the sync status for a specific log.
   */
  getSyncStatus(logId) {
    const meta = this._loadMeta();
    return meta[logId] || null;
  }

  /**
   * Get sync status for ALL logs (keyed by logId).
   */
  getAllSyncStatus() {
    return this._loadMeta();
  }

  /**
   * Returns true if at least one backup provider is configured.
   */
  isBackupConfigured() {
    const settings = this._loadSettings();
    return !!(settings?.isConfigured && settings.activeProviders?.length);
  }

  /**
   * Subscribe to status changes (any log). Returns unsubscribe function.
   */
  onStatusChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
    };
  }

  // ─── Internal ──────────────────────────────────────────────────

  async _syncLog(log) {
    if (!log?.id) return;

    // Prevent concurrent syncs for the same log
    if (this._syncInProgress[log.id]) return;
    this._syncInProgress[log.id] = true;

    const meta = this._loadMeta();

    try {
      // Re-initialize if needed (settings might have changed)
      if (!this._initialized) await this.initialize();

      // No providers configured
      if (!Object.keys(this.providers).length) {
        this._updateLogMeta(meta, log.id, { status: 'no_backup' });
        return;
      }

      // Try to get key if we don't have it yet
      if (!this.encryptionKey) {
        this.encryptionKey = await getMasterKey();
        if (!this.encryptionKey) {
          const settings = this._loadSettings();
          if (settings?.encryptionKey) {
            this.encryptionKey = await importKey(settings.encryptionKey);
          }
        }
      }

      // Key still not available (PIN locked) — mark pending, don't error
      if (!this.encryptionKey) {
        this._updateLogMeta(meta, log.id, { status: 'pending' });
        return;
      }

      // Mark syncing
      this._updateLogMeta(meta, log.id, { status: 'syncing', error: null });

      // Serialize + encrypt
      const json = JSON.stringify(log);
      const encoded = new TextEncoder().encode(json);
      const encrypted = await encrypt(new Uint8Array(encoded), this.encryptionKey);

      // Upload to all active providers
      const key = `encounter-logs/${log.id}.json.enc`;
      const providerResults = {};

      for (const [provider, client] of Object.entries(this.providers)) {
        try {
          await client.uploadFile(key, encrypted, 'application/octet-stream');
          providerResults[provider] = {
            synced: true,
            key,
            syncedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error(`[EncounterLogSync] Upload to ${provider} failed:`, err);
          providerResults[provider] = { synced: false, error: err.message };
        }
      }

      // Check if at least one provider succeeded
      const anySuccess = Object.values(providerResults).some((r) => r.synced);

      this._updateLogMeta(meta, log.id, {
        status: anySuccess ? 'synced' : 'error',
        lastSyncedAt: anySuccess ? new Date().toISOString() : meta[log.id]?.lastSyncedAt || null,
        lastSyncedUpdatedAt: anySuccess ? log.updatedAt : meta[log.id]?.lastSyncedUpdatedAt || null,
        error: anySuccess ? null : 'Upload failed to all providers',
        providers: providerResults,
      });
    } catch (err) {
      console.error('[EncounterLogSync] Sync error:', err);
      this._updateLogMeta(meta, log.id, {
        status: 'error',
        error: err.message,
      });
    } finally {
      delete this._syncInProgress[log.id];
    }
  }

  _updateLogMeta(meta, logId, updates) {
    meta[logId] = { ...(meta[logId] || {}), ...updates };
    this._saveMeta(meta);
    this._notifyListeners();
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _loadMeta() {
    try {
      const raw = localStorage.getItem(SYNC_META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _saveMeta(meta) {
    try {
      localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
    } catch (err) {
      console.error('[EncounterLogSync] Failed to save meta:', err);
    }
  }

  _notifyListeners() {
    const status = this._loadMeta();
    for (const cb of this._listeners) {
      try {
        cb(status);
      } catch {
        // ignore listener errors
      }
    }
  }
}

// ─── Singleton ─────────────────────────────────────────────────

let instance = null;

export const getEncounterLogSync = () => {
  if (!instance) {
    instance = new EncounterLogSyncManager();
  }
  return instance;
};

/**
 * Parse all encounter logs from localStorage.
 * Useful for catch-up sync from App.js online handler.
 */
export const getLogsFromStorage = () => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
