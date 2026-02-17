// src/hooks/useEncounterSync.js
// React hook bridging EncounterLogSyncManager to the EncounterLog component.
// Provides reactive sync status, auto/manual backup toggle, and per-log backup trigger.

import { useState, useEffect, useCallback, useRef } from 'react';
import { getEncounterLogSync } from '../utils/backup/encounterLogSync';

const AUTO_BACKUP_KEY = 'safeneighbor_encounter_log_autobackup';

function readAutoBackup() {
  try {
    const v = localStorage.getItem(AUTO_BACKUP_KEY);
    return v === null ? true : v === 'true'; // default ON
  } catch {
    return true;
  }
}

export function useEncounterSync(activeLog, allLogs) {
  const sync = getEncounterLogSync();
  const [syncStatus, setSyncStatus] = useState(() => sync.getAllSyncStatus());
  const [backupConfigured, setBackupConfigured] = useState(() => sync.isBackupConfigured());
  const [autoBackup, setAutoBackupState] = useState(readAutoBackup);
  const prevEndedRef = useRef(null);

  // ── Initialize on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await sync.initialize();
      if (cancelled) return;
      setBackupConfigured(sync.isBackupConfigured());
      setSyncStatus(sync.getAllSyncStatus());

      // Catch-up dirty logs on mount (auto-backup only)
      if (readAutoBackup() && allLogs?.length) {
        sync.syncAllDirty(allLogs);
      }
    };

    init();

    // Subscribe to status changes
    const unsub = sync.onStatusChange((status) => {
      if (!cancelled) {
        setSyncStatus({ ...status });
        setBackupConfigured(sync.isBackupConfigured());
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-sync active log on updatedAt change ────────────
  useEffect(() => {
    if (!autoBackup || !activeLog?.updatedAt || !backupConfigured) return;
    sync.scheduleSync(activeLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLog?.updatedAt, autoBackup, backupConfigured]);

  // ── Immediate sync when log ends ─────────────────────────
  useEffect(() => {
    if (!activeLog) return;
    const prevEnded = prevEndedRef.current;
    prevEndedRef.current = activeLog.endedAt;

    // Transition from null → value means log just ended
    if (activeLog.endedAt && !prevEnded && autoBackup && backupConfigured) {
      sync.syncLogNow(activeLog);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLog?.endedAt, autoBackup, backupConfigured]);

  // ── Online catch-up ──────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (readAutoBackup() && allLogs?.length) {
        sync.syncAllDirty(allLogs);
      }
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLogs]);

  // ── Public setters ───────────────────────────────────────
  const setAutoBackup = useCallback((val) => {
    const boolVal = !!val;
    setAutoBackupState(boolVal);
    localStorage.setItem(AUTO_BACKUP_KEY, boolVal ? 'true' : 'false');
  }, []);

  const backUpLog = useCallback(async (log) => {
    if (!log?.id) return;
    await sync.syncLogNow(log);
  }, [sync]);

  const deleteRemoteLog = useCallback(async (logId) => {
    await sync.deleteRemoteLog(logId);
  }, [sync]);

  return {
    syncStatus,
    isBackupConfigured: backupConfigured,
    autoBackup,
    setAutoBackup,
    backUpLog,
    deleteRemoteLog,
  };
}
